import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const data = await request.json();

        // Validate data is an array
        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid format: Expected an array of objects.' }, { status: 400 });
        }

        // Map data to database schema with support for various field names
        const flashcards = data.map((item: any) => {
            const front = item.front || item.english;
            let back = item.back;
            
            if (!back) {
                if (item.japaneseKanji && item.hiragana) {
                    back = `${item.japaneseKanji} (${item.hiragana})`;
                } else {
                    back = item.japaneseKanji || item.hiragana;
                }
            }

            return {
                front,
                back,
                category: item.category || 'General',
            };
        }).filter(fc => fc.front && fc.back);


        if (flashcards.length === 0) {
            return NextResponse.json({ 
                error: 'No valid flashcards found. Ensure each object has "front" and "back" fields.' 
            }, { status: 400 });
        }

        await db.flashcard.createMany({
            data: flashcards,
        });

        return NextResponse.json({ 
            message: `Successfully uploaded ${flashcards.length} flashcards!` 
        }, { status: 200 });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload flashcards.' }, { status: 500 });
    }
}