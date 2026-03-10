import React, { useState } from 'react';

interface FlashcardProps {
  flashcard: {
    id: string;
    front: string;
    back: string;
    category?: string | null;
  };
  quizOptions?: string[];
  selectedOption?: string | null;
  onOptionSelect?: (option: string) => void;
  correctReading?: string;
}

const FlashcardCard: React.FC<FlashcardProps> = ({
  flashcard,
  quizOptions,
  selectedOption,
  onOptionSelect,
  correctReading
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    if (!quizOptions) {
      setIsFlipped(!isFlipped);
    }
  };

  const handleOptionClick = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    if (onOptionSelect && !selectedOption) {
      onOptionSelect(option);
      setTimeout(() => setIsFlipped(true), 600);
    }
  };

  // Reset flip state when card content changes (in study mode)
  React.useEffect(() => {
    setIsFlipped(false);
  }, [flashcard.id]);

  return (
    <div
      className="group cursor-pointer perspective-1000 w-full min-h-[18rem] transition-all duration-300"
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-full min-h-[18rem] transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
          }`}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 rounded-2xl shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-800 p-6 flex flex-col items-center justify-center text-center">
          <div className="flex-1 flex flex-col items-center justify-center w-full">
            {/* Kana reading above kanji */}
            {correctReading && (
              <div className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 font-medium mb-2">
                {correctReading}
              </div>
            )}

            {/* Kanji */}
            <h2 className="text-4xl sm:text-5xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {flashcard.front}
            </h2>

            {quizOptions && (
              <div className="grid grid-cols-1 gap-3 w-full max-w-xs mt-6">
                {quizOptions.map((option) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === correctReading;

                  let buttonStyles = "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-200 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700";
                  if (isSelected) {
                    buttonStyles = isCorrect
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500"
                      : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-2 ring-red-500";
                  } else if (selectedOption && isCorrect) {
                    buttonStyles = "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500 opacity-80";
                  }

                  return (
                    <button
                      key={option}
                      disabled={!!selectedOption}
                      onClick={(e) => handleOptionClick(e, option)}
                      className={`w-full py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${buttonStyles} ${selectedOption && !isCorrect && !isSelected ? 'opacity-40' : ''}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {!quizOptions && !correctReading && flashcard.category && (
              <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-3">
                {flashcard.category}
              </span>
            )}
          </div>

          <div className="mt-4 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
            {quizOptions ? 'Choose the correct reading' : 'Click to reveal meaning'}
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden bg-zinc-900 dark:bg-zinc-100 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center rotate-y-180">
          <div className="flex-1 flex flex-col items-center justify-center">
            <h2 className="text-xl sm:text-2xl font-medium text-white dark:text-zinc-900 tracking-tight leading-relaxed">
              {flashcard.back}
            </h2>
          </div>
          <div className="mt-6 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">
            English Meaning
          </div>
        </div>
      </div>
    </div>
  );
};



export default FlashcardCard;
