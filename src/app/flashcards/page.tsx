'use client';
import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import FlashcardCard from '../../components/FlashcardCard';
import SpeakingPracticeModal from '../../components/SpeakingPracticeModal';

interface Flashcard {
    id: string;
    front: string;
    back: string;
    category?: string;
}

const extractReading = (back: string) => {
    const match = back.match(/\((.*?)\)/);
    return match ? match[1] : back;
};

const extractKanji = (back: string) => {
    return back.split('(')[0].trim();
};

const FlashcardsPage = () => {
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q') || '';
    const categoriesParam = searchParams.get('categories') || '';
    const [studyMode, setStudyMode] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [quizOptions, setQuizOptions] = useState<string[]>([]);
    const [mobileCardIndex, setMobileCardIndex] = useState(0);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Selection state
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showSpeakingModal, setShowSpeakingModal] = useState(false);

    const selectedCategories = categoriesParam
        ? new Set(categoriesParam.split(','))
        : null;

    const filteredFlashcards = flashcards.filter((card) => {
        // Category filter
        if (selectedCategories && !selectedCategories.has(card.category || '')) {
            return false;
        }
        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const kanji = extractKanji(card.back).toLowerCase();
            const reading = extractReading(card.back).toLowerCase();
            return card.front.toLowerCase().includes(q) || kanji.includes(q) || reading.includes(q);
        }
        return true;
    });

    // Minimum swipe distance (in px)
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe) {
            nextMobileCard();
        }
        if (isRightSwipe) {
            prevMobileCard();
        }
    };

    useEffect(() => {
        const fetchFlashcards = async () => {
            try {
                const response = await fetch('/api/flashcards');
                const data = await response.json();
                setFlashcards(data);
            } catch (error) {
                console.error('Failed to fetch flashcards', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFlashcards();
    }, []);

    // Reset indices when search query or categories change
    useEffect(() => {
        setCurrentIndex(0);
        setMobileCardIndex(0);
    }, [searchQuery, categoriesParam]);

    const generateOptions = () => {
        const currentCard = filteredFlashcards[currentIndex];
        if (!currentCard) return;
        const correctReading = extractReading(currentCard.back);

        const otherReadings = filteredFlashcards
            .filter((_, idx) => idx !== currentIndex)
            .map(card => extractReading(card.back))
            .filter((reading, index, self) => reading !== correctReading && self.indexOf(reading) === index);

        const distractors = otherReadings
            .sort(() => Math.random() - 0.5)
            .slice(0, 2);

        while (distractors.length < 2) {
            distractors.push('---');
        }

        const options = [correctReading, ...distractors].sort(() => Math.random() - 0.5);
        setQuizOptions(options);
        setSelectedOption(null);
    };

    // Generate quiz options when the card changes
    useEffect(() => {
        if (filteredFlashcards.length > 0 && studyMode) {
            generateOptions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, studyMode, searchQuery, flashcards]);

    const nextCard = () => {
        setCurrentIndex((prev) => (prev + 1) % filteredFlashcards.length);
    };

    const prevCard = () => {
        setCurrentIndex((prev) => (prev - 1 + filteredFlashcards.length) % filteredFlashcards.length);
    };

    const handleOptionSelect = (option: string) => {
        setSelectedOption(option);
    };

    const nextMobileCard = () => {
        setMobileCardIndex((prev) => (prev + 1) % filteredFlashcards.length);
    };

    const prevMobileCard = () => {
        setMobileCardIndex((prev) => (prev - 1 + filteredFlashcards.length) % filteredFlashcards.length);
    };

    const clearAllFlashcards = async () => {
        if (!confirm('Are you sure you want to clear all flashcards? This cannot be undone.')) return;

        try {
            const response = await fetch('/api/flashcards', { method: 'DELETE' });
            if (response.ok) {
                setFlashcards([]);
                setStudyMode(false);
                setSelectMode(false);
                setSelectedIds(new Set());
            } else {
                console.error('Failed to clear flashcards');
            }
        } catch (error) {
            console.error('Error clearing flashcards:', error);
        }
    };

    const handleCardSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleSelectAll = () => {
        if (selectedIds.size === filteredFlashcards.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredFlashcards.map((c) => c.id)));
        }
    };

    const toggleSelectMode = () => {
        if (selectMode) {
            setSelectedIds(new Set());
        }
        setSelectMode(!selectMode);
        if (studyMode) setStudyMode(false);
    };

    const handlePracticeSpeaking = () => {
        if (selectedIds.size > 0) {
            setShowSpeakingModal(true);
        }
    };

    const handleCloseSpeakingModal = () => {
        setShowSpeakingModal(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-zinc-500 dark:text-zinc-400 animate-pulse text-base">Loading your study cards...</div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">My Flashcards</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                        {selectMode && selectedIds.size > 0
                            ? `${selectedIds.size} card${selectedIds.size !== 1 ? 's' : ''} selected`
                            : searchQuery
                                ? `${filteredFlashcards.length} of ${flashcards.length} cards`
                                : `${flashcards.length} cards available for study`}
                        {selectedCategories && (
                            <span className="text-zinc-400 dark:text-zinc-500">
                                {' | '}{filteredFlashcards.length} selected
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {flashcards.length > 0 && (
                        <>
                            <button
                                onClick={clearAllFlashcards}
                                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 ring-1 ring-zinc-300 dark:ring-zinc-700 transition hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={toggleSelectMode}
                                className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 ${selectMode
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/20'
                                    : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:ring-zinc-900/20'
                                }`}
                            >
                                {selectMode ? 'Cancel Select' : 'Select Cards'}
                            </button>
                        </>
                    )}
                    {!selectMode && (
                        <button
                            onClick={() => setStudyMode(!studyMode)}
                            className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 ${studyMode
                                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:ring-zinc-900/20'
                                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:ring-zinc-900/20'
                            }`}
                        >
                            {studyMode ? 'Exit Study Mode' : 'Enter Study Mode'}
                        </button>
                    )}
                </div>
            </div>

            {/* Select mode toolbar */}
            {selectMode && filteredFlashcards.length > 0 && (
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 ring-1 ring-zinc-200 dark:ring-zinc-700">
                    <button
                        onClick={handleSelectAll}
                        className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                    >
                        {selectedIds.size === filteredFlashcards.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                        onClick={handlePracticeSpeaking}
                        disabled={selectedIds.size === 0}
                        className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${selectedIds.size > 0
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/20'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Practice Speaking{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                    </button>
                </div>
            )}

            {filteredFlashcards.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    <p className="text-zinc-500 dark:text-zinc-400 text-base">
                        {searchQuery
                            ? `No cards match "${searchQuery}".`
                            : 'No flashcards found. Upload some vocabulary first!'}
                    </p>
                </div>
            ) : studyMode ? (
                <div className="flex flex-col items-center gap-8 py-10">
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-full">
                        Card {currentIndex + 1} of {filteredFlashcards.length}
                    </div>

                    <div className="w-full max-w-lg">
                        <FlashcardCard
                            flashcard={{
                                ...filteredFlashcards[currentIndex],
                                front: extractKanji(filteredFlashcards[currentIndex].back),
                                back: filteredFlashcards[currentIndex].front,
                            }}
                            quizOptions={quizOptions}
                            selectedOption={selectedOption}
                            onOptionSelect={handleOptionSelect}
                            correctReading={extractReading(filteredFlashcards[currentIndex].back)}
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full max-w-lg">
                        <button
                            onClick={prevCard}
                            className="flex-1 inline-flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-300 dark:ring-zinc-700 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                        >
                            Previous
                        </button>
                        <button
                            onClick={nextCard}
                            className="flex-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-5 py-3 text-sm font-medium text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                        >
                            Next
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mobile Carousel View */}
                    <div className="block sm:hidden">
                        <div
                            className="flex flex-col items-center gap-6 py-4"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-full">
                                Card {mobileCardIndex + 1} of {filteredFlashcards.length}
                            </div>

                            <div className="w-full max-w-lg px-4 animate-[fadeIn_0.3s_ease-in-out]">
                                <FlashcardCard
                                    key={filteredFlashcards[mobileCardIndex].id}
                                    flashcard={{
                                        ...filteredFlashcards[mobileCardIndex],
                                        front: extractKanji(filteredFlashcards[mobileCardIndex].back),
                                        back: filteredFlashcards[mobileCardIndex].front,
                                    }}
                                    correctReading={extractReading(filteredFlashcards[mobileCardIndex].back)}
                                    selectable={selectMode}
                                    selected={selectedIds.has(filteredFlashcards[mobileCardIndex].id)}
                                    onSelect={handleCardSelect}
                                />
                            </div>

                            {/* Pagination dots */}
                            {filteredFlashcards.length > 1 && (
                                <div className="flex items-center justify-center gap-2">
                                    {filteredFlashcards.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setMobileCardIndex(index)}
                                            className={`h-2 rounded-full transition-all ${index === mobileCardIndex
                                                ? 'w-6 bg-zinc-900 dark:bg-zinc-100'
                                                : 'w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600'
                                                }`}
                                            aria-label={`Go to card ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-4 w-full max-w-lg px-4">
                                <button
                                    onClick={prevMobileCard}
                                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-300 dark:ring-zinc-700 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                                >
                                    ← Previous
                                </button>
                                <button
                                    onClick={nextMobileCard}
                                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 px-5 py-3 text-sm font-medium text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Grid View */}
                    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFlashcards.map((flashcard) => (
                            <FlashcardCard
                                key={flashcard.id}
                                flashcard={{
                                    ...flashcard,
                                    front: extractKanji(flashcard.back),
                                    back: flashcard.front,
                                }}
                                correctReading={extractReading(flashcard.back)}
                                selectable={selectMode}
                                selected={selectedIds.has(flashcard.id)}
                                onSelect={handleCardSelect}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Floating practice button for mobile when cards are selected */}
            {selectMode && selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-0 right-0 flex justify-center sm:hidden z-40">
                    <button
                        onClick={handlePracticeSpeaking}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-6 py-3.5 text-sm font-medium shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                        Practice Speaking ({selectedIds.size})
                    </button>
                </div>
            )}

            {/* Speaking Practice Modal */}
            {showSpeakingModal && (
                <SpeakingPracticeModal
                    flashcardIds={Array.from(selectedIds)}
                    onClose={handleCloseSpeakingModal}
                />
            )}
        </div>
    );
};

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-zinc-500 dark:text-zinc-400 animate-pulse text-base">Loading your study cards...</div>
            </div>
        }>
            <FlashcardsPage />
        </Suspense>
    );
}
