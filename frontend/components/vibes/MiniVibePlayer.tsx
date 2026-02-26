'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Volume1 } from 'lucide-react'; // Добавили Volume1
import { motion } from 'framer-motion';

export default function MiniVibePlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1); // Состояние громкости от 0 до 1

  // Синхронизация громкости с элементом видео
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying) {
      videoRef.current?.pause();
    } else {
      videoRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMuted(!isMuted);
    // Если включаем звук, а ползунок на 0, ставим на 50%
    if (isMuted && volume === 0) {
      setVolume(0.5);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!progressContainerRef.current || !videoRef.current) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  // Логика изменения громкости при клике/перетаскивании
  const handleVolumeChange = (clientY: number) => {
    if (!volumeTrackRef.current) return;
    const rect = volumeTrackRef.current.getBoundingClientRect();
    // Вычисляем процент снизу вверх
    let newVolume = 1 - ((clientY - rect.top) / rect.height);
    newVolume = Math.max(0, Math.min(1, newVolume)); // Ограничиваем от 0 до 1
    
    setVolume(newVolume);
    
    if (newVolume > 0 && isMuted) setIsMuted(false);
    if (newVolume === 0 && !isMuted) setIsMuted(true);
  };

  const handlePointerDownVolume = (e: React.PointerEvent) => {
    e.stopPropagation();
    handleVolumeChange(e.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      handleVolumeChange(moveEvent.clientY);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Выбор правильной иконки громкости
  let VolumeIcon = VolumeX;
  if (!isMuted) {
    if (volume > 0.5) VolumeIcon = Volume2;
    else if (volume > 0) VolumeIcon = Volume1;
  }

  return (
    <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-2xl overflow-hidden group shadow-2xl border border-white/10 my-2">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover pointer-events-none"
        loop
        muted={isMuted}
        playsInline
        disablePictureInPicture
        onTimeUpdate={() => {
          if (videoRef.current) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
          }
        }}
      />

      {/* Прозрачный щит для кликов: ловит события вместо видео */}
      <div 
        className="absolute inset-0 z-0 cursor-pointer" 
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Оверлей управления */}
      <div className="absolute inset-0 z-10 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
        
        <div className="flex items-center gap-3 w-full pointer-events-auto">
          {/* Play/Pause */}
          <button 
            onClick={togglePlay} 
            className="p-2.5 bg-lime-400 text-black rounded-full hover:scale-110 transition-transform cursor-pointer shrink-0"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          
          {/* Прогресс */}
          <div 
            ref={progressContainerRef}
            onClick={handleSeek}
            className="flex-1 h-4 flex items-center cursor-pointer group/progress"
          >
            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm relative">
              <motion.div 
                className="h-full bg-lime-400" 
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear", duration: 0.1 }}
              />
            </div>
          </div>

          {/* КОНТЕЙНЕР ГРОМКОСТИ С ПОЛЗУНКОМ */}
          <div className="relative flex items-center justify-center group/volume">
            
            {/* Всплывающий ползунок */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 opacity-0 invisible group-hover/volume:opacity-100 group-hover/volume:visible transition-all duration-200 z-50">
              <div className="w-9 h-28 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center py-3 shadow-xl">
                {/* Зона перетаскивания */}
                <div 
                  ref={volumeTrackRef}
                  onPointerDown={handlePointerDownVolume}
                  className="w-full h-full flex items-center justify-center cursor-pointer touch-none"
                >
                  {/* Фоновая полоса */}
                  <div className="w-1.5 h-full bg-white/30 rounded-full relative overflow-hidden pointer-events-none">
                    {/* Заполнение */}
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-lime-400 rounded-full transition-all duration-75"
                      style={{ height: `${isMuted ? 0 : volume * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Звук Кнопка */}
            <button 
              onClick={toggleMute} 
              className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all cursor-pointer shrink-0"
            >
              <VolumeIcon size={18} />
            </button>
          </div>

        </div>
      </div>

      {/* Индикатор паузы по центру */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:hidden z-20">
          <div className="p-4 bg-black/20 backdrop-blur-sm rounded-full border border-white/20">
            <Play size={32} className="text-white fill-current opacity-80" />
          </div>
        </div>
      )}
    </div>
  );
}