'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';

function formatCategory(cat: string) {
    return cat
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .replace(/\bOop\b/, 'OOP')
        .replace(/\bAi Ml\b/, 'AI/ML')
        .replace(/\bUi Ux\b/, 'UI/UX')
        .replace(/\bDevops\b/, 'DevOps');
}

const FlashcardsDropdown = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isActive = pathname === '/flashcards';

    // Sync selected from URL on mount / URL change
    useEffect(() => {
        const param = searchParams.get('categories');
        if (param) {
            setSelected(new Set(param.split(',')));
        } else {
            setSelected(new Set());
        }
    }, [searchParams]);

    // Fetch categories when dropdown opens
    useEffect(() => {
        if (!open) return;
        fetch('/api/flashcards/categories')
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setCategories(data);
            })
            .catch(() => {});
    }, [open]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const navigate = (newSelected: Set<string>) => {
        if (newSelected.size === 0) {
            router.push('/flashcards');
        } else {
            const params = Array.from(newSelected).join(',');
            router.push(`/flashcards?categories=${params}`);
        }
    };

    const toggleCategory = (cat: string) => {
        const next = new Set(selected);
        if (next.has(cat)) {
            next.delete(cat);
        } else {
            next.add(cat);
        }
        setSelected(next);
        navigate(next);
    };

    const selectAll = () => {
        setSelected(new Set());
        navigate(new Set());
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className={`rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition inline-flex items-center gap-1 ${
                    isActive
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
            >
                Flashcards
                <svg
                    className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-700 py-2 z-50">
                    {/* All option */}
                    <button
                        onClick={selectAll}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                            selected.size === 0
                                ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                                : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                    >
                        <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                selected.size === 0
                                    ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100'
                                    : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                        >
                            {selected.size === 0 && (
                                <svg className="w-3 h-3 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            )}
                        </span>
                        <span className="flex-1 text-left">All Categories</span>
                        {categories.length > 0 && (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                                {categories.reduce((sum, c) => sum + c.count, 0)}
                            </span>
                        )}
                    </button>

                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                    {categories.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500">Loading...</div>
                    ) : (
                        categories.map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => toggleCategory(cat.name)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                                    selected.has(cat.name)
                                        ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                                        : 'text-zinc-600 dark:text-zinc-400'
                                }`}
                            >
                                <span
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                        selected.has(cat.name)
                                            ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100'
                                            : 'border-zinc-300 dark:border-zinc-600'
                                    }`}
                                >
                                    {selected.has(cat.name) && (
                                        <svg className="w-3 h-3 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    )}
                                </span>
                                <span className="flex-1 text-left">{formatCategory(cat.name)}</span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{cat.count}</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const Navigation = () => {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 gap-4">
                    <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 shrink-0">
                        AI Flashcards
                    </Link>
                    <Suspense fallback={null}>
                        <SearchBar />
                    </Suspense>
                    <div className="flex items-center gap-2">
                        <ul className="flex space-x-1 sm:space-x-2">
                            <li>
                                <Link
                                    href="/"
                                    className={`rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition ${
                                        pathname === '/'
                                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                            : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Suspense fallback={
                                    <span className="rounded-full px-3 sm:px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                        Flashcards
                                    </span>
                                }>
                                    <FlashcardsDropdown />
                                </Suspense>
                            </li>
                            <li>
                                <Link
                                    href="/upload"
                                    className={`rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition ${
                                        pathname === '/upload'
                                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                            : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    Upload
                                </Link>
                            </li>
                        </ul>
                        <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700 pl-2">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
