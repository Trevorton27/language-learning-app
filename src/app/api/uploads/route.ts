import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const uploads = await db.upload.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return NextResponse.json(uploads);
    } catch (error) {
        console.error('Failed to fetch uploads:', error);
        return NextResponse.json({ error: 'Failed to fetch upload history' }, { status: 500 });
    }
}
