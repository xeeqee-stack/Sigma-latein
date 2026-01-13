
import React, { useState, useEffect } from 'react';
import { LatinWord, StudyMode } from './types';
import { fetchVocabulary } from './geminiService';
import WordCard from './components/WordCard';
import Quiz from './components/Quiz';

const STORAGE_KEY = 'vocolatin_missed_words';

const CATEGORIES = Array.from({ length: 30 }, (_, i) => ({
  id: `Lektion ${i + 1}`,
  label: `Lektion ${i + 1}`,
  icon: i % 2 === 0 ? '📜' : '🏛️'
}));

const App: React.FC = () => {
  const [currentCategory, setCurrentCategory] = useState(CATEGORIES[0].id);
  const [mode, setMode] = useState<StudyMode>(StudyMode.EXPLORE);
  const [words, setWords] = useState<LatinWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  
  // Persistence logic
  const [knownCount, setKnownCount] = useState(0);
  const [persistentMissedWords, setPersistentMissedWords] = useState<LatinWord[]>([]);
  const [isReviewSession, setIsReviewSession] = useState(false);

  // Load missed words on startup
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPersistentMissedWords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved words", e);
      }
    }
  }, []);

  // Save missed words whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentMissedWords));
  }, [persistentMissedWords]);

  useEffect(() => {
    if (!isReviewSession) {
      loadVocab();
    }
  }, [currentCategory]);

  const loadVocab = async () => {
    setLoading(true);
    const data = await fetchVocabulary(currentCategory);
    setWords(data);
    setCurrentIndex(0);
    setKnownCount(0);
    setIsReviewSession(false);
    setLoading(false);
    setShowResult(false);
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setFinalScore(knownCount);
      setShowResult(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const addToMissed = (word: LatinWord) => {
    setPersistentMissedWords(prev => {
      // Avoid duplicates
      if (prev.find(w => w.word === word.word)) return prev;
      return [...prev, word];
    });
  };

  const removeFromMissed = (word: LatinWord) => {
    setPersistentMissedWords(prev => prev.filter(w => w.word !== word.word));
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentWord = words[currentIndex];
    
    if (direction === 'left') {
      setKnownCount(prev => prev + 1);
      // If we are in review mode, remove it from the list because we now know it
      if (isReviewSession) {
        removeFromMissed(currentWord);
      }
    } else {
      // Add to persistent missed list
      addToMissed(currentWord);
    }
    
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        const finalK = direction === 'left' ? knownCount + 1 : knownCount;
        setFinalScore(finalK);
        setShowResult(true);
      }
    }, 100);
  };

  const handleQuizFinish = (score: number, missed: LatinWord[]) => {
    setFinalScore(score);
    
    // Process missed words: add new ones to list
    missed.forEach(addToMissed);
    
    // Process correct words: if we were in review mode, remove correctly answered ones
    if (isReviewSession) {
      const correctlyAnswered = words.filter(w => !missed.find(m => m.word === w.word));
      correctlyAnswered.forEach(removeFromMissed);
    }

    setShowResult(true);
  };

  const resetStudy = () => {
    setShowResult(false);
    setMode(StudyMode.EXPLORE);
    setCurrentIndex(0);
    setKnownCount(0);
    setIsReviewSession(false);
    loadVocab();
  };

  const startPersistentReview = () => {
    if (persistentMissedWords.length === 0) return;
    setWords([...persistentMissedWords]);
    setKnownCount(0);
    setCurrentIndex(0);
    setIsReviewSession(true);
    setShowResult(false);
    // Switch to flashcards if exploring, as it makes more sense for review
    if (mode === StudyMode.EXPLORE) setMode(StudyMode.FLASHCARDS);
  };

  return (
    <div className="min-h-screen bg-[#fdfcf8] pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="pt-10 pb-6 px-4 text-center border-b border-amber-50">
        <h1 className="text-5xl font-cinzel font-bold text-amber-800 tracking-tighter mb-2">VocoLatin</h1>
        <p className="text-slate-500 font-serif-classical italic">Cursus: Texte und Übungen (Ausgabe A)</p>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8">
        {/* Modus Auswahl */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner overflow-hidden">
            {Object.values(StudyMode).map((m) => (
              <button
                key={m}
                onClick={() => { 
                  setMode(m); 
                  setShowResult(false); 
                  setCurrentIndex(0); 
                  setKnownCount(0); 
                }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  mode === m ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === StudyMode.EXPLORE ? 'Erkunden' : m === StudyMode.FLASHCARDS ? 'Karteikarten' : 'Quiz'}
              </button>
            ))}
          </div>
        </div>

        {/* Lektionen Auswahl */}
        {!showResult && (
          <div className="mb-10">
            <p className="text-xs font-cinzel text-amber-600 font-bold uppercase tracking-widest text-center mb-3">Lektion oder Wiederholung</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide px-2 mask-linear-fade">
              {/* Persistent Review Button */}
              {persistentMissedWords.length > 0 && (
                <button
                  onClick={startPersistentReview}
                  className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all flex-shrink-0 ${
                    isReviewSession 
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md scale-105' 
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:border-rose-400'
                  }`}
                >
                  <span className="text-xs">🔥</span> Fehler ({persistentMissedWords.length})
                </button>
              )}

              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setIsReviewSession(false);
                    setCurrentCategory(cat.id);
                  }}
                  className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all flex-shrink-0 ${
                    currentCategory === cat.id && !isReviewSession
                    ? 'bg-amber-600 border-amber-600 text-white shadow-md scale-105' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                  }`}
                >
                  <span className="text-xs opacity-80">{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isReviewSession && !showResult && (
          <div className="mb-6 flex justify-center">
            <div className="px-4 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full uppercase tracking-widest animate-pulse border border-rose-200">
              Wiederholungs-Modus: {words.length} Wörter
            </div>
          </div>
        )}

        {/* Hauptbereich */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-cinzel tracking-widest animate-pulse">Lade Vokabeln...</p>
          </div>
        ) : showResult ? (
          <div className="max-w-md mx-auto text-center bg-white p-12 rounded-3xl shadow-2xl border border-amber-50 animate-fadeIn">
            <div className="text-6xl mb-6">{finalScore === words.length ? '🏆' : '🏛️'}</div>
            <h2 className="text-3xl font-serif-classical font-bold text-slate-800 mb-2">Bene Fecisti!</h2>
            <p className="text-slate-500 mb-8">
              {mode === StudyMode.FLASHCARDS ? 'Gekonnte Wörter:' : 'Ergebnis:'}
            </p>
            <div className="text-6xl font-cinzel font-bold text-amber-600 mb-8">
              {finalScore} / {words.length}
            </div>
            
            <div className="flex flex-col gap-3">
               {isReviewSession && finalScore < words.length && (
                 <p className="text-sm text-slate-400 italic mb-2">Die Fehler bleiben in deiner Liste für das nächste Mal.</p>
               )}
              <button 
                onClick={resetStudy}
                className="w-full py-4 bg-amber-600 text-white font-bold rounded-2xl hover:bg-amber-700 transition-colors shadow-lg"
              >
                {isReviewSession ? 'Zurück zur Lektionsauswahl' : 'Lektion neu starten'}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {words.length === 0 && isReviewSession && (
              <div className="text-center py-20">
                <p className="text-slate-400 font-cinzel">Keine gespeicherten Fehler zum Wiederholen.</p>
                <button onClick={() => setIsReviewSession(false)} className="mt-4 text-amber-600 font-bold underline">Zu den Lektionen</button>
              </div>
            )}

            {mode === StudyMode.EXPLORE && words[currentIndex] && (
              <div className="flex flex-col items-center">
                <WordCard word={words[currentIndex]} />
                <div className="flex items-center gap-8 mt-10">
                  <button 
                    disabled={currentIndex === 0}
                    onClick={handlePrev}
                    className="p-4 bg-white rounded-full shadow-lg text-slate-400 hover:text-amber-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-all border border-slate-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="font-cinzel text-slate-400 text-sm">{currentIndex + 1} / {words.length}</span>
                  <button 
                    disabled={currentIndex === words.length - 1}
                    onClick={handleNext}
                    className="p-4 bg-white rounded-full shadow-lg text-slate-400 hover:text-amber-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-all border border-slate-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {mode === StudyMode.FLASHCARDS && words[currentIndex] && (
              <div className="flex flex-col items-center">
                <div className="w-full text-center mb-6">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Fortschritt</p>
                  <div className="flex justify-center gap-2 items-center">
                    <span className="text-amber-700 font-bold">{currentIndex + 1}</span>
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-amber-500 transition-all" style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}></div>
                    </div>
                    <span className="text-slate-400">{words.length}</span>
                  </div>
                </div>
                
                <WordCard 
                  key={words[currentIndex].word}
                  word={words[currentIndex]} 
                  isFlashcard 
                  onSwipe={handleSwipe}
                />
                
                <div className="mt-12 flex flex-col items-center text-slate-400 text-sm italic gap-2">
                  <p>← Links: Gekonnt</p>
                  <p>Rechts: Wiederholen →</p>
                </div>
              </div>
            )}

            {mode === StudyMode.QUIZ && words.length > 0 && (
              <Quiz words={words} onFinish={handleQuizFinish} />
            )}
          </div>
        )}
      </main>

      <footer className="mt-20 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} VocoLatin. Ad astra per aspera.</p>
      </footer>
    </div>
  );
};

export default App;
