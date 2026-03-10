'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';

const Navigation = () => {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', href: '/' },
        { name: 'Flashcards', href: '/flashcards' },
        { name: 'Upload', href: '/upload' },
    ];

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
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            className={`rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition ${isActive
                                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                                                    : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
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
