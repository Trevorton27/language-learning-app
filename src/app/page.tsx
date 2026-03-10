import React from 'react';
import Link from 'next/link';

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 sm:p-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Welcome to <span className="text-zinc-500 dark:text-zinc-400">AI Flashcards</span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
          The ultimate study space for mastering your Japanese and English vocabulary.
          Transform your word lists into interactive learning sessions.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/flashcards"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-5 py-3 text-sm font-medium text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20 w-full sm:w-auto"
          >
            Start Flashcards
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 px-5 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-300 dark:ring-zinc-700 transition hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 w-full sm:w-auto"
          >
            Upload Words
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
