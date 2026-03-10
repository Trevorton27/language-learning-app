/**
 * Backfills Upload records for existing flashcards that predate the Upload model.
 *
 * Grouping logic: flashcards whose createdAt timestamps are within 60 seconds
 * of the previous card (when sorted chronologically) are treated as one upload session.
 *
 * Run with:
 *   node scripts/backfill-uploads.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SESSION_GAP_MS = 60 * 1000; // 60 seconds between sessions

async function backfill() {
  // Only process cards that have no uploadId yet
  const flashcards = await prisma.flashcard.findMany({
    where: { uploadId: null },
    orderBy: { createdAt: 'asc' },
  });

  if (flashcards.length === 0) {
    console.log('No unlinked flashcards found — nothing to backfill.');
    return;
  }

  console.log(`Found ${flashcards.length} flashcards without an upload record.`);

  // Group into sessions by time proximity
  const sessions = [];
  let currentSession = [flashcards[0]];

  for (let i = 1; i < flashcards.length; i++) {
    const prev = flashcards[i - 1];
    const curr = flashcards[i];
    const gap = new Date(curr.createdAt) - new Date(prev.createdAt);

    if (gap <= SESSION_GAP_MS) {
      currentSession.push(curr);
    } else {
      sessions.push(currentSession);
      currentSession = [curr];
    }
  }
  sessions.push(currentSession);

  console.log(`Grouped into ${sessions.length} upload session(s).\n`);

  for (const session of sessions) {
    const sessionStart = session[0].createdAt;
    const cardIds = session.map(c => c.id);

    // Create the Upload record, backdated to the first card's timestamp
    const upload = await prisma.upload.create({
      data: {
        createdAt: sessionStart,
        saved: session.length,
        replaced: 0,
        skipped: 0,
      },
    });

    // Link all cards in the session to this upload
    await prisma.flashcard.updateMany({
      where: { id: { in: cardIds } },
      data: { uploadId: upload.id },
    });

    console.log(
      `  Upload ${upload.id} — ${session.length} card(s) @ ${sessionStart.toISOString()}`
    );
  }

  console.log('\nBackfill complete.');
}

backfill()
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
