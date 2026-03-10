import {
  ExtractedTerm,
  TranslatedVocabulary,
  ProcessingResult,
  FileType,
  UploadOptions,
  Language,
  VOCABULARY_CATEGORIES
} from './types';
import {
  extractFromImage,
  detectLanguage,
  parseTextContent,
  parseCSVContent
} from './extractor';
import { translateVocabulary } from './translator';
import {
  createProcessingResult,
  deduplicateVocabulary
} from './formatter';
import openai, { MODELS, AI_SETTINGS } from './openai';

const DEFAULT_OPTIONS: UploadOptions = {
  autoTranslate: true,
  autoCategorize: true,
  generateHiragana: true,
  detectDuplicates: true
};

/**
 * Main processor for handling vocabulary uploads
 * Orchestrates extraction, translation, and formatting
 */
export async function processVocabularyUpload(
  content: string | Buffer,
  fileType: FileType,
  mimeType?: string,
  options: Partial<UploadOptions> = {}
): Promise<ProcessingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    let extractedTerms: ExtractedTerm[] = [];
    let detectedLanguage: Language = 'unknown';

    // Step 1: Extract content based on file type
    if (fileType === 'image' && Buffer.isBuffer(content)) {
      const base64 = content.toString('base64');
      const imageResult = await extractFromImage(base64, mimeType || 'image/png');
      detectedLanguage = imageResult.language;

      // Convert extracted text to terms
      const lines = imageResult.text.split('\n').filter(l => l.trim());
      extractedTerms = lines.map(term => ({
        term: term.trim(),
        language: detectedLanguage,
        confidence: 0.8
      }));
    } else if (fileType === 'json' && typeof content === 'string') {
      // Handle JSON input directly
      const jsonData = JSON.parse(content);
      return processJsonInput(jsonData, opts);
    } else if (typeof content === 'string') {
      detectedLanguage = await detectLanguage(content);

      if (fileType === 'csv') {
        // CSV: parse locally then translate (1 OpenAI call)
        const rows = parseCSVContent(content);
        extractedTerms = processCSVRows(rows, detectedLanguage);
      } else {
        // Text: extract + translate in a single OpenAI call
        const combined = await extractAndTranslate(content, detectedLanguage);
        const deduped = deduplicateVocabulary(combined);
        return await createProcessingResult(deduped);
      }
    }

    if (extractedTerms.length === 0) {
      return {
        status: 'error',
        vocabulary: [],
        clarificationsNeeded: [],
        duplicates: [],
        errors: ['No vocabulary terms could be extracted from the content'],
        stats: {
          totalExtracted: 0,
          translated: 0,
          duplicatesFound: 0,
          clarificationsNeeded: 0,
          errors: 1
        }
      };
    }

    // Translate extracted terms (CSV / image paths)
    let translatedVocabulary: TranslatedVocabulary[] = [];

    if (opts.autoTranslate) {
      translatedVocabulary = await translateVocabulary(extractedTerms);
    } else {
      translatedVocabulary = extractedTerms.map(t => ({
        english: t.language === 'en' ? t.term : '',
        japaneseKanji: t.language === 'ja' ? t.term : '',
        hiragana: '',
        category: 'general',
        confidence: t.confidence,
        needsClarification: t.language !== 'en' && t.language !== 'ja',
        originalTerm: t.term,
        originalLanguage: t.language
      }));
    }

    // Step 3: Deduplicate within the batch
    translatedVocabulary = deduplicateVocabulary(translatedVocabulary);

    // Step 4: Create processing result with duplicate detection
    const result = await createProcessingResult(translatedVocabulary);

    return result;

  } catch (error) {
    console.error('Processing error:', error);
    return {
      status: 'error',
      vocabulary: [],
      clarificationsNeeded: [],
      duplicates: [],
      errors: [error instanceof Error ? error.message : 'Unknown processing error'],
      stats: {
        totalExtracted: 0,
        translated: 0,
        duplicatesFound: 0,
        clarificationsNeeded: 0,
        errors: 1
      }
    };
  }
}

/**
 * Processes CSV rows into extracted terms
 */
function processCSVRows(rows: string[][], language: Language): ExtractedTerm[] {
  const terms: ExtractedTerm[] = [];

  // Check if first row is a header
  const firstRow = rows[0];
  const hasHeader = firstRow?.some(cell =>
    /^(english|japanese|term|word|kanji|hiragana)/i.test(cell)
  );

  const dataRows = hasHeader ? rows.slice(1) : rows;

  for (const row of dataRows) {
    if (row.length === 1) {
      // Single column - just terms
      terms.push({
        term: row[0],
        language,
        confidence: 0.9
      });
    } else if (row.length >= 2) {
      // Multiple columns - might be English/Japanese pairs
      const [first, second] = row;

      // Detect which is which
      const firstLang = detectLanguageSync(first);
      const secondLang = detectLanguageSync(second);

      if (firstLang === 'en') {
        terms.push({ term: first, language: 'en', confidence: 0.95 });
      }
      if (secondLang === 'ja') {
        terms.push({ term: second, language: 'ja', confidence: 0.95 });
      }
      if (firstLang === 'ja') {
        terms.push({ term: first, language: 'ja', confidence: 0.95 });
      }
      if (secondLang === 'en') {
        terms.push({ term: second, language: 'en', confidence: 0.95 });
      }
    }
  }

  return terms;
}

