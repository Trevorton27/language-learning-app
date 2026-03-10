import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const flashcards = await db.flashcard.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(flashcards);
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch flashcards' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        await db.flashcard.deleteMany();
        return NextResponse.json({ message: 'All flashcards cleared successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to clear flashcards' }, { status: 500 });
    }
}