
import React, { useState, useEffect, useMemo } from 'react';
import { LatinWord } from '../types';

interface QuizProps {
  words: LatinWord[];
  onFinish: (score: number, missed: LatinWord[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ words, onFinish }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [missedInQuiz, setMissedInQuiz] = useState<LatinWord[]>([]);

  const currentWord = words[currentIdx];

  const options = useMemo(() => {
    if (!currentWord) return [];
    const otherWords = words.filter(w => w.word !== currentWord.word);
    const distractors = [...otherWords]
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
      .map(w => w.translation);
    return [...distractors, currentWord.translation].sort(() => 0.5 - Math.random());
  }, [currentWord, words]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    if (answer === currentWord.translation) {
      const newStreak = streak + 1;
      setScore(s => s + 1);
      setStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }
    } else {
      setStreak(0);
      setMissedInQuiz(prev => [...prev, currentWord]);
    }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 < words.length) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      onFinish(score, missedInQuiz);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-amber-50">
      <div className="mb-8 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-xs font-cinzel text-amber-600 font-bold uppercase tracking-tighter">Fortschritt</span>
          <span className="text-sm font-medium text-slate-600">{currentIdx + 1} / {words.length}</span>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex flex-col items-end">
            <span className="text-xs font-cinzel text-slate-400 font-bold uppercase tracking-tighter">Serie</span>
            <div className="flex items-center gap-1">
              {streak >= 3 && <span className="animate-bounce">🔥</span>}
              <span className={`text-sm font-bold ${streak > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                {streak}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-cinzel text-slate-400 font-bold uppercase tracking-tighter">Punkte</span>
            <span className="text-sm font-bold text-slate-700">{score}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-100 rounded-full mb-10 overflow-hidden">
        <div 
          className="h-full bg-amber-500 transition-all duration-500 ease-out"
          style={{ width: `${((currentIdx + 1) / words.length) * 100}%` }}
        ></div>
      </div>

      <div className="text-center mb-10">
        <p className="text-sm text-slate-400 uppercase tracking-widest mb-2 font-cinzel">Was bedeutet</p>
        <h2 className="text-5xl font-serif-classical font-bold text-slate-800">{currentWord.word}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt, i) => {
          let btnClass = "p-5 text-lg font-medium rounded-2xl border-2 transition-all text-left flex items-center justify-between ";
          if (isAnswered) {
            if (opt === currentWord.translation) {
              btnClass += "bg-emerald-50 border-emerald-500 text-emerald-700 ring-4 ring-emerald-100";
            } else if (opt === selectedAnswer) {
              btnClass += "bg-rose-50 border-rose-500 text-rose-700";
            } else {
              btnClass += "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
            }
          } else {
            btnClass += "bg-white border-slate-100 hover:border-amber-400 hover:bg-amber-50 text-slate-700 hover:shadow-md active:scale-95";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              disabled={isAnswered}
              className={btnClass}
            >
              <span>{opt}</span>
              {isAnswered && opt === currentWord.translation && (
                <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {isAnswered && opt === selectedAnswer && opt !== currentWord.translation && (
                <svg className="w-6 h-6 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="animate-slideInUp">
          <button
            onClick={nextQuestion}
            className="mt-10 w-full py-4 bg-amber-600 text-white font-bold rounded-2xl hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
          >
            {currentIdx + 1 === words.length ? "Quiz beenden" : "Nächste Frage"}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {streak > 0 && streak % 3 === 0 && (
            <p className="mt-4 text-center text-orange-500 font-bold animate-bounce">
              {streak} richtige Antworten in Folge! 🔥
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Quiz;
