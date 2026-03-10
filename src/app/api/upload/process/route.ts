import { NextRequest, NextResponse } from 'next/server';
import {
  processVocabularyUpload,
  detectFileType,
  UploadOptions
} from '@/lib/ai';

export const maxDuration = 60; // Allow up to 60 seconds for AI processing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const textContent = formData.get('text') as string | null;
    const optionsJson = formData.get('options') as string | null;

    // Parse options
    const options: Partial<UploadOptions> = optionsJson
      ? JSON.parse(optionsJson)
      : {};

    let content: string | Buffer;
    let fileType = detectFileType();
    let mimeType: string | undefined;

    if (file) {
      // File upload
      mimeType = file.type;
      fileType = detectFileType(mimeType, file.name);

      if (fileType === 'image') {
        // Read as buffer for images
        const arrayBuffer = await file.arrayBuffer();
        content = Buffer.from(arrayBuffer);
      } else {
        // Read as text for other file types
        content = await file.text();
      }
    } else if (textContent) {
      // Direct text/JSON input
      content = textContent;

      // Try to detect if it's JSON
      try {
        JSON.parse(textContent);
        fileType = 'json';
      } catch {
        fileType = 'text';
      }
    } else {
      return NextResponse.json(
        { error: 'No file or text content provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const contentSize = typeof content === 'string'
      ? content.length
      : content.length;

    if (contentSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Process the vocabulary
    const result = await processVocabularyUpload(
      content,
      fileType,
      mimeType,
      options
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Upload processing error:', error);

    // Check for specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid file format or corrupted data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
