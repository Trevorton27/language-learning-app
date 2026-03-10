import openai, { MODELS, AI_SETTINGS } from './openai';
import { ExtractedTerm, Language, FileType } from './types';

/**
 * Detects the primary language of the content
 */
export async function detectLanguage(content: string): Promise<Language> {
  // Quick heuristic check first
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content);
  const hasEnglish = /[a-zA-Z]{3,}/.test(content);

  if (hasJapanese && hasEnglish) return 'mixed';
  if (hasJapanese) return 'ja';
  if (hasEnglish) return 'en';
  return 'unknown';
}

/**
 * Extracts vocabulary terms from text content using AI
 */
export async function extractVocabulary(
  content: string,
  fileType: FileType,
  detectedLanguage?: Language
): Promise<ExtractedTerm[]> {
  const language = detectedLanguage || await detectLanguage(content);

  const systemPrompt = `You are a vocabulary extraction assistant. Extract individual words or short phrases that would be useful as flashcard vocabulary from the given content.

Rules:
1. Extract meaningful vocabulary terms (not common words like "the", "a", "is")
2. For technical content, prioritize domain-specific terms
3. Keep phrases short (1-4 words max)
4. Identify the language of each term
5. Provide context if it helps clarify meaning
6. Assign a confidence score (0-1) based on how certain you are this is a valid vocabulary term

Return a JSON array with this exact format:
[
  {
    "term": "extracted term",
    "language": "en" or "ja",
    "context": "optional context",
    "confidence": 0.95
  }
]

Only return the JSON array, no other text.`;

  const userPrompt = `Extract vocabulary terms from this ${language} content (file type: ${fileType}):

${content.substring(0, 8000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: AI_SETTINGS.temperature,
      max_tokens: AI_SETTINGS.maxTokens,
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0]?.message?.content || '{"terms":[]}';
    const parsed = JSON.parse(responseText);

    // Handle both array and object with terms property
    const terms = Array.isArray(parsed) ? parsed : (parsed.terms || []);

    return terms.map((item: any) => ({
      term: item.term || '',
      language: item.language || language,
      context: item.context,
      confidence: item.confidence || 0.8
    })).filter((t: ExtractedTerm) => t.term.length > 0);

  } catch (error) {
    console.error('Extraction error:', error);
    throw new Error(`Failed to extract vocabulary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts text from an image using GPT-4 Vision
 */
export async function extractFromImage(
  base64Image: string,
  mimeType: string
): Promise<{ text: string; language: Language }> {
  const systemPrompt = `You are an OCR assistant. Extract all readable text from the image, focusing on vocabulary words or terms that could be used for language learning flashcards.

Return a JSON object with:
{
  "text": "extracted text, one term per line",
  "language": "en" or "ja" or "mixed",
  "terms": ["term1", "term2", ...]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.VISION,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all vocabulary terms from this image:'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: AI_SETTINGS.maxTokens,
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0]?.message?.content || '{"text":"","language":"unknown"}';
    const parsed = JSON.parse(responseText);

    return {
      text: parsed.terms?.join('\n') || parsed.text || '',
      language: parsed.language || 'unknown'
    };

  } catch (error) {
    console.error('Image extraction error:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Simple text parser for plain text files
 */
export function parseTextContent(content: string): string[] {
  // Split by common delimiters
  const lines = content
    .split(/[\n\r,;]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.length < 100);

  return lines;
}

/**
 * Parse CSV content
 */
export function parseCSVContent(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (line.trim()) {
      // Simple CSV parsing (handles basic cases)
      const cells = line.split(',').map(cell =>
        cell.trim().replace(/^["']|["']$/g, '')
      );
      rows.push(cells);
    }
  }

  return rows;
}
