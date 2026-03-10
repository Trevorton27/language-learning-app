import { NextRequest, NextResponse } from 'next/server';
import {
  TranslatedVocabulary,
  FormattedFlashcard,
  formatToFlashcards,
  saveVocabulary,
  resolveClarification,
  TranslationOption
} from '@/lib/ai';

interface ConfirmRequest {
  vocabulary: TranslatedVocabulary[];
  clarificationResolutions?: {
    [termId: string]: TranslationOption;
  };
  duplicateActions?: {
    [englishTerm: string]: 'keep_both' | 'skip' | 'replace';
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ConfirmRequest = await request.json();
    const { vocabulary, clarificationResolutions, duplicateActions } = body;

    if (!vocabulary || !Array.isArray(vocabulary)) {
      return NextResponse.json(
        { error: 'Invalid vocabulary data' },
        { status: 400 }
      );
    }

    // Apply clarification resolutions
    let resolvedVocabulary = vocabulary.map(vocab => {
      if (vocab.needsClarification && clarificationResolutions) {
        const resolution = clarificationResolutions[vocab.originalTerm || vocab.english];
        if (resolution) {
          return resolveClarification(vocab, resolution);
        }
      }
      return vocab;
    });

    // Filter out any still needing clarification
    resolvedVocabulary = resolvedVocabulary.filter(v => !v.needsClarification);

    // Format to flashcards
    const flashcards = formatToFlashcards(resolvedVocabulary);

    if (flashcards.length === 0) {
      return NextResponse.json(
        { error: 'No valid flashcards to save' },
        { status: 400 }
      );
    }

    // Convert duplicate actions to Map
    const duplicateActionsMap = duplicateActions
      ? new Map(Object.entries(duplicateActions).map(([k, v]) => [k.toLowerCase(), v]))
      : undefined;

    // Save to database
    const result = await saveVocabulary(flashcards, duplicateActionsMap);

    return NextResponse.json({
      message: 'Vocabulary saved successfully',
      ...result,
      total: result.saved + result.replaced
    });

  } catch (error) {
    console.error('Confirm error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save vocabulary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
