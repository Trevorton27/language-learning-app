'use client';

import React, { useState, useRef, useCallback } from 'react';
import { UploadState, UploadOptions } from './types';
import ProcessingModal from './ProcessingModal';
import PreviewTable from './PreviewTable';

const DEFAULT_OPTIONS: UploadOptions = {
  autoTranslate: true,
  autoCategorize: true,
  generateHiragana: true,
  detectDuplicates: true
};

interface EnhancedUploadFormProps {
  onComplete?: () => void;
}

export default function EnhancedUploadForm({ onComplete }: EnhancedUploadFormProps) {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    file: null,
    textInput: '',
    options: DEFAULT_OPTIONS,
    result: null,
    error: null,
    progress: 0,
    progressMessage: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    setState(prev => ({ ...prev, file, error: null }));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleOptionChange = (key: keyof UploadOptions) => {
    setState(prev => ({
      ...prev,
      options: { ...prev.options, [key]: !prev.options[key] }
    }));
  };

  const handleProcess = async () => {
    if (inputMode === 'file' && !state.file) {
      setState(prev => ({ ...prev, error: 'Please select a file first' }));
      return;
    }
    if (inputMode === 'text' && !state.textInput.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter some text' }));
      return;
    }

    setState(prev => ({
      ...prev,
      status: 'processing',
      error: null,
      progress: 0,
      progressMessage: 'Starting upload...'
    }));

    try {
      const formData = new FormData();

      if (inputMode === 'file' && state.file) {
        formData.append('file', state.file);
      } else {
        formData.append('text', state.textInput);
      }

      formData.append('options', JSON.stringify(state.options));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => {
          if (prev.progress < 90) {
            const messages = [
              'Extracting vocabulary...',
              'Analyzing content...',
              'Translating terms...',
              'Generating readings...',
              'Categorizing vocabulary...',
              'Checking for duplicates...'
            ];
            const msgIndex = Math.floor(prev.progress / 15);
            return {
              ...prev,
              progress: prev.progress + 5,
              progressMessage: messages[msgIndex] || 'Processing...'
            };
          }
          return prev;
        });
      }, 500);

      const response = await fetch('/api/upload/process', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let message = 'Processing failed';
        if (response.status === 504 || response.status === 408) {
          message = 'Request timed out. Try a smaller file or fewer words at a time.';
        } else {
          try {
            const errorData = await response.json();
            message = errorData.error || message;
          } catch {
            // Response was not JSON (e.g. Vercel HTML error page)
          }
        }
        throw new Error(message);
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        status: 'preview',
        result,
        progress: 100,
        progressMessage: 'Processing complete!'
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  };

  const handleConfirm = async (
    vocabulary: any[],
    clarificationResolutions: any,
    duplicateActions: any
  ) => {
    setState(prev => ({ ...prev, status: 'saving', progressMessage: 'Saving vocabulary...' }));

    try {
      const response = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabulary,
          clarificationResolutions,
          duplicateActions
        })
      });

      if (!response.ok) {
        let message = 'Failed to save';
        try {
          const errorData = await response.json();
          message = errorData.error || message;
        } catch {
          // Response was not JSON
        }
        throw new Error(message);
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        status: 'success',
        progressMessage: `Saved ${result.total} flashcards!`
      }));

      // Reset after success
      setTimeout(() => {
        setState({
          status: 'idle',
          file: null,
          textInput: '',
          options: DEFAULT_OPTIONS,
          result: null,
          error: null,
          progress: 0,
          progressMessage: ''
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onComplete?.();
      }, 2000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to save vocabulary'
      }));
    }
  };

  const handleCancel = () => {
    setState({
      status: 'idle',
      file: null,
      textInput: '',
      options: DEFAULT_OPTIONS,
      result: null,
      error: null,
      progress: 0,
      progressMessage: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const acceptedFileTypes = '.txt,.csv,.json,.pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp';

  // Show preview if we have results
  if (state.status === 'preview' && state.result) {
    return (
      <PreviewTable
        result={state.result}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  // Show processing modal
  if (state.status === 'processing' || state.status === 'saving') {
    return (
      <ProcessingModal
        progress={state.progress}
        message={state.progressMessage}
        status={state.status}
      />
    );
  }

  // Show success message
  if (state.status === 'success') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Success!</h3>
        <p className="text-zinc-600 dark:text-zinc-400">{state.progressMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Input Mode Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setInputMode('file')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            inputMode === 'file'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Upload File
        </button>
        <button
          onClick={() => setInputMode('text')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            inputMode === 'text'
              ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
              : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* File Upload */}
      {inputMode === 'file' && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            isDragging
              ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
              : state.file
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileInputChange}
            className="hidden"
            id="file-upload"
          />

          {state.file ? (
            <div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{state.file.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {(state.file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={() => {
                  setState(prev => ({ ...prev, file: null }));
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                Remove file
              </button>
            </div>
          ) : (
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Drop files here or <span className="text-indigo-600 dark:text-indigo-400">browse</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Supports TXT, CSV, JSON, PDF, DOCX, Images
              </p>
            </label>
          )}
        </div>
      )}

      {/* Text Input */}
      {inputMode === 'text' && (
        <div>
          <textarea
            value={state.textInput}
            onChange={(e) => setState(prev => ({ ...prev, textInput: e.target.value }))}
            placeholder="Paste vocabulary here...&#10;&#10;Examples:&#10;- One word per line&#10;- Comma-separated words&#10;- JSON array of terms&#10;- Mixed English and Japanese"
            className="w-full h-48 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20 resize-none"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            Enter vocabulary in any format - AI will process and translate automatically
          </p>
        </div>
      )}

      {/* Options */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Processing Options</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'autoTranslate' as const, label: 'Auto-translate missing languages' },
            { key: 'autoCategorize' as const, label: 'Auto-categorize vocabulary' },
            { key: 'generateHiragana' as const, label: 'Generate hiragana for kanji' },
            { key: 'detectDuplicates' as const, label: 'Detect existing duplicates' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.options[key]}
                onChange={() => handleOptionChange(key)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-700 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
            <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>
          </div>
        </div>
      )}

      {/* Process Button */}
      <button
        onClick={handleProcess}
        disabled={state.status !== 'idle' && state.status !== 'error' || (inputMode === 'file' ? !state.file : !state.textInput.trim())}
        className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-5 py-3 text-sm font-medium text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:text-zinc-500 dark:disabled:text-zinc-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
      >
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Process with AI
      </button>
    </div>
  );
}
