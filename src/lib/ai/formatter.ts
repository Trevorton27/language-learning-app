import { db } from '@/lib/db';
import {
  TranslatedVocabulary,
  FormattedFlashcard,
  DuplicateInfo,
  ProcessingResult,
  ClarificationRequest
} from './types';

/**
 * Formats translated vocabulary into flashcard format
 */
export function formatToFlashcards(
  vocabulary: TranslatedVocabulary[]
): FormattedFlashcard[] {
  return vocabulary
    .filter(v => v.english && v.japaneseKanji && !v.needsClarification)
    .map(v => ({
      front: v.english,
      back: `${v.japaneseKanji} (${v.hiragana})`,
      category: v.category || 'general'
    }));
}

/**
 * Checks for duplicates against existing flashcards in the database
 */
export async function checkDuplicates(
  newVocabulary: TranslatedVocabulary[]
): Promise<DuplicateInfo[]> {
  const duplicates: DuplicateInfo[] = [];

  // Get all existing flashcards
  const existingFlashcards = await db.flashcard.findMany({
    select: {
      id: true,
      front: true,
      back: true,
      category: true
    }
  });

  // Create lookup maps for fast comparison
  const existingByEnglish = new Map(
    existingFlashcards.map(f => [f.front.toLowerCase(), f])
  );
  const existingByJapanese = new Map(
    existingFlashcards.map(f => {
      const kanji = f.back.split(' (')[0];
      return [kanji, f];
    })
  );

  for (const vocab of newVocabulary) {
    // Check by English term
    const matchByEnglish = existingByEnglish.get(vocab.english.toLowerCase());
    if (matchByEnglish) {
      duplicates.push({
        newTerm: vocab,
        existingTerm: {
          id: matchByEnglish.id,
          front: matchByEnglish.front,
          back: matchByEnglish.back,
          category: matchByEnglish.category || undefined
        }
      });
      continue;
    }

    // Check by Japanese term
    const matchByJapanese = existingByJapanese.get(vocab.japaneseKanji);
    if (matchByJapanese) {
      duplicates.push({
        newTerm: vocab,
        existingTerm: {
          id: matchByJapanese.id,
          front: matchByJapanese.front,
          back: matchByJapanese.back,
          category: matchByJapanese.category || undefined
        }
      });
    }
  }

  return duplicates;
}

/**
 * Extracts clarification requests from vocabulary needing user input
 */
export function extractClarifications(
  vocabulary: TranslatedVocabulary[]
): ClarificationRequest[] {
  return vocabulary
    .filter(v => v.needsClarification && v.clarificationOptions)
    .map((v, index) => ({
      id: `clarify-${index}-${Date.now()}`,
      term: v.originalTerm || v.english || v.japaneseKanji,
      originalLanguage: v.originalLanguage || 'unknown',
      options: v.clarificationOptions!,
      context: undefined
    }));
}

/**
 * Creates a complete processing result
 */
export async function createProcessingResult(
  vocabulary: TranslatedVocabulary[]
): Promise<ProcessingResult> {
  const clarificationsNeeded = extractClarifications(vocabulary);
  const duplicates = await checkDuplicates(
    vocabulary.filter(v => !v.needsClarification)
  );

  // Filter out vocabulary that matches duplicates
  const duplicateEnglish = new Set(duplicates.map(d => d.newTerm.english.toLowerCase()));
  const uniqueVocabulary = vocabulary.filter(
    v => !duplicateEnglish.has(v.english.toLowerCase())
  );

  const status = clarificationsNeeded.length > 0
    ? 'needs_clarification'
    : 'success';

  return {
    status,
    vocabulary: uniqueVocabulary,
    clarificationsNeeded,
    duplicates,
    errors: [],
    stats: {
      totalExtracted: vocabulary.length,
      translated: vocabulary.filter(v => v.english && v.japaneseKanji).length,
      duplicatesFound: duplicates.length,
      clarificationsNeeded: clarificationsNeeded.length,
      errors: 0
    }
  };
}

/**
 * Saves confirmed vocabulary to the database and records an Upload entry
 */
export async function saveVocabulary(
  flashcards: FormattedFlashcard[],
  duplicateActions?: Map<string, 'keep_both' | 'skip' | 'replace'>
): Promise<{ saved: number; replaced: number; skipped: number }> {
  let saved = 0;
  let replaced = 0;
  let skipped = 0;

  // Create the upload record first (counts updated at the end)
  const upload = await db.upload.create({
    data: { saved: 0, replaced: 0, skipped: 0 }
  });

  for (const flashcard of flashcards) {
    const action = duplicateActions?.get(flashcard.front.toLowerCase());

    if (action === 'skip') {
      skipped++;
      continue;
    }

    if (action === 'replace') {
      // Find and update existing
      const existing = await db.flashcard.findFirst({
        where: {
          front: {
            equals: flashcard.front,
            mode: 'insensitive'
          }
        }
      });

      if (existing) {
        await db.flashcard.update({
          where: { id: existing.id },
          data: {
            front: flashcard.front,
            back: flashcard.back,
            category: flashcard.category,
            uploadId: upload.id
          }
        });
        replaced++;
        continue;
      }
    }

    // Default: create new
    await db.flashcard.create({
      data: { ...flashcard, uploadId: upload.id }
    });
    saved++;
  }

  // Update upload record with final counts
  await db.upload.update({
    where: { id: upload.id },
    data: { saved, replaced, skipped }
  });

  return { saved, replaced, skipped };
}

/**
 * Removes internal duplicates from a vocabulary list
 */
export function deduplicateVocabulary(
  vocabulary: TranslatedVocabulary[]
): TranslatedVocabulary[] {
  const seen = new Map<string, TranslatedVocabulary>();

  for (const vocab of vocabulary) {
    const key = `${vocab.english.toLowerCase()}|${vocab.japaneseKanji}`;

    if (!seen.has(key)) {
      seen.set(key, vocab);
    } else {
      // Keep the one with higher confidence
      const existing = seen.get(key)!;
      if (vocab.confidence > existing.confidence) {
        seen.set(key, vocab);
      }
    }
  }

  return Array.from(seen.values());
}
