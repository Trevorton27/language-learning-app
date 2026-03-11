'use client';
import React from 'react';
import { VocabItem } from '@/lib/elevenlabs';

interface SpeakingRecapProps {
  vocabulary: VocabItem[];
  onClose: () => void;
}

const SpeakingRecap: React.FC<SpeakingRecapProps> = ({ vocabulary, onClose }) => {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
        <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Practice Complete</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          You practiced {vocabulary.length} word{vocabulary.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-2">
        {vocabulary.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700"
          >
            <div>
              <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{item.kanji}</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-2">({item.hiragana})</span>
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-300">{item.english}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center max-w-xs">
        Detailed pronunciation analysis and scoring will be available in a future update.
      </p>

      <button
        onClick={onClose}
        className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
      >
        Done
      </button>
    </div>
  );
};

export default SpeakingRecap;
