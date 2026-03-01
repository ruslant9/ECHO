'use client';

import { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { Play, Pause, SkipForward, SkipBack, X, Heart, ListPlus, Volume2, VolumeX, Volume1, Maximize2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import { motion } from 'framer-motion';
import { gql, useMutation, useApolloClient } from '@apollo/client';
import { useRouter } from 'next/navigation';
import AddToPlaylistPanel from './AddToPlaylistPanel';
import Tooltip from '@/components/Tooltip';
import FullScreenPlayer from './FullScreenPlayer';
import { getAverageColor } from '@/lib/color-utils';

const TOGGLE_LIKE = gql`mutation ToggleTrackLikePlayer($trackId: Int!) { toggleTrackLike(trackId: $trackId) }`;

export default function BottomPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    buffered, // Получаем прогресс буферизации из контекста
    togglePlay, 
    closePlayer, 
    audioRef, 
    nextTrack, 
    prevTrack 
  } = useMusicPlayer();
  
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const client = useApolloClient();
  
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isPlaylistPanelOpen, setIsPlaylistPanelOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [accentColor, setAccentColor] = useState<string | null>(null);

  // Обработка переходов к артисту/альбому
  const handleArtistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentTrack?.artist?.id) {
      router.push(`/dashboard/music?artistId=${currentTrack.artist.id}`);
    }
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentTrack?.album?.id) {
      router.push(`/dashboard/music?albumId=${currentTrack.album.id}`);
    }
  };

  // Вычисление акцентного цвета обложки
  useEffect(() => {
    if (currentTrack?.coverUrl) {
      const url = getAvatarUrl(currentTrack.coverUrl);
      if (url) {
        getAverageColor(url).then(res => setAccentColor(res ? res.color : null)).catch(() => setAccentColor(null));
      }
    } else {
      setAccentColor(null);
    }
    if (currentTrack) setIsLiked(currentTrack.isLiked);
  }, [currentTrack]);

  const [toggleLikeMutation] = useMutation(TOGGLE_LIKE, {
      onCompleted: () => {
          if (currentTrack) {
              client.cache.modify({
                  id: client.cache.identify({ __typename: 'Track', id: currentTrack.id }),
                  fields: { isLiked(existing) { return !existing; } }
              });
          }
      },
      onError: () => setIsLiked(!isLiked)
  });

  const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentTrack) return;
      setIsLiked(!isLiked);
      toggleLikeMutation({ variables: { trackId: currentTrack.id } });
  };

  // Управление громкостью
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
          audioRef.current.muted = isMuted;
      }
  }, [volume, isMuted, audioRef, currentTrack]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      if (val > 0 && isMuted) setIsMuted(false);
      if (val === 0 && !isMuted) setIsMuted(true);
  };

  const toggleMute = () => {
      setIsMuted(!isMuted);
      if (isMuted && volume === 0) setVolume(0.5);
  };

  // Синхронизация времени
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      const curr = audio.currentTime;
      const dur = audio.duration;
      setCurrentTime(curr || 0);
      setDuration(dur || 0);
      if (dur && dur > 0) setProgress((curr / dur) * 100);
      else setProgress(0);
    };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [audioRef, currentTrack]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation(); 
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

  // Выбор иконки громкости
  let VolumeIcon = VolumeX;
  if (!isMuted) {
      if (volume > 0.5) VolumeIcon = Volume2;
      else if (volume > 0) VolumeIcon = Volume1;
  }

  // Стили для динамического фона
  const backgroundStyle = accentColor 
    ? { background: `linear-gradient(to right, ${accentColor}, color-mix(in srgb, ${accentColor}, black 40%))` }
    : {};

  const textColorClass = accentColor ? 'text-white' : (isDarkMode ? 'text-white' : 'text-zinc-900');
  const secondaryTextColorClass = accentColor ? 'text-white/70' : (isDarkMode ? 'text-zinc-400' : 'text-zinc-500');
  const iconColorClass = accentColor ? 'text-white/80 hover:text-white' : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black');
  const playButtonClass = accentColor 
    ? 'bg-white text-black shadow-lg' 
    : 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]';

  return (
    <>
      <AddToPlaylistPanel isOpen={isPlaylistPanelOpen} onClose={() => setIsPlaylistPanelOpen(false)} trackId={currentTrack.id} />
      
      <FullScreenPlayer 
        isOpen={isFullScreen} 
        onClose={() => setIsFullScreen(false)} 
        accentColor={accentColor} 
      />

      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed bottom-4 left-4 right-4 h-20 rounded-[24px] shadow-2xl shadow-black/30 flex flex-col justify-center z-[9999] overflow-hidden transition-colors duration-500
          ${!accentColor ? (isDarkMode ? 'bg-zinc-900' : 'bg-white') : 'bg-black'} 
          border-none`}
      >
        {/* Слой с акцентным градиентом */}
        {accentColor && (
           <div className="absolute inset-0 w-full h-full z-0" style={backgroundStyle} />
        )}
        
        <div className="relative z-10 flex flex-col justify-between h-full w-full">
            <div className="flex items-center justify-between px-4 md:px-6 pt-3 flex-1">
                
                {/* 1. Блок метаданных (Лево) */}
                <div className="flex items-center gap-3 w-1/3 min-w-0">
                    <div 
                        onClick={() => setIsFullScreen(true)}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shadow-lg border border-white/10 shrink-0 cursor-pointer hover:scale-105 transition-transform group relative bg-zinc-800"
                    >
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 size={16} className="text-white"/>
                        </div>
                        {currentTrack.coverUrl ? (
                            <img src={getAvatarUrl(currentTrack.coverUrl) || ''} className="w-full h-full object-cover" alt="cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] font-bold">MP3</div>
                        )}
                    </div>
                    
                    <div className="min-w-0 overflow-hidden pr-2">
                        <p 
                            onClick={handleTrackClick}
                            className={`font-bold text-sm truncate ${currentTrack.album?.id ? 'cursor-pointer hover:underline' : ''} ${textColorClass}`}
                        >
                            {currentTrack.title}
                        </p>
                        <p 
                            onClick={handleArtistClick}
                            className={`text-xs truncate cursor-pointer hover:underline ${secondaryTextColorClass}`}
                        >
                            {currentTrack.artist.name}
                        </p>
                    </div>
                </div>

                {/* 2. Блок управления (Центр) */}
                <div className="flex items-center justify-center gap-4 shrink-0 md:w-1/3">
                    <Tooltip content="Предыдущий трек" position="top">
                        <button 
                          onClick={(e) => { e.stopPropagation(); prevTrack(); }}
                          className={`transition-colors cursor-pointer hover:scale-110 active:scale-95 p-1 hidden sm:block ${iconColorClass}`}
                        >
                            <SkipBack size={24} fill="currentColor" />
                        </button>
                    </Tooltip>
                    
                    <Tooltip content={isPlaying ? "Пауза" : "Воспроизвести"} position="top">
                        <button onClick={togglePlay} className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer ${playButtonClass}`}>
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5"/>}
                        </button>
                    </Tooltip>
                    
                    <Tooltip content="Следующий трек" position="top">
                        <button 
                          onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                          className={`transition-colors cursor-pointer hover:scale-110 active:scale-95 p-1 hidden sm:block ${iconColorClass}`}
                        >
                            <SkipForward size={24} fill="currentColor" />
                        </button>
                    </Tooltip>
                </div>
                
                {/* 3. Доп. функции и громкость (Право) */}
                <div className="flex items-center justify-end gap-2 w-1/3">
                    <Tooltip content="Добавить в плейлист" position="top">
                        <button onClick={(e) => { e.stopPropagation(); setIsPlaylistPanelOpen(true); }} className={`p-2 rounded-full transition-colors cursor-pointer hidden md:block ${iconColorClass} hover:bg-white/10`}><ListPlus size={20} /></button>
                    </Tooltip>
                    
                    <Tooltip content={isLiked ? "Убрать лайк" : "Лайкнуть"} position="top">
                        <button onClick={handleLike} className={`p-2 rounded-full transition-colors cursor-pointer hidden sm:block hover:bg-white/10 ${isLiked ? 'text-lime-400' : iconColorClass}`}><Heart size={20} className={isLiked ? "fill-current" : ""} /></button>
                    </Tooltip>
                    
                    <div className="items-center gap-2 group hidden lg:flex">
                        <button onClick={toggleMute} className={`p-1.5 rounded-full transition-colors cursor-pointer ${iconColorClass}`}><VolumeIcon size={20} /></button>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          value={isMuted ? 0 : volume} 
                          onChange={handleVolumeChange} 
                          className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer 
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:w-3 
                            [&::-webkit-slider-thumb]:h-3 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-white" 
                          style={{ 
                            background: `linear-gradient(to right, white 0%, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)` 
                          }} 
                        />
                    </div>
                    
                    <span className={`text-xs font-mono hidden xl:block w-24 text-right tabular-nums ml-1 ${secondaryTextColorClass}`}>
                      {formatTime(currentTime)} / {formatTime(duration || currentTrack.duration)}
                    </span>
                    
                    <div className={`h-6 w-px mx-1 hidden sm:block ${accentColor ? 'bg-white/20' : 'bg-zinc-700/50'}`} />
                    
                    <button onClick={(e) => { e.stopPropagation(); closePlayer(); }} className={`p-2 rounded-full transition-colors cursor-pointer hover:bg-white/10 ${iconColorClass}`}><X size={20} /></button>
                </div>
            </div>

            {/* 4. Таймлайн с прогрессом стриминга (Buffered) */}
            <div className="w-full px-4 md:px-6 pb-2 pt-1">
                <div className="h-1.5 w-full cursor-pointer group py-0.5 relative" onClick={handleSeek}>
                    {/* Задний фон трека */}
                    <div className={`absolute inset-0 h-1 mt-0.5 rounded-full ${accentColor ? 'bg-black/20' : (isDarkMode ? 'bg-zinc-800' : 'bg-zinc-300')}`} />
                    
                    {/* ПОЛОСА ПРОГРУЗКИ (БУФЕР) */}
                    <motion.div 
                        className={`absolute inset-0 h-1 mt-0.5 rounded-full z-0 ${accentColor ? 'bg-white/20' : 'bg-lime-400/20'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${buffered}%` }}
                        transition={{ ease: "linear", duration: 0.2 }}
                    />
                    
                    {/* ПОЛОСА ВОСПРОИЗВЕДЕНИЯ */}
                    <div className="relative w-full h-1 mt-0.5 rounded-full z-10">
                        <motion.div 
                          className={`absolute top-0 left-0 h-full rounded-full ${accentColor ? 'bg-white/90' : 'bg-lime-400'}`} 
                          style={{ width: `${progress}%` }} 
                        >
                            {/* Ползунок (кругляшок) */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
      </motion.div>
    </>
  );
}