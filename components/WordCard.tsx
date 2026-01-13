
import React, { useState, useEffect, useRef } from 'react';
import { LatinWord } from '../types';
import { generateWordImage, speakLatin } from '../geminiService';

interface WordCardProps {
  word: LatinWord;
  isFlashcard?: boolean;
  onSwipe?: (direction: 'left' | 'right') => void;
}

const WordCard: React.FC<WordCardProps> = ({ word, isFlashcard = false, onSwipe }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  
  // Swipe State
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchImage = async () => {
      setLoadingImage(true);
      const img = await generateWordImage(`${word.word} (${word.translation})`);
      setImageUrl(img);
      setLoadingImage(false);
    };
    fetchImage();
    setIsFlipped(false);
    setDragOffset({ x: 0, y: 0 });
    setIsAnimating(false);
  }, [word]);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    speakLatin(word.word);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isFlashcard || isAnimating) return;
    setDragStart({ x: e.clientX, y: e.clientY });
    if (cardRef.current) {
      cardRef.current.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart || isAnimating) return;
    const dx = e.clientX - dragStart.x;
    setDragOffset({ x: dx, y: 0 });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart || isAnimating) return;
    const threshold = 120;
    
    if (dragOffset.x > threshold) {
      // Swipe Rechts -> Nicht gekonnt
      handleSwipe('right');
    } else if (dragOffset.x < -threshold) {
      // Swipe Links -> Gekonnt
      handleSwipe('left');
    } else {
      // Zurücksetzen
      setDragOffset({ x: 0, y: 0 });
    }
    setDragStart(null);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    setIsAnimating(true);
    const finalX = direction === 'right' ? 1000 : -1000;
    setDragOffset({ x: finalX, y: 0 });
    
    setTimeout(() => {
      if (onSwipe) onSwipe(direction);
    }, 300);
  };

  const rotation = dragOffset.x / 20;
  const opacity = Math.min(Math.abs(dragOffset.x) / 100, 1);
  const swipeLabel = dragOffset.x < 0 ? 'GEKONNT' : 'WIEDERHOLEN';
  const labelColor = dragOffset.x < 0 ? 'text-emerald-500 border-emerald-500' : 'text-rose-500 border-rose-500';

  const content = (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-100">
      <div className="relative h-64 bg-slate-200 overflow-hidden">
        {loadingImage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse">
            <span className="text-slate-400 font-cinzel">Visualisiere...</span>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={word.word} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <span className="text-slate-400 font-cinzel">Kein Bild</span>
          </div>
        )}
        <div className="absolute bottom-4 right-4">
          <button 
            onClick={handleSpeak}
            className="p-3 bg-white/90 hover:bg-white rounded-full shadow-lg text-amber-700 transition-all hover:scale-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-8 flex flex-col flex-grow text-center">
        <span className="text-sm font-bold text-amber-600 tracking-widest uppercase mb-2 font-cinzel">{word.partOfSpeech}</span>
        <h2 className="text-4xl font-serif-classical font-bold text-slate-800 mb-4">{word.word}</h2>
        
        {!isFlashcard || isFlipped ? (
          <div className="mt-auto animate-fadeIn">
            <p className="text-2xl text-slate-600 mb-6 italic font-serif-classical">{word.translation}</p>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
              <p className="text-slate-700 font-medium mb-1">{word.exampleSentence}</p>
              <p className="text-slate-500 text-sm italic">{word.exampleTranslation}</p>
            </div>
          </div>
        ) : (
          <div className="mt-auto py-12">
            <p className="text-slate-400 text-sm uppercase tracking-tighter">Zum Aufdecken tippen</p>
          </div>
        )}
      </div>
    </div>
  );

  const cardStyle: React.CSSProperties = {
    transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotation}deg)`,
    transition: isAnimating ? 'transform 0.3s ease-out' : dragStart ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    touchAction: 'none'
  };

  if (isFlashcard) {
    return (
      <div 
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={cardStyle}
        className={`relative w-full max-w-md mx-auto aspect-[3/4] cursor-grab active:cursor-grabbing perspective-1000 ${isFlipped ? 'flashcard-flipped' : ''}`}
      >
        {/* Swipe Feedback Labels */}
        {Math.abs(dragOffset.x) > 20 && (
          <div 
            className={`absolute top-10 ${dragOffset.x < 0 ? 'right-10' : 'left-10'} z-50 border-4 ${labelColor} px-4 py-2 rounded-lg font-black text-3xl rotate-[-15deg] pointer-events-none`}
            style={{ opacity }}
          >
            {swipeLabel}
          </div>
        )}

        <div className="flashcard-inner relative w-full h-full">
          <div className="flashcard-front absolute inset-0" onClick={() => !dragStart && setIsFlipped(true)}>
             <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-100 items-center justify-center p-8">
                <span className="text-sm font-bold text-amber-600 tracking-widest uppercase mb-6 font-cinzel">Vocabulum</span>
                <h2 className="text-5xl font-serif-classical font-bold text-slate-800 text-center">{word.word}</h2>
                <div className="mt-12">
                  <button onClick={handleSpeak} className="p-4 bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-auto text-slate-400 text-xs uppercase tracking-widest">Tippen oder Swipen</p>
             </div>
          </div>
          <div className="flashcard-back absolute inset-0" onClick={() => !dragStart && setIsFlipped(false)}>
             {content}
          </div>
        </div>
      </div>
    );
  }

  return <div className="w-full max-w-md mx-auto aspect-[3/4]">{content}</div>;
};

export default WordCard;
