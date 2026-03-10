// Shared types for upload components
import {
  ProcessingResult,
  TranslatedVocabulary,
  ClarificationRequest,
  DuplicateInfo,
  TranslationOption,
  UploadOptions
} from '@/lib/ai/types';

export interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'preview' | 'saving' | 'success' | 'error';
  file: File | null;
  textInput: string;
  options: UploadOptions;
  result: ProcessingResult | null;
  error: string | null;
  progress: number;
  progressMessage: string;
}

export interface ClarificationResolution {
  [termId: string]: TranslationOption;
}

export interface DuplicateAction {
  [englishTerm: string]: 'keep_both' | 'skip' | 'replace';
}

export type { ProcessingResult, TranslatedVocabulary, ClarificationRequest, DuplicateInfo, TranslationOption, UploadOptions };
