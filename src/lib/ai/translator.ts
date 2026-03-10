import openai, { MODELS, AI_SETTINGS } from './openai';
import {
  ExtractedTerm,
  TranslatedVocabulary,
  TranslationOption,
  Language,
  VOCABULARY_CATEGORIES
} from './types';

/**
 * Translates vocabulary terms between English and Japanese
 */
export async function translateVocabulary(
  terms: ExtractedTerm[]
): Promise<TranslatedVocabulary[]> {
  if (terms.length === 0) return [];

  // Batch terms for efficient processing (max 30 per batch)
  const batches: ExtractedTerm[][] = [];
  for (let i = 0; i < terms.length; i += 30) {
    batches.push(terms.slice(i, i + 30));
  }

  const results: TranslatedVocabulary[] = [];

  for (const batch of batches) {
    const batchResults = await translateBatch(batch);
    results.push(...batchResults);
  }

  return results;
}

async function translateBatch(terms: ExtractedTerm[]): Promise<TranslatedVocabulary[]> {
  const categories = VOCABULARY_CATEGORIES.join(', ');

  const systemPrompt = `You are a professional Japanese-English translator specializing in technical vocabulary. Translate vocabulary terms and provide complete flashcard data.

For each term:
1. If English → translate to Japanese (kanji + hiragana reading)
2. If Japanese → translate to English
3. Assign an appropriate category from: ${categories}
4. If a term has multiple common meanings, set needsClarification to true and provide options
5. Provide a confidence score (0-1)

IMPORTANT:
- Always provide hiragana readings for Japanese words
- Use common, natural translations
- For technical terms, prefer widely-used Japanese equivalents
- If unsure about the best translation, include alternatives in clarificationOptions

Return a JSON object with this format:
{
  "translations": [
    {
      "english": "variable",
      "japaneseKanji": "変数",
      "hiragana": "へんすう",
      "category": "programming_fundamentals",
      "confidence": 0.95,
      "needsClarification": false,
      "clarificationOptions": null,
      "originalTerm": "variable",
      "originalLanguage": "en"
    }
  ]
}

For ambiguous terms:
{
  "english": "bank",
  "japaneseKanji": "",
  "hiragana": "",
  "category": "general",
  "confidence": 0.5,
  "needsClarification": true,
  "clarificationOptions": [
    {"japaneseKanji": "銀行", "hiragana": "ぎんこう", "meaning": "financial institution"},
    {"japaneseKanji": "土手", "hiragana": "どて", "meaning": "riverbank"}
  ],
  "originalTerm": "bank",
  "originalLanguage": "en"
}`;

  const termsJson = JSON.stringify(
    terms.map(t => ({
      term: t.term,
      language: t.language,
      context: t.context
    }))
  );

  const userPrompt = `Translate these vocabulary terms:\n${termsJson}`;

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

    const responseText = response.choices[0]?.message?.content || '{"translations":[]}';
    const parsed = JSON.parse(responseText);
    const translations = parsed.translations || [];

    return translations.map((t: any) => ({
      english: t.english || '',
      japaneseKanji: t.japaneseKanji || '',
      hiragana: t.hiragana || '',
      category: t.category || 'general',
      confidence: t.confidence || 0.8,
      needsClarification: t.needsClarification || false,
      clarificationOptions: t.clarificationOptions || undefined,
      originalTerm: t.originalTerm,
      originalLanguage: t.originalLanguage
    }));

  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Failed to translate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Resolves a clarification by selecting a specific translation option
 */
export function resolveClarification(
  vocab: TranslatedVocabulary,
  selectedOption: TranslationOption
): TranslatedVocabulary {
  return {
    ...vocab,
    japaneseKanji: selectedOption.japaneseKanji,
    hiragana: selectedOption.hiragana,
    needsClarification: false,
    clarificationOptions: undefined,
    confidence: 1.0 // User confirmed
  };
}

/**
 * Generates hiragana reading for kanji text
 */
export async function generateHiragana(kanjiText: string): Promise<string> {
  const systemPrompt = `Convert the Japanese text to hiragana reading only. Return just the hiragana, nothing else.`;

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: kanjiText }
      ],
      temperature: 0,
      max_tokens: 100
    });

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('Hiragana generation error:', error);
    return '';
  }
}

/**
 * Categorizes vocabulary terms using AI
 */
export async function categorizeTerms(
  terms: { english: string; japanese: string }[]
): Promise<Map<string, string>> {
  const categories = VOCABULARY_CATEGORIES.join(', ');

  const systemPrompt = `Categorize these vocabulary terms into one of: ${categories}

Return a JSON object mapping English terms to categories:
{
  "categorizations": {
    "variable": "programming_fundamentals",
    "database": "database"
  }
}`;

  const termsJson = JSON.stringify(terms);

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Categorize: ${termsJson}` }
      ],
      temperature: AI_SETTINGS.temperature,
      max_tokens: AI_SETTINGS.maxTokens,
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0]?.message?.content || '{"categorizations":{}}';
    const parsed = JSON.parse(responseText);
    const categorizations = parsed.categorizations || {};

    return new Map(Object.entries(categorizations));
  } catch (error) {
    console.error('Categorization error:', error);
    return new Map();
  }
}
