'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader, Lock, Globe, Volume2, VolumeX, Play, Scissors, CheckCircle } from 'lucide-react';
import { gql, useMutation } from '@apollo/client';
import Cookies from 'js-cookie';
import LiquidGlassModal from '../LiquidGlassModal';
import { useTheme } from '@/context/ThemeContext';
import Tooltip from '../Tooltip';
import { useRouter } from 'next/navigation'; // Импорт роутера
import { motion, AnimatePresence } from 'framer-motion';

const CREATE_VIBE = gql`
  mutation CreateVibe($videoUrl: String!, $description: String, $hashtags: [String!]!, $isPrivate: Boolean!) {
    createVibe(videoUrl: $videoUrl, description: $description, hashtags: $hashtags, isPrivate: $isPrivate)
  }
`;

type UploadStatus = 'idle' | 'uploading' | 'success';

export default function UploadVibeModal({ isOpen, onClose, onSuccess }: any) {
  const { isDarkMode } = useTheme();
  const router = useRouter(); // Инициализация роутера
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Новое состояние статуса
  const [status, setStatus] = useState<UploadStatus>('idle');

  // Состояния для редактора
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const [createVibe] = useMutation(CREATE_VIBE);

  const resetState = () => {
    setVideoFile(null);
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(null);
    setDescription('');
    setHashtags('');
    setIsPrivate(false);
    setStatus('idle'); // Сброс статуса
    setStartTime(0);
    setEndTime(0);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
      if (videoFile) {
          const url = URL.createObjectURL(videoFile);
          setVideoSrc(url);
          setStartTime(0);
          setEndTime(0);
          return () => URL.revokeObjectURL(url);
      }
  }, [videoFile]);

  const handleLoadedMetadata = () => {
      if (videoRef.current) {
          const dur = videoRef.current.duration;
          setDuration(dur);
          setEndTime(dur);
      }
  };

  const safePlay = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn("Playback interrupted", err);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
      if (videoRef.current) {
          const curr = videoRef.current.currentTime;
          setCurrentTime(curr);
          if (endTime > 0 && curr >= endTime) {
              videoRef.current.currentTime = startTime;
              if (!videoRef.current.paused) {
                 safePlay(); 
              }
          }
      }
  };

  const togglePlay = async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!videoRef.current) return;

      if (videoRef.current.paused) {
          await safePlay();
      } else {
          videoRef.current.pause();
          setIsPlaying(false);
      }
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
      if (!timelineRef.current || !videoRef.current || isDragging) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percent * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
  };

  const handleDragStart = (type: 'start' | 'end') => (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(type);
  };

  const handleRemoveVideo = (e: React.MouseEvent) => {
      e.stopPropagation();
      resetState();
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging || !timelineRef.current) return;
          const rect = timelineRef.current.getBoundingClientRect();
          const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const newTime = pos * duration;

          if (isDragging === 'start') {
              setStartTime(Math.min(newTime, endTime - 1)); 
          } else {
              setEndTime(Math.max(newTime, startTime + 1));
          }
      };

      const handleMouseUp = () => {
          if (isDragging && videoRef.current) {
             videoRef.current.currentTime = startTime;
          }
          setIsDragging(null);
      };

      if (isDragging) {
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging, duration, startTime, endTime]);


  const handleUpload = async () => {
    if (!videoFile) return;
    setStatus('uploading'); // Включаем режим загрузки

    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      
      const token = Cookies.get('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}/upload/video`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (!res.ok) throw new Error('Ошибка загрузки видео');
      const { url } = await res.json();
      const tagsArray = hashtags.split(' ').map(t => t.trim().replace('#', '')).filter(t => t.length > 0);

      // Вызов мутации
      const { data } = await createVibe({
        variables: { videoUrl: url, description, hashtags: tagsArray, isPrivate }
      });

      // Успех!
      setStatus('success');
      const newVibeId = data.createVibe; // Теперь это ID (Int)

      // Задержка перед закрытием и редиректом
      setTimeout(() => {
        onSuccess();
        onClose();
        // Переход к новому вайбу
        router.push(`/dashboard/vibes?vibeId=${newVibeId}`);
      }, 1500);

    } catch (e) {
      alert('Ошибка публикации');
      setStatus('idle');
    }
  };

  const formatTime = (time: number) => {
      if (!Number.isFinite(time)) return "0:00";
      const m = Math.floor(time / 60);
      const s = Math.floor(time % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={status === 'idle' ? onClose : () => {}} maxWidth="max-w-xl">
      
      {/* ОВЕРЛЕЙ ЗАГРУЗКИ / УСПЕХА */}
      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            {status === 'uploading' && (
              <div className="flex flex-col items-center gap-4">
                {/* Крутящийся лоадер */}
                <div className="relative w-20 h-20">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full border-4 border-white/20 border-t-lime-400 rounded-full"
                  />
                </div>
                <p className="text-white font-bold text-lg animate-pulse">Публикуем вайб...</p>
              </div>
            )}

            {status === 'success' && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-24 h-24 bg-lime-400 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(163,230,53,0.6)]">
                  <CheckCircle size={48} className="text-black" />
                </div>
                <p className="text-white font-bold text-2xl">Готово!</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 border-b border-white/10 flex justify-between items-center">
        <h2 className="font-bold text-xl">Опубликовать Вайб</h2>
        <Tooltip content="Закрыть" position="bottom">
            <button onClick={onClose} disabled={status !== 'idle'} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-0"><X size={20}/></button>
        </Tooltip>
      </div>

      <div className="p-6 space-y-6">
        {!videoSrc ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-64 border-2 border-dashed border-zinc-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-lime-400 transition-colors bg-black/20 group"
          >
            <Upload size={40} className="mb-4 text-zinc-400 group-hover:text-lime-400 transition-colors" />
            <span className="font-bold text-zinc-300 group-hover:text-white transition-colors">Выберите видео (mp4, webm)</span>
            <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
          </div>
        ) : (
          <div className="space-y-4">
              <div className="relative h-80 bg-black rounded-2xl overflow-hidden group border border-white/10 flex justify-center cursor-pointer" onClick={togglePlay}>
                 <video 
                    ref={videoRef}
                    src={videoSrc} 
                    className="h-full object-contain cursor-pointer" 
                    muted={isMuted}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                 />
                 
                 <div className="absolute top-2 right-2 z-20">
                    <Tooltip content="Удалить видео" position="left">
                        <button 
                            onClick={handleRemoveVideo} 
                            className="bg-black/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors cursor-pointer"
                        >
                            <X size={16}/>
                        </button>
                    </Tooltip>
                 </div>
                 
                 {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]">
                        <div className="bg-black/60 p-4 rounded-full backdrop-blur-md shadow-xl border border-white/10">
                            <Play size={32} className="fill-white text-white ml-1" />
                        </div>
                    </div>
                 )}

                 <div className="absolute bottom-4 right-4 z-20">
                     <Tooltip content={isMuted ? "Включить звук" : "Выключить звук"} position="top">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                            className="p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-md cursor-pointer"
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                     </Tooltip>
                 </div>
              </div>

              {/* TIMELINE */}
              <div className="bg-black/20 p-4 rounded-xl border border-white/10 select-none">
                  <div className="flex justify-between text-xs text-zinc-400 mb-2 font-mono">
                      <span>{formatTime(startTime)}</span>
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(endTime)}</span>
                  </div>

                  <div 
                    ref={timelineRef}
                    className="relative h-12 bg-zinc-800 rounded-lg cursor-pointer group/timeline mx-3"
                    onMouseDown={handleTimelineClick}
                  >
                      <div className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none z-0 rounded-l-lg" style={{ width: `${(startTime / duration) * 100}%` }} />
                      <div className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none z-0 rounded-r-lg" style={{ width: `${100 - (endTime / duration) * 100}%` }} />

                      <div 
                        className="absolute top-0 bottom-0 bg-lime-400/20 border-y border-lime-400/30 pointer-events-none z-0"
                        style={{ 
                            left: `${(startTime / duration) * 100}%`, 
                            right: `${100 - (endTime / duration) * 100}%` 
                        }}
                      />

                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-0 pointer-events-none transition-all duration-75 ease-linear"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                      />

                      <div 
                        className="absolute top-0 bottom-0 w-4 bg-lime-500 cursor-ew-resize flex items-center justify-center z-20 hover:bg-lime-400 transition-colors rounded-l-md shadow-md"
                        style={{ left: `${(startTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
                        onMouseDown={handleDragStart('start')}
                      >
                         <div className="w-1 h-4 bg-black/30 rounded-full" />
                      </div>

                      <div 
                        className="absolute top-0 bottom-0 w-4 bg-lime-500 cursor-ew-resize flex items-center justify-center z-20 hover:bg-lime-400 transition-colors rounded-r-md shadow-md"
                        style={{ left: `${(endTime / duration) * 100}%`, transform: 'translateX(-50%)' }} 
                        onMouseDown={handleDragStart('end')}
                      >
                         <div className="w-1 h-4 bg-black/30 rounded-full" />
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 text-xs text-zinc-500">
                      <Scissors size={12} />
                      <span>Перетащите края, чтобы обрезать видео (визуально)</span>
                  </div>
              </div>
          </div>
        )}

        <div className="space-y-4">
            <textarea 
                placeholder="Описание..." 
                value={description} onChange={e => setDescription(e.target.value)}
                className="w-full p-4 rounded-xl bg-black/20 border border-white/10 outline-none focus:border-lime-400 transition-colors text-white resize-none" rows={2}
            />
            <input 
                placeholder="#хештеги через пробел" 
                value={hashtags} onChange={e => setHashtags(e.target.value)}
                className="w-full p-4 rounded-xl bg-black/20 border border-white/10 outline-none focus:border-lime-400 transition-colors text-white"
            />

            <div className="flex w-full gap-2">
                <Tooltip content="Видно всем пользователям" position="top" className="flex-1">
                    <button onClick={() => setIsPrivate(false)} className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${!isPrivate ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'}`}>
                        <Globe size={18}/> Для всех
                    </button>
                </Tooltip>
                
                <Tooltip content="Видно только вам" position="top" className="flex-1">
                    <button onClick={() => setIsPrivate(true)} className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${isPrivate ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'}`}>
                        <Lock size={18}/> Приватно
                    </button>
                </Tooltip>
            </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/10">
        <button onClick={handleUpload} disabled={status !== 'idle' || !videoFile} className="w-full py-4 bg-lime-400 text-black rounded-xl font-bold text-lg hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all active:scale-95 cursor-pointer">
          {status === 'idle' ? 'Опубликовать' : 'Обработка...'}
        </button>
      </div>
    </LiquidGlassModal>
  );
}