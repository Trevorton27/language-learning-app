import { VocabItem } from './elevenlabs';

// --- Status & Types ---

export type PronunciationItemStatus =
  | 'pending'
  | 'correct'
  | 'corrected'
  | 'difficult'
  | 'retried_correct'
  | 'retried_difficult';

export interface PronunciationFeedback {
  /** Free-text feedback from agent or user note */
  note: string | null;
  /** Placeholder for future real scoring (0-100) */
  score: number | null;
}

export interface PronunciationItem {
  vocab: VocabItem;
  status: PronunciationItemStatus;
  attempts: number;
  feedback: PronunciationFeedback;
}

export type SessionPhase = 'initial' | 'retry' | 'complete';

export interface PronunciationSessionState {
  items: PronunciationItem[];
  currentIndex: number;
  phase: SessionPhase;
  retryQueue: string[]; // vocab IDs queued for retry
}

// --- Summary ---

export interface PronunciationSummary {
  totalPracticed: number;
  correct: number;
  corrected: number;
  retried: number;
  stillDifficult: number;
  items: PronunciationItem[];
}

// --- Factory ---

export function createSession(vocabulary: VocabItem[]): PronunciationSessionState {
  return {
    items: vocabulary.map((vocab) => ({
      vocab,
      status: 'pending',
      attempts: 0,
      feedback: { note: null, score: null },
    })),
    currentIndex: 0,
    phase: 'initial',
    retryQueue: [],
  };
}

// --- State transitions ---

export function markCorrect(state: PronunciationSessionState): PronunciationSessionState {
  const next = cloneState(state);
  const item = next.items.find((i) => i.vocab.id === currentVocabId(next));
  if (!item) return next;

  item.attempts += 1;
  item.status = next.phase === 'retry' ? 'retried_correct' : 'correct';
  return advance(next);
}

export function markCorrected(state: PronunciationSessionState): PronunciationSessionState {
  const next = cloneState(state);
  const item = next.items.find((i) => i.vocab.id === currentVocabId(next));
  if (!item) return next;

  item.attempts += 1;
  item.status = 'corrected';
  // Queue for retry
  if (!next.retryQueue.includes(item.vocab.id)) {
    next.retryQueue.push(item.vocab.id);
  }
  return advance(next);
}

export function markDifficult(state: PronunciationSessionState): PronunciationSessionState {
  const next = cloneState(state);
  const item = next.items.find((i) => i.vocab.id === currentVocabId(next));
  if (!item) return next;

  item.attempts += 1;
  item.status = next.phase === 'retry' ? 'retried_difficult' : 'difficult';
  // Queue for retry (or re-queue if still difficult during retry)
  if (!next.retryQueue.includes(item.vocab.id)) {
    next.retryQueue.push(item.vocab.id);
  }
  return advance(next);
}

// --- Queries ---

export function currentVocabId(state: PronunciationSessionState): string | null {
  if (state.phase === 'complete') return null;

  if (state.phase === 'initial') {
    const item = state.items[state.currentIndex];
    return item ? item.vocab.id : null;
  }

  // retry phase
  const id = state.retryQueue[state.currentIndex];
  return id ?? null;
}

export function currentItem(state: PronunciationSessionState): PronunciationItem | null {
  const id = currentVocabId(state);
  if (!id) return null;
  return state.items.find((i) => i.vocab.id === id) ?? null;
}

export function progress(state: PronunciationSessionState): { current: number; total: number } {
  if (state.phase === 'initial') {
    return { current: state.currentIndex + 1, total: state.items.length };
  }
  if (state.phase === 'retry') {
    return { current: state.currentIndex + 1, total: state.retryQueue.length };
  }
  return { current: state.items.length, total: state.items.length };
}

export function buildSummary(state: PronunciationSessionState): PronunciationSummary {
  const items = state.items;
  return {
    totalPracticed: items.filter((i) => i.status !== 'pending').length,
    correct: items.filter((i) => i.status === 'correct').length,
    corrected: items.filter((i) => i.status === 'corrected').length,
    retried: items.filter((i) => i.status === 'retried_correct' || i.status === 'retried_difficult').length,
    stillDifficult: items.filter((i) => i.status === 'difficult' || i.status === 'retried_difficult').length,
    items,
  };
}

// --- Internal helpers ---

function cloneState(state: PronunciationSessionState): PronunciationSessionState {
  return {
    ...state,
    items: state.items.map((i) => ({ ...i, feedback: { ...i.feedback } })),
    retryQueue: [...state.retryQueue],
  };
}

function advance(state: PronunciationSessionState): PronunciationSessionState {
  if (state.phase === 'initial') {
    const nextIndex = state.currentIndex + 1;
    if (nextIndex < state.items.length) {
      state.currentIndex = nextIndex;
      return state;
    }
    // Initial pass done — transition to retry if needed
    if (state.retryQueue.length > 0) {
      state.phase = 'retry';
      state.currentIndex = 0;
      return state;
    }
    state.phase = 'complete';
    return state;
  }

  if (state.phase === 'retry') {
    const nextIndex = state.currentIndex + 1;
    if (nextIndex < state.retryQueue.length) {
      state.currentIndex = nextIndex;
      return state;
    }
    // Check if any words were marked difficult again during retry
    const stillDifficult = state.items.filter((i) => i.status === 'retried_difficult');
    if (stillDifficult.length > 0) {
      // Re-queue them for another retry pass
      state.retryQueue = stillDifficult.map((i) => i.vocab.id);
      state.currentIndex = 0;
      return state;
    }
    state.phase = 'complete';
    return state;
  }

  return state;
}
