'use client';
import { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import { motion } from 'framer-motion';

export default function BottomPlayer() {
  const { currentTrack, isPlaying, togglePlay, closePlayer, audioRef } = useMusicPlayer();
  const { isDarkMode } = useTheme();
  
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Следим за временем аудио
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const curr = audio.currentTime;
      const dur = audio.duration;
      
      setCurrentTime(curr || 0);
      setDuration(dur || 0);
      
      // Защита от деления на ноль или NaN
      if (dur && dur > 0) {
        setProgress((curr / dur) * 100);
      } else {
        setProgress(0);
      }
    };

    // Вешаем слушатели
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', () => {}); // Можно добавить автопереключение

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', () => {});
    };
  }, [audioRef, currentTrack]);

  // Перемотка
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  };

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    // ИЗМЕНЕНИЕ 1: Z-Index поднят до 9999, чтобы плеер был поверх всего
    <div className={`fixed bottom-0 left-0 right-0 h-24 border-t backdrop-blur-2xl flex flex-col justify-center px-6 transition-all duration-300 shadow-[0_-5px_30px_rgba(0,0,0,0.3)] z-[9999]
      ${isDarkMode ? 'bg-black/90 border-zinc-800' : 'bg-white/95 border-zinc-200'}`}>
      
      {/* Progress Bar Container */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5 bg-transparent cursor-pointer group hover:h-3 transition-all z-[10000]"
        onClick={handleSeek}
      >
        {/* Фон прогресс бара (чтобы было видно трек) */}
        <div className={`w-full h-full ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
           <motion.div 
             className="h-full bg-lime-400 relative"
             style={{ width: `${progress}%` }}
             layout // Плавная анимация
             transition={{ duration: 0.1, ease: "linear" }} // Линейная анимация для плавности
           >
              {/* Ползунок */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity transform scale-150 pointer-events-none" />
           </motion.div>
        </div>
      </div>

      <div className="flex items-center justify-between w-full mt-2 relative">
          
          {/* Info */}
          <div className="flex items-center gap-4 w-1/3 min-w-0">
            <div className="w-14 h-14 bg-zinc-800 rounded-xl overflow-hidden shadow-lg border border-white/5 shrink-0">
              {currentTrack.coverUrl ? (
                  <img src={getAvatarUrl(currentTrack.coverUrl) || ''} className="w-full h-full object-cover" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-500 text-xs font-bold">MP3</div>
              )}
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{currentTrack.title}</p>
              <p className="text-xs text-zinc-500 truncate">{currentTrack.artist.name}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 shrink-0">
            <button className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer hover:scale-110 active:scale-95 p-2"><SkipBack size={24} fill="currentColor" /></button>
            <button 
              onClick={togglePlay}
              className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(163,230,53,0.4)] cursor-pointer"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1"/>}
            </button>
            <button className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer hover:scale-110 active:scale-95 p-2"><SkipForward size={24} fill="currentColor" /></button>
          </div>
          
          {/* Time & Close */}
          <div className="flex items-center justify-end gap-4 w-1/3">
             <span className="text-xs text-zinc-500 font-mono hidden sm:block w-24 text-right tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration || currentTrack.duration)}
             </span>
             
             <div className="h-6 w-px bg-zinc-700 mx-2 hidden sm:block" />

             {/* ИЗМЕНЕНИЕ 2: Кнопка закрытия вынесена в отдельный слой Z-index и увеличен хитбокс */}
             <button 
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    closePlayer();
                }}
                className={`p-2.5 rounded-full transition-colors cursor-pointer relative z-50
                    ${isDarkMode ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-black/10 text-zinc-600 hover:text-black'}`}
             >
                <X size={20} />
             </button>
          </div>
      </div>
    </div>
  );
}