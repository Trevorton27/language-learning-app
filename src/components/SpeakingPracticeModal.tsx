'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VocabItem } from '@/lib/elevenlabs';
import SpeakingRecap from './SpeakingRecap';

type SessionStatus = 'loading' | 'ready' | 'connected' | 'ended' | 'error';

interface SpeakingPracticeModalProps {
  flashcardIds: string[];
  onClose: () => void;
}

const SpeakingPracticeModal: React.FC<SpeakingPracticeModalProps> = ({ flashcardIds, onClose }) => {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationRef = useRef<any>(null);
  const initRef = useRef(false);

  const initSession = useCallback(async () => {
    if (initRef.current) return;
    initRef.current = true;

    try {
      // Request mic permission early, while still close to user gesture.
      // This primes the browser permission so the SDK's internal getUserMedia succeeds.
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        throw new Error('Microphone access denied. Please allow microphone access and try again.');
      }
      micStream.getTracks().forEach((t) => t.stop());

      const res = await fetch('/api/speaking/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const session = await res.json();
      setVocabulary(session.vocabulary);

      if (!session.signedUrl) {
        setError('ElevenLabs is not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID to your environment variables.');
        setStatus('error');
        return;
      }

      setStatus('ready');

      // Dynamic import to avoid SSR issues
      const { Conversation } = await import('@11labs/client');

      const conversation = await Conversation.startSession({
        signedUrl: session.signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: session.systemPrompt },
          },
        },
        onConnect: () => {
          console.log('[Speaking] Connected to ElevenLabs agent');
          setStatus('connected');
          setIsMicActive(true);
        },
        onDisconnect: () => {
          console.log('[Speaking] Disconnected from agent');
          setStatus('ended');
          setIsMicActive(false);
        },
        onError: (message: string) => {
          console.error('[Speaking] Error:', message);
          setError('Voice session encountered an error.');
          setStatus('error');
        },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          console.log(`[Speaking] ${source}: ${message}`);
        },
        onModeChange: ({ mode }: { mode: string }) => {
          console.log(`[Speaking] Mode: ${mode}`);
        },
      });

      conversationRef.current = conversation;
    } catch (err) {
      console.error('Session init error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setStatus('error');
    }
  }, [flashcardIds]);

  useEffect(() => {
    initSession();
    return () => {
      conversationRef.current?.endSession();
    };
  }, [initSession]);

  const handleEndSession = async () => {
    await conversationRef.current?.endSession();
    setStatus('ended');
    setIsMicActive(false);
  };

  const toggleMic = () => {
    if (!conversationRef.current) return;
    if (isMicActive) {
      conversationRef.current.setMicMuted(true);
      setIsMicActive(false);
    } else {
      conversationRef.current.setMicMuted(false);
      setIsMicActive(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={status === 'ended' ? onClose : undefined} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Speaking Practice</h2>
          <button
            onClick={status === 'connected' ? handleEndSession : onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-10 h-10 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Preparing your practice session...</p>
            </div>
          )}

          {status === 'ready' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-10 h-10 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Connecting to voice agent...</p>
            </div>
          )}

          {status === 'connected' && (
            <div className="flex flex-col items-center gap-6 py-6">
              {/* Mic indicator */}
              <button
                onClick={toggleMic}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isMicActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-4 ring-emerald-500/30 animate-pulse'
                    : 'bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700'
                }`}
              >
                <svg
                  className={`w-8 h-8 ${isMicActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  {isMicActive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    </>
                  )}
                </svg>
              </button>

              <div className="text-center">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {isMicActive ? 'Listening...' : 'Microphone muted'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Tap the mic to {isMicActive ? 'mute' : 'unmute'}
                </p>
              </div>

              {/* Vocabulary being practiced */}
              <div className="w-full">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Practicing {vocabulary.length} words:</p>
                <div className="flex flex-wrap gap-2">
                  {vocabulary.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300 ring-1 ring-zinc-200 dark:ring-zinc-700"
                    >
                      {item.kanji}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleEndSession}
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 ring-1 ring-zinc-300 dark:ring-zinc-700 transition hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                End Session
              </button>
            </div>
          )}

          {status === 'ended' && (
            <SpeakingRecap vocabulary={vocabulary} onClose={onClose} />
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center max-w-xs">{error}</p>

              {/* Show vocabulary even on error so user knows what was selected */}
              {vocabulary.length > 0 && (
                <div className="w-full max-w-sm">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Selected vocabulary:</p>
                  <div className="space-y-1">
                    {vocabulary.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                        <span className="text-zinc-900 dark:text-zinc-100">{item.kanji} ({item.hiragana})</span>
                        <span className="text-zinc-500 dark:text-zinc-400">{item.english}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-6 py-3 text-sm font-medium text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeakingPracticeModal;
