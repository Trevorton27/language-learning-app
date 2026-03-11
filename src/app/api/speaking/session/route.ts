import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSessionConfig, getSignedUrl, VocabItem } from '@/lib/elevenlabs';

function parseFlashcard(card: { id: string; front: string; back: string; category: string | null }): VocabItem {
  const kanji = card.back.split('(')[0].trim();
  const match = card.back.match(/\((.*?)\)/);
  const hiragana = match ? match[1] : card.back;

  return {
    id: card.id,
    english: card.front,
    kanji,
    hiragana,
    category: card.category,
  };
}

export async function POST(request: Request) {
  try {
    const { flashcardIds } = await request.json();

    if (!Array.isArray(flashcardIds) || flashcardIds.length === 0) {
      return NextResponse.json({ error: 'No flashcard IDs provided' }, { status: 400 });
    }

    const flashcards = await db.flashcard.findMany({
      where: { id: { in: flashcardIds } },
    });

    if (flashcards.length === 0) {
      return NextResponse.json({ error: 'No flashcards found' }, { status: 404 });
    }

    const vocabulary = flashcards.map(parseFlashcard);
    const config = createSessionConfig(vocabulary);

    const signedUrl = await getSignedUrl();

    return NextResponse.json({
      signedUrl,
      vocabulary: config.vocabulary,
      systemPrompt: config.systemPrompt,
      agentId: config.agentId,
    });
  } catch (error) {
    console.error('Speaking session error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create speaking session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
