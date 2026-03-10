export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  language: 'Japanese' | 'English';
}

export interface UploadData {
  flashcards: Flashcard[];
}