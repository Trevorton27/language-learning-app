const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const db = new PrismaClient();

async function main() {
  const filePath = path.resolve(__dirname, '..', 'flashcards-export.txt');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

  const flashcards = lines.map((line) => {
    const [front, back, category] = line.split('\t');
    return { front: front.trim(), back: back.trim(), category: category?.trim() || null };
  });

  // Deduplicate by front+back
  const seen = new Set();
  const unique = flashcards.filter((card) => {
    const key = `${card.front.toLowerCase()}|${card.back}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Parsed ${unique.length} unique flashcards from export file`);

  // Check for existing cards with the same front text to avoid duplicates
  const existingCards = await db.flashcard.findMany({ select: { front: true, back: true } });
  const existingKeys = new Set(existingCards.map((c) => `${c.front.toLowerCase()}|${c.back}`));

  const toInsert = unique.filter((card) => !existingKeys.has(`${card.front.toLowerCase()}|${card.back}`));
  const skipped = unique.length - toInsert.length;

  if (toInsert.length === 0) {
    console.log('All flashcards already exist in the database. Nothing to import.');
    return;
  }

  // Create an Upload record to track this import
  const upload = await db.upload.create({
    data: { saved: toInsert.length, replaced: 0, skipped },
  });

  // Insert in batches
  const batchSize = 50;
  let imported = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize).map((card) => ({
      ...card,
      uploadId: upload.id,
    }));
    await db.flashcard.createMany({ data: batch });
    imported += batch.length;
    console.log(`Imported ${imported}/${toInsert.length}`);
  }

  const total = await db.flashcard.count();
  console.log(`\nDone! Imported ${toInsert.length}, skipped ${skipped} duplicates. Total in DB: ${total}`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
