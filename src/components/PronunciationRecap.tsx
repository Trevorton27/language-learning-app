'use client';
import React from 'react';
import { PronunciationSummary, PronunciationItem, PronunciationItemStatus } from '@/lib/pronunciation';

interface PronunciationRecapProps {
  summary: PronunciationSummary;
  onClose: () => void;
}

const STATUS_CONFIG: Record<PronunciationItemStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Skipped', color: 'text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800' },
  correct: { label: 'Mastered', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  corrected: { label: 'Corrected', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  difficult: { label: 'Difficult', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  retried_correct: { label: 'Retried & Mastered', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  retried_difficult: { label: 'Needs Work', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
};

function isMastered(status: PronunciationItemStatus) {
  return status === 'correct' || status === 'retried_correct';
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700 min-w-[70px]">
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}

function ItemRow({ item }: { item: PronunciationItem }) {
  const cfg = STATUS_CONFIG[item.status];
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-700 ${cfg.bg}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{item.vocab.kanji}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-1.5">({item.vocab.hiragana})</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{item.vocab.english}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

const PronunciationRecap: React.FC<PronunciationRecapProps> = ({ summary, onClose }) => {
  const mastered = summary.items.filter((i) => isMastered(i.status));
  const needsWork = summary.items.filter((i) => !isMastered(i.status) && i.status !== 'pending');
  const allMastered = needsWork.length === 0 && mastered.length > 0;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Icon */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        allMastered
          ? 'bg-emerald-100 dark:bg-emerald-900/30'
          : 'bg-amber-100 dark:bg-amber-900/30'
      }`}>
        {allMastered ? (
          <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {allMastered ? 'All Words Mastered!' : 'Pronunciation Practice Complete'}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {summary.totalPracticed} word{summary.totalPracticed !== 1 ? 's' : ''} practiced
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <StatBadge label="Correct" value={summary.correct} color="text-emerald-600 dark:text-emerald-400" />
        <StatBadge label="Corrected" value={summary.corrected} color="text-amber-600 dark:text-amber-400" />
        <StatBadge label="Retried" value={summary.retried} color="text-blue-600 dark:text-blue-400" />
        <StatBadge label="Difficult" value={summary.stillDifficult} color="text-red-600 dark:text-red-400" />
      </div>

      {/* Word lists */}
      <div className="w-full max-w-sm space-y-4">
        {mastered.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
              Mastered ({mastered.length})
            </p>
            <div className="space-y-1.5">
              {mastered.map((item) => <ItemRow key={item.vocab.id} item={item} />)}
            </div>
          </div>
        )}

        {needsWork.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
              Needs More Work ({needsWork.length})
            </p>
            <div className="space-y-1.5">
              {needsWork.map((item) => <ItemRow key={item.vocab.id} item={item} />)}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
      >
        Done
      </button>
    </div>
  );
};

export default PronunciationRecap;