/**
 * Synchronous language detection for quick checks
 */
function detectLanguageSync(text: string): Language {
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  const hasEnglish = /[a-zA-Z]{2,}/.test(text);

  if (hasJapanese && hasEnglish) return 'mixed';
  if (hasJapanese) return 'ja';
  if (hasEnglish) return 'en';
  return 'unknown';
}

/**
 * Processes JSON input that might already be structured
 */
async function processJsonInput(
  data: any,
  options: UploadOptions
): Promise<ProcessingResult> {
  const items = Array.isArray(data) ? data : [data];
  const vocabulary: TranslatedVocabulary[] = [];

  for (const item of items) {
    // Check for various JSON formats
    if (item.english && (item.japaneseKanji || item.japanese)) {
      // Already structured vocabulary
      vocabulary.push({
        english: item.english,
        japaneseKanji: item.japaneseKanji || item.japanese || '',
        hiragana: item.hiragana || item.reading || '',
        category: item.category || 'general',
        confidence: 1.0,
        needsClarification: false
      });
    } else if (item.front && item.back) {
      // Flashcard format
      const frontLang = detectLanguageSync(item.front);
      vocabulary.push({
        english: frontLang === 'en' ? item.front : item.back,
        japaneseKanji: frontLang === 'ja' ? item.front : item.back,
        hiragana: '',
        category: item.category || 'general',
        confidence: 0.9,
        needsClarification: false
      });
    } else if (item.term || item.word) {
      // Simple term format - needs translation
      const term = item.term || item.word;
      const lang = detectLanguageSync(term);

      if (options.autoTranslate) {
        const translated = await translateVocabulary([{
          term,
          language: lang,
          confidence: 0.9
        }]);
        vocabulary.push(...translated);
      } else {
        vocabulary.push({
          english: lang === 'en' ? term : '',
          japaneseKanji: lang === 'ja' ? term : '',
          hiragana: '',
          category: item.category || 'general',
          confidence: 0.7,
          needsClarification: true,
          originalTerm: term,
          originalLanguage: lang
        });
      }
    }
  }

  return createProcessingResult(deduplicateVocabulary(vocabulary));
}

/**
 * Detects file type from MIME type or extension
 */
export function detectFileType(
  mimeType?: string,
  filename?: string
): FileType {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/json') return 'json';
    if (mimeType === 'text/csv') return 'csv';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType.startsWith('text/')) return 'text';
  }

  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'pdf': return 'pdf';
      case 'docx':
      case 'doc': return 'docx';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp': return 'image';
      default: return 'text';
    }
  }

  return 'text';
}

/**
 * Extracts vocabulary AND translates it in a single OpenAI call.
 * Replaces the two-step extractVocabulary → translateVocabulary flow for text inputs.
 */
async function extractAndTranslate(
  content: string,
  detectedLanguage: Language
): Promise<TranslatedVocabulary[]> {
  const categories = VOCABULARY_CATEGORIES.join(', ');

  const systemPrompt = `You are a Japanese-English vocabulary extraction and translation assistant.

Extract meaningful vocabulary terms from the text and provide translations in one step.

Rules:
1. Skip common/function words (articles, prepositions, conjunctions, basic verbs like "is", "are")
2. For English terms → provide Japanese kanji and hiragana reading
3. For Japanese terms → provide English translation
4. Assign a category from: ${categories}
5. If a term has multiple common meanings, set needsClarification: true and list options

Return ONLY a JSON object in this format:
{
  "vocabulary": [
    {
      "english": "variable",
      "japaneseKanji": "変数",
      "hiragana": "へんすう",
      "category": "programming_fundamentals",
      "confidence": 0.95,
      "needsClarification": false,
      "originalLanguage": "en"
    }
  ]
}`;

  const userPrompt = `Language detected: ${detectedLanguage}. Extract and translate vocabulary from:\n\n${content.substring(0, 8000)}`;

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

  const responseText = response.choices[0]?.message?.content || '{"vocabulary":[]}';
  const parsed = JSON.parse(responseText);
  const items: any[] = parsed.vocabulary || [];

  return items
    .filter(item => item.english && item.japaneseKanji)
    .map(item => ({
      english: item.english || '',
      japaneseKanji: item.japaneseKanji || '',
      hiragana: item.hiragana || '',
      category: item.category || 'general',
      confidence: item.confidence ?? 0.8,
      needsClarification: item.needsClarification || false,
      clarificationOptions: item.clarificationOptions || undefined,
      originalTerm: item.english || item.japaneseKanji,
      originalLanguage: (item.originalLanguage as Language) || detectedLanguage
    }));
}
