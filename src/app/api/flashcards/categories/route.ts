import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const results = await db.flashcard.groupBy({
            by: ['category'],
            _count: { id: true },
            where: { category: { not: null } },
            orderBy: { category: 'asc' },
        });

        const categories = results
            .filter((r) => r.category !== null)
            .map((r) => ({ name: r.category as string, count: r._count.id }));

        return NextResponse.json(categories);
    } catch (error) {
        console.error('Categories fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}
