'use client';

import React, { useState, useMemo } from 'react';
import {
  ProcessingResult,
  TranslatedVocabulary,
  ClarificationRequest,
  DuplicateInfo,
  TranslationOption
} from './types';
import ClarificationPrompt from './ClarificationPrompt';

interface PreviewTableProps {
  result: ProcessingResult;
  onConfirm: (
    vocabulary: TranslatedVocabulary[],
    clarificationResolutions: Record<string, TranslationOption>,
    duplicateActions: Record<string, 'keep_both' | 'skip' | 'replace'>
  ) => void;
  onCancel: () => void;
}

type TabType = 'all' | 'new' | 'duplicates' | 'clarifications';

export default function PreviewTable({ result, onConfirm, onCancel }: PreviewTableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [clarificationResolutions, setClarificationResolutions] = useState<Record<string, TranslationOption>>({});
  const [duplicateActions, setDuplicateActions] = useState<Record<string, 'keep_both' | 'skip' | 'replace'>>({});
  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());

  // Combine vocabulary with resolved clarifications
  const processedVocabulary = useMemo(() => {
    return result.vocabulary.map(vocab => {
      const resolution = clarificationResolutions[vocab.originalTerm || vocab.english];
      if (resolution && vocab.needsClarification) {
        return {
          ...vocab,
          japaneseKanji: resolution.japaneseKanji,
          hiragana: resolution.hiragana,
          needsClarification: false
        };
      }
      return vocab;
    }).filter(v => !removedItems.has(v.english.toLowerCase()));
  }, [result.vocabulary, clarificationResolutions, removedItems]);

  // Filter vocabulary by tab
  const filteredVocabulary = useMemo(() => {
    switch (activeTab) {
      case 'new':
        return processedVocabulary.filter(v =>
          !result.duplicates.some(d => d.newTerm.english.toLowerCase() === v.english.toLowerCase())
        );
      case 'duplicates':
        return processedVocabulary.filter(v =>
          result.duplicates.some(d => d.newTerm.english.toLowerCase() === v.english.toLowerCase())
        );
      case 'clarifications':
        return processedVocabulary.filter(v => v.needsClarification);
      default:
        return processedVocabulary;
    }
  }, [activeTab, processedVocabulary, result.duplicates]);

  const handleClarificationResolve = (termId: string, option: TranslationOption) => {
    setClarificationResolutions(prev => ({
      ...prev,
      [termId]: option
    }));
  };

  const handleDuplicateAction = (englishTerm: string, action: 'keep_both' | 'skip' | 'replace') => {
    setDuplicateActions(prev => ({
      ...prev,
      [englishTerm]: action
    }));
  };

  const handleRemoveItem = (englishTerm: string) => {
    setRemovedItems(prev => new Set(prev).add(englishTerm.toLowerCase()));
  };

  const handleConfirm = () => {
    // Filter out skipped duplicates
    const finalVocabulary = processedVocabulary.filter(v => {
      const action = duplicateActions[v.english];
      return action !== 'skip';
    });

    onConfirm(finalVocabulary, clarificationResolutions, duplicateActions);
  };

  const unresolvedClarifications = result.clarificationsNeeded.filter(
    c => !clarificationResolutions[c.term]
  );

  const tabs = [
    { id: 'all' as const, label: 'All', count: processedVocabulary.length },
    { id: 'new' as const, label: 'New', count: processedVocabulary.length - result.duplicates.length },
    { id: 'duplicates' as const, label: 'Duplicates', count: result.duplicates.length },
    { id: 'clarifications' as const, label: 'Need Review', count: unresolvedClarifications.length }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Review Vocabulary</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {result.stats.totalExtracted} terms extracted, {result.stats.translated} translated
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={unresolvedClarifications.length > 0}
              className="px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
            >
              Save {processedVocabulary.length - Object.values(duplicateActions).filter(a => a === 'skip').length} Terms
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{result.stats.totalExtracted}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Extracted</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-semibold text-green-700 dark:text-green-400">{result.stats.translated}</div>
            <div className="text-xs text-green-600 dark:text-green-500">Translated</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-semibold text-yellow-700 dark:text-yellow-400">{result.stats.duplicatesFound}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-500">Duplicates</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-semibold text-blue-700 dark:text-blue-400">{unresolvedClarifications.length}</div>
            <div className="text-xs text-blue-600 dark:text-blue-500">Need Review</div>
          </div>
        </div>
      </div>

      {/* Clarifications Section */}
      {unresolvedClarifications.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl ring-1 ring-yellow-200 dark:ring-yellow-800 p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Clarification Needed ({unresolvedClarifications.length})
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
            These terms have multiple possible translations. Please select the correct one.
          </p>
          <div className="space-y-4">
            {unresolvedClarifications.map(clarification => (
              <ClarificationPrompt
                key={clarification.id}
                clarification={clarification}
                onResolve={handleClarificationResolve}
                resolved={clarificationResolutions[clarification.term]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-4 py-3">English</th>
                <th className="text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-4 py-3">Japanese</th>
                <th className="text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-4 py-3">Reading</th>
                <th className="text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-4 py-3">Category</th>
                <th className="text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredVocabulary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No vocabulary in this category
                  </td>
                </tr>
              ) : (
                filteredVocabulary.map((vocab, index) => {
                  const isDuplicate = result.duplicates.some(
                    d => d.newTerm.english.toLowerCase() === vocab.english.toLowerCase()
                  );
                  const duplicateInfo = result.duplicates.find(
                    d => d.newTerm.english.toLowerCase() === vocab.english.toLowerCase()
                  );
                  const duplicateAction = duplicateActions[vocab.english];

                  return (
                    <tr
                      key={`${vocab.english}-${index}`}
                      className={`${
                        vocab.needsClarification ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                        isDuplicate ? 'bg-orange-50 dark:bg-orange-900/20' :
                        duplicateAction === 'skip' ? 'bg-zinc-50 dark:bg-zinc-800/50 opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{vocab.english}</td>
                      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{vocab.japaneseKanji || '—'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{vocab.hiragana || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {vocab.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {vocab.needsClarification ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                            Needs Review
                          </span>
                        ) : isDuplicate ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                            Duplicate
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            Ready
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isDuplicate && duplicateInfo ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={duplicateAction || 'keep_both'}
                              onChange={(e) => handleDuplicateAction(vocab.english, e.target.value as any)}
                              className="text-xs border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1 bg-white dark:bg-zinc-800 dark:text-zinc-200"
                            >
                              <option value="keep_both">Keep Both</option>
                              <option value="skip">Skip</option>
                              <option value="replace">Replace</option>
                            </select>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRemoveItem(vocab.english)}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
