// Types for AI vocabulary processing

export type Language = 'en' | 'ja' | 'mixed' | 'unknown';

export type FileType = 'text' | 'csv' | 'pdf' | 'docx' | 'image' | 'json';

export interface ExtractedTerm {
  term: string;
  language: Language;
  context?: string;
  confidence: number;
}

export interface TranslationOption {
  japaneseKanji: string;
  hiragana: string;
  meaning: string;
}

export interface TranslatedVocabulary {
  english: string;
  japaneseKanji: string;
  hiragana: string;
  category: string;
  confidence: number;
  needsClarification: boolean;
  clarificationOptions?: TranslationOption[];
  originalTerm?: string;
  originalLanguage?: Language;
}

export interface FormattedFlashcard {
  front: string;
  back: string;
  category: string;
}

export interface ProcessingResult {
  status: 'success' | 'needs_clarification' | 'error';
  vocabulary: TranslatedVocabulary[];
  clarificationsNeeded: ClarificationRequest[];
  duplicates: DuplicateInfo[];
  errors: string[];
  stats: ProcessingStats;
}

export interface ClarificationRequest {
  id: string;
  term: string;
  originalLanguage: Language;
  options: TranslationOption[];
  context?: string;
}

export interface DuplicateInfo {
  newTerm: TranslatedVocabulary;
  existingTerm: {
    id: string;
    front: string;
    back: string;
    category?: string;
  };
  action?: 'keep_both' | 'skip' | 'replace';
}

export interface ProcessingStats {
  totalExtracted: number;
  translated: number;
  duplicatesFound: number;
  clarificationsNeeded: number;
  errors: number;
}

export interface UploadOptions {
  autoTranslate: boolean;
  autoCategorize: boolean;
  generateHiragana: boolean;
  detectDuplicates: boolean;
}

// Categories for vocabulary
export const VOCABULARY_CATEGORIES = [
  'programming_fundamentals',
  'oop',
  'data_structures_algorithms',
  'web_development',
  'database',
  'devops',
  'cloud',
  'security',
  'ai_ml',
  'ui_ux',
  'general',
] as const;

export type VocabularyCategory = typeof VOCABULARY_CATEGORIES[number];
