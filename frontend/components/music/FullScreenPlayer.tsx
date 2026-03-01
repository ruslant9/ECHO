'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar-url';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useTheme } from '@/context/ThemeContext';

interface FullScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor?: string | null; // Принимаем цвет из нижнего плеера
}

export default function FullScreenPlayer({ isOpen, onClose, accentColor }: FullScreenPlayerProps) {
  const { currentTrack, isPlaying, togglePlay, audioRef, nextTrack, prevTrack } = useMusicPlayer();
  const { isDarkMode } = useTheme();
  
  const [progress, setProgress] = useState(0);

  // Синхронизация прогресса
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => setProgress((audio.currentTime / audio.duration) * 100);
    audio.addEventListener('timeupdate', update);
    return () => audio.removeEventListener('timeupdate', update);
  }, [audioRef, currentTrack]);

  if (!currentTrack) return null;

  // Если цвет пришел - делаем красивый градиент. Иначе - стандартный фон.
  const bgStyle = accentColor 
    ? { backgroundImage: `radial-gradient(circle at center, ${accentColor} 0%, #09090b 120%)` }
    : { backgroundColor: isDarkMode ? '#18181b' : '#f4f4f5' };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10002] flex flex-col items-center justify-center text-white overflow-hidden"
          style={bgStyle} // Применяем вычисленный стиль
        >
          {/* Темный слой поверх цвета, чтобы белый текст всегда читался */}
          {accentColor && <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />}

          {/* Кнопка закрытия */}
          <button 
              onClick={onClose} 
              className="absolute top-6 left-6 p-3 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md transition-colors cursor-pointer z-20 border border-white/10"
          >
              <X size={24} />
          </button>

          <div className="w-full max-w-md p-6 flex flex-col items-center gap-8 relative z-10 drop-shadow-xl">
              
              {/* Обложка */}
              <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="w-72 h-72 md:w-96 md:h-96 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/10"
              >
                  {currentTrack.coverUrl ? (
                      <img 
                          src={getAvatarUrl(currentTrack.coverUrl) || ''} 
                          className="w-full h-full object-cover" 
                          alt={currentTrack.title} 
                      />
                  ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-6xl">
                          {currentTrack.title[0]}
                      </div>
                  )}
              </motion.div>

              {/* Инфо о треке */}
              <div className="text-center space-y-1 w-full px-4">
                  <h2 className="text-3xl font-bold truncate drop-shadow-md">
                      {currentTrack.title} 
                  </h2>
                  <p className="text-lg opacity-70 font-medium truncate drop-shadow-md">
                      {currentTrack.artist.name}
                  </p>
              </div>

              {/* Прогресс бар */}
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div 
                      className="h-full bg-white shadow-[0_0_10px_white]" 
                      style={{ width: `${progress}%` }}
                      transition={{ ease: "linear", duration: 0.1 }}
                  />
              </div>
              
              {/* Кнопки управления */}
              <div className="flex items-center gap-8 mt-2">
                  <button onClick={prevTrack} className="p-3 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white">
                      <SkipBack size={32} fill="currentColor" />
                  </button>
                  
                  <button onClick={togglePlay} className="p-5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-xl">
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                  </button>
                  
                  <button onClick={nextTrack} className="p-3 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white">
                      <SkipForward size={32} fill="currentColor" />
                  </button>
              </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}