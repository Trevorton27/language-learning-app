const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importVocabulary() {
  try {
    // Read the vocabulary data
    const data = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../src/data/JaEnTechJson.json'),
        'utf-8'
      )
    );

    console.log(`Loaded ${data.length} vocabulary entries\n`);

    // Remove duplicates - keep track of seen combinations
    const seen = new Map();
    const uniqueData = [];
    const removed = [];

    data.forEach((item, index) => {
      const key = `${item.english.toLowerCase()}|${item.japaneseKanji}|${item.hiragana}`;

      if (!seen.has(key)) {
        seen.set(key, index);
        uniqueData.push(item);
      } else {
        removed.push({
          index,
          english: item.english,
          japanese: `${item.japaneseKanji} (${item.hiragana})`,
          category: item.category,
          firstSeen: seen.get(key)
        });
      }
    });

    if (removed.length > 0) {
      console.log('=== Removed Duplicates ===');
      removed.forEach(dup => {
        console.log(`  [${dup.index}] ${dup.english} -> ${dup.japanese} [${dup.category}]`);
        console.log(`      (kept first occurrence at index ${dup.firstSeen})`);
      });
      console.log('');
    }

    console.log(`Unique entries to import: ${uniqueData.length}\n`);

    // Transform data to Flashcard format
    const flashcards = uniqueData.map(item => ({
      front: item.english,
      back: `${item.japaneseKanji} (${item.hiragana})`,
      category: item.category
    }));

    // Check if there are existing flashcards
    const existingCount = await prisma.flashcard.count();
    console.log(`Existing flashcards in database: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  Warning: Database already contains flashcards.');
      console.log('   This script will add new flashcards without clearing existing ones.');
      console.log('   If you want to replace all flashcards, clear the database first.\n');
    }

    // Import in batches to avoid overwhelming the database
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < flashcards.length; i += batchSize) {
      const batch = flashcards.slice(i, i + batchSize);

      await prisma.flashcard.createMany({
        data: batch,
        skipDuplicates: true
      });

      imported += batch.length;
      console.log(`Imported ${imported}/${flashcards.length} flashcards...`);
    }

    console.log('\n✓ Successfully imported all vocabulary!');
    console.log(`\nFinal count: ${await prisma.flashcard.count()} flashcards in database`);

  } catch (error) {
    console.error('Error importing vocabulary:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importVocabulary();
