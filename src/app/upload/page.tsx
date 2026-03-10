'use client';

import React, { useEffect, useState } from 'react';
import { EnhancedUploadForm } from '@/components/upload';

interface UploadRecord {
    id: string;
    createdAt: string;
    saved: number;
    replaced: number;
    skipped: number;
}

const UploadPage = () => {
    const [uploads, setUploads] = useState<UploadRecord[]>([]);
    const [historyKey, setHistoryKey] = useState(0);

    useEffect(() => {
        fetch('/api/uploads')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setUploads(data); })
            .catch(() => {});
    }, [historyKey]);

    const handleComplete = () => {
        setHistoryKey(k => k + 1);
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Upload Vocabulary</h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Add new words to your collection using AI-powered processing
                </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 sm:p-8">
                <EnhancedUploadForm onComplete={handleComplete} />
            </div>

            {/* Upload History */}
            <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Upload History</h2>
                {uploads.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">No uploads yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {uploads.map((upload) => {
                            const total = upload.saved + upload.replaced;
                            return (
                                <div
                                    key={upload.id}
                                    className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 ring-1 ring-zinc-200 dark:ring-zinc-800"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {total} card{total !== 1 ? 's' : ''} added
                                                {upload.replaced > 0 && (
                                                    <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                                                        {' '}({upload.replaced} updated)
                                                    </span>
                                                )}
                                                {upload.skipped > 0 && (
                                                    <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                                                        {', '}{upload.skipped} skipped
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDate(upload.createdAt)}</p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatTime(upload.createdAt)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-6 ring-1 ring-zinc-200 dark:ring-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Supported Formats</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Plain text (.txt)
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        CSV files (.csv)
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        JSON files (.json)
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Images (OCR)
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        PDF documents
                    </div>
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Word docs (.docx)
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">AI Features</h4>
                    <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                        <li>• Automatic language detection (English/Japanese)</li>
                        <li>• Translation between languages</li>
                        <li>• Hiragana reading generation for kanji</li>
                        <li>• Smart categorization of vocabulary</li>
                        <li>• Duplicate detection against existing flashcards</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;
