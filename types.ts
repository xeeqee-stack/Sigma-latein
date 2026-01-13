
export interface LatinWord {
  word: string;
  translation: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
  notes?: string;
}

export enum StudyMode {
  EXPLORE = 'EXPLORE',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ = 'QUIZ',
}

export interface QuizQuestion {
  word: LatinWord;
  options: string[];
  correctAnswer: string;
}

export interface AppState {
  currentCategory: string;
  mode: StudyMode;
  words: LatinWord[];
  currentIndex: number;
  score: number;
}
