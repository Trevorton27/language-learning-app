'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VocabItem } from '@/lib/elevenlabs';
import {
  PronunciationSessionState,
  createSession,
  markCorrect,
  markCorrected,
  markDifficult,
  currentItem,
  progress,
  buildSummary,
  PronunciationSummary,
} from '@/lib/pronunciation';
import PronunciationRecap from './PronunciationRecap';

type ModalStatus = 'loading' | 'ready' | 'connected' | 'ended' | 'error';

interface PronunciationModalProps {
  flashcardIds: string[];
  onClose: () => void;
}

const PronunciationModal: React.FC<PronunciationModalProps> = ({ flashcardIds, onClose }) => {
  const [status, setStatus] = useState<ModalStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [session, setSession] = useState<PronunciationSessionState | null>(null);
  const [summary, setSummary] = useState<PronunciationSummary | null>(null);
  const [inputVolume, setInputVolume] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationRef = useRef<any>(null);
  const initRef = useRef(false);
  const volumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // Release the stream — we only needed to prime the permission
      micStream.getTracks().forEach((t) => t.stop());

      const res = await fetch('/api/speaking/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create pronunciation session');
      }

      const data = await res.json();
      const vocabulary: VocabItem[] = data.vocabulary;

      setSession(createSession(vocabulary));

      if (!data.signedUrl) {
        setError('ElevenLabs is not configured. Add ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID to your environment variables.');
        setStatus('error');
        return;
      }

      setStatus('ready');

      const { Conversation } = await import('@11labs/client');

      const conversation = await Conversation.startSession({
        signedUrl: data.signedUrl,
        overrides: {
          agent: {
            prompt: { prompt: data.systemPrompt },
          },
        },
        onConnect: () => {
          console.log('[Pronunciation] Connected to ElevenLabs agent');
          setStatus('connected');
          setIsMicActive(true);
        },
        onDisconnect: () => {
          console.log('[Pronunciation] Disconnected from agent');
          setSession((prev) => {
            if (!prev) return prev;
            setSummary(buildSummary(prev));
            return prev;
          });
          setStatus('ended');
          setIsMicActive(false);
        },
        onError: (message: string) => {
          console.error('[Pronunciation] Error:', message);
          setError('Voice session encountered an error.');
          setStatus('error');
        },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          console.log(`[Pronunciation] ${source}: ${message}`);
        },
        onModeChange: ({ mode }: { mode: string }) => {
          console.log(`[Pronunciation] Mode: ${mode}`);
        },
      });

      conversationRef.current = conversation;

      // Start polling input volume to verify mic is capturing audio
      volumeIntervalRef.current = setInterval(() => {
        if (conversationRef.current) {
          const vol = conversationRef.current.getInputVolume();
          setInputVolume(vol);
        }
      }, 100);
    } catch (err) {
      console.error('Pronunciation session init error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setStatus('error');
    }
  }, [flashcardIds]);

  useEffect(() => {
    initSession();
    return () => {
      conversationRef.current?.endSession();
      if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    };
  }, [initSession]);

  const handleEndSession = async () => {
    if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
    await conversationRef.current?.endSession();
    setSession((prev) => {
      if (!prev) return prev;
      setSummary(buildSummary(prev));
      return prev;
    });
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

  const handleGotIt = () => {
    setSession((prev) => (prev ? markCorrect(prev) : prev));
  };

  const handleNeededHelp = () => {
    setSession((prev) => (prev ? markCorrected(prev) : prev));
  };

  const handleTooHard = () => {
    setSession((prev) => (prev ? markDifficult(prev) : prev));
  };

  useEffect(() => {
    if (session?.phase === 'complete' && status === 'connected') {
      setSummary(buildSummary(session));
      handleEndSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.phase]);

  const current = session ? currentItem(session) : null;
  const prog = session ? progress(session) : { current: 0, total: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={status === 'ended' ? onClose : undefined} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Pronunciation Practice</h2>
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
          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-10 h-10 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Preparing pronunciation session...</p>
            </div>
          )}

          {/* Connecting */}
          {status === 'ready' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-10 h-10 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Connecting to pronunciation coach...</p>
            </div>
          )}

          {/* Active session */}
          {status === 'connected' && session && (
            <div className="flex flex-col items-center gap-5">
              {/* Progress bar */}
              <div className="w-full">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                  <span className="font-medium">
                    {session.phase === 'retry' ? 'Retry Round' : 'Round 1'}
                  </span>
                  <span className="tabular-nums">{prog.current} / {prog.total}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-300"
                    style={{ width: `${(prog.current / Math.max(prog.total, 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current word card */}
              {current && (
                <div className="w-full text-center py-6 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 ring-1 ring-zinc-200 dark:ring-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    {session.phase === 'retry' ? 'Retry this word:' : 'Listen & repeat:'}
                  </p>
                  <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
                    {current.vocab.kanji}
                  </p>
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 mt-1">
                    {current.vocab.hiragana}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-2">
                    {current.vocab.english}
                  </p>
                  {current.attempts > 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                      Attempt {current.attempts + 1}
                    </p>
                  )}
                </div>
              )}

              {/* Mic indicator with volume level */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleMic}
                  className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isMicActive
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 ring-4 ring-emerald-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700'
                  }`}
                >
                  {/* Volume ring indicator */}
                  {isMicActive && (
                    <span
                      className="absolute inset-0 rounded-full border-2 border-emerald-400 dark:border-emerald-500 transition-transform"
                      style={{ transform: `scale(${1 + inputVolume * 0.5})`, opacity: Math.min(inputVolume * 3, 1) }}
                    />
                  )}
                  <svg
                    className={`w-7 h-7 ${isMicActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}
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

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {isMicActive ? 'Listening... repeat the word' : 'Mic muted — tap to unmute'}
                </p>

                {/* Volume meter for debugging */}
                {isMicActive && (
                  <div className="w-32 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                      style={{ width: `${Math.min(inputVolume * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Self-assessment buttons */}
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 text-center">How did you do?</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleGotIt}
                    className="flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-medium transition ring-1 ring-zinc-200 dark:ring-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    Got it
                  </button>
                  <button
                    onClick={handleNeededHelp}
                    className="flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-medium transition ring-1 ring-zinc-200 dark:ring-zinc-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Needed help
                  </button>
                  <button
                    onClick={handleTooHard}
                    className="flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-medium transition ring-1 ring-zinc-200 dark:ring-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Too hard
                  </button>
                </div>
              </div>

              {/* End session */}
              <button
                onClick={handleEndSession}
                className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 ring-1 ring-zinc-300 dark:ring-zinc-700 transition hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                End Session Early
              </button>
            </div>
          )}

          {/* Recap */}
          {status === 'ended' && summary && (
            <PronunciationRecap summary={summary} onClose={onClose} />
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center max-w-xs">{error}</p>

              {session && session.items.length > 0 && (
                <div className="w-full max-w-sm">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Selected vocabulary:</p>
                  <div className="space-y-1">
                    {session.items.map((item) => (
                      <div key={item.vocab.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-sm">
                        <span className="text-zinc-900 dark:text-zinc-100">{item.vocab.kanji} ({item.vocab.hiragana})</span>
                        <span className="text-zinc-500 dark:text-zinc-400">{item.vocab.english}</span>
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

export default PronunciationModal;
