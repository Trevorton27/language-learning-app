'use client';

import React from 'react';
import { ClarificationRequest, TranslationOption } from './types';

interface ClarificationPromptProps {
  clarification: ClarificationRequest;
  onResolve: (termId: string, option: TranslationOption) => void;
  resolved?: TranslationOption;
}

export default function ClarificationPrompt({
  clarification,
  onResolve,
  resolved
}: ClarificationPromptProps) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl p-4 ring-1 ${resolved ? 'ring-green-200 dark:ring-green-800' : 'ring-yellow-200 dark:ring-yellow-800'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            &quot;{clarification.term}&quot;
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              ({clarification.originalLanguage === 'en' ? 'English' : 'Japanese'})
            </span>
          </h4>
          {clarification.context && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Context: {clarification.context}</p>
          )}
        </div>
        {resolved && (
          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            Resolved
          </span>
        )}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
        This term has multiple possible translations. Please select the most appropriate one:
      </p>

      <div className="space-y-2">
        {clarification.options.map((option, index) => {
          const isSelected = resolved?.japaneseKanji === option.japaneseKanji;

          return (
            <button
              key={index}
              onClick={() => onResolve(clarification.term, option)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                isSelected
                  ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-200 dark:ring-green-800'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {option.japaneseKanji}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-2">
                    ({option.hiragana})
                  </span>
                </div>
                {isSelected && (
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{option.meaning}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
