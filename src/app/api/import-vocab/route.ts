import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import vocabData from '@/data/JaEnTechJson.json';

export async function POST() {
    try {
        // Remove duplicates from the vocabulary data
        const seen = new Map<string, number>();
        const uniqueData = vocabData.filter((item, index) => {
            const key = `${item.english.toLowerCase()}|${item.japaneseKanji}|${item.hiragana}`;
            if (!seen.has(key)) {
                seen.set(key, index);
                return true;
            }
            return false;
        });

        console.log(`Importing ${uniqueData.length} unique vocabulary entries`);

        // Transform data to Flashcard format
        const flashcards = uniqueData.map(item => ({
            front: item.english,
            back: `${item.japaneseKanji} (${item.hiragana})`,
            category: item.category
        }));

        // Check existing flashcards
        const existingCount = await db.flashcard.count();
        console.log(`Existing flashcards: ${existingCount}`);

        if (existingCount > 0) {
            return NextResponse.json({
                error: 'Database already contains flashcards. Clear them first if you want to re-import.',
                existingCount
            }, { status: 400 });
        }

        // Import in batches
        const batchSize = 50;
        let imported = 0;

        for (let i = 0; i < flashcards.length; i += batchSize) {
            const batch = flashcards.slice(i, i + batchSize);
            await db.flashcard.createMany({
                data: batch,
                skipDuplicates: true
            });
            imported += batch.length;
            console.log(`Imported ${imported}/${flashcards.length}`);
        }

        const finalCount = await db.flashcard.count();

        return NextResponse.json({
            message: 'Successfully imported vocabulary',
            imported: uniqueData.length,
            totalInDatabase: finalCount,
            duplicatesRemoved: vocabData.length - uniqueData.length
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({
            error: 'Failed to import vocabulary',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
