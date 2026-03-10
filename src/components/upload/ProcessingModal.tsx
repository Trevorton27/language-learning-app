'use client';

import React from 'react';

interface ProcessingModalProps {
  progress: number;
  message: string;
  status: 'processing' | 'saving';
}

export default function ProcessingModal({ progress, message, status }: ProcessingModalProps) {
  const steps = [
    { id: 1, label: 'Uploading file', completed: progress > 10 },
    { id: 2, label: 'Extracting vocabulary', completed: progress > 25 },
    { id: 3, label: 'Translating terms', completed: progress > 50 },
    { id: 4, label: 'Generating readings', completed: progress > 70 },
    { id: 5, label: 'Checking duplicates', completed: progress > 85 },
    { id: 6, label: status === 'saving' ? 'Saving to database' : 'Finalizing', completed: progress >= 100 }
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-zinc-600 dark:text-zinc-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {status === 'saving' ? 'Saving Vocabulary...' : 'Processing Your Content'}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = !step.completed &&
            (index === 0 || steps[index - 1].completed);

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 text-sm ${
                step.completed
                  ? 'text-green-700 dark:text-green-400'
                  : isActive
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.completed
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : isActive
                    ? 'bg-zinc-900 dark:bg-zinc-100'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                {step.completed ? (
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? (
                  <div className="w-2 h-2 bg-white dark:bg-zinc-900 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                )}
              </div>
              <span className={step.completed ? 'line-through' : ''}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center mt-6">
        This may take a moment depending on the amount of content...
      </p>
    </div>
  );
}
