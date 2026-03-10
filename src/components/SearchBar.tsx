'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

const SearchBar = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(searchParams.get('q') || '');

    useEffect(() => {
        setValue(searchParams.get('q') || '');
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setValue(q);
        if (q) {
            router.push(`/flashcards?q=${encodeURIComponent(q)}`);
        } else {
            router.push('/flashcards');
        }
    };

    return (
        <div className="relative flex items-center">
            <svg
                className="absolute left-3 h-4 w-4 text-zinc-400 dark:text-zinc-500 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
                type="search"
                value={value}
                onChange={handleChange}
                placeholder="Search in English or Japanese..."
                className="w-56 sm:w-64 pl-9 pr-3 py-1.5 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 transition"
            />
        </div>
    );
};

export default SearchBar;
