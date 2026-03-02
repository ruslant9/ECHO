'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, Music } from 'lucide-react';
import TrackRow from './TrackRow';

interface TrackListProps {
  tracks: any[];
  isLoading: boolean;
  emptyState: { icon: any; title: string; desc: string };
  isDarkMode: boolean;
  onLikeToggle: () => void;
  onPlay: (track: any) => void;
  onLoadMore?: () => void; // Функция для подгрузки данных
}

export default function TrackList({ 
  tracks, 
  isLoading, 
  emptyState, 
  isDarkMode, 
  onLikeToggle, 
  onPlay,
  onLoadMore 
}: TrackListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Логика Infinite Scroll (Observer)
  useEffect(() => {
    if (!onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Срабатывает только если элемент виден, нет текущей загрузки и есть что грузить
        if (entries[0].isIntersecting && !isLoading && tracks.length >= 20) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, isLoading, tracks.length]);

  // 1. Состояние первой загрузки (когда список пуст и идет LOADING)
  if (isLoading && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 opacity-50">
        <Loader className="animate-spin text-lime-400 mb-4" size={40} />
        <p className="text-sm font-bold tracking-widest uppercase">Загрузка медиатеки...</p>
      </div>
    );
  }

  // 2. Состояние, когда загрузка завершена, но треков нет
  if (!isLoading && tracks.length === 0) {
    const Icon = emptyState.icon || Music;
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center py-20 opacity-60 flex flex-col items-center"
      >
        <div className={`p-6 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
          <Icon size={48} className="text-zinc-500" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold mb-1">{emptyState.title}</h3>
        <p className="text-sm font-medium text-zinc-500 max-w-xs">{emptyState.desc}</p>
      </motion.div>
    );
  }

  // 3. Основной список треков
  return (
    <div className="flex flex-col space-y-1 pb-10">
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <motion.div 
            key={`${track.id}-${index}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }} // Плавное появление первых треков
            onClick={() => onPlay(track)}
          >
            <TrackRow track={track} onLikeToggle={onLikeToggle} />
          </motion.div>
        ))}
      </div>

      {/* Элемент-сентинель и индикатор подгрузки */}
      <div 
        ref={loadMoreRef} 
        className="h-24 flex flex-col items-center justify-center transition-all"
      >
        <AnimatePresence>
          {isLoading && tracks.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-3 px-6 py-3 rounded-full bg-lime-400/10 border border-lime-400/20"
            >
              <Loader className="animate-spin text-lime-500" size={20} />
              <span className="text-xs font-black text-lime-500 uppercase tracking-tighter">
                Подгружаем еще...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && tracks.length > 0 && tracks.length % 20 !== 0 && (
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest opacity-30 mt-4">
                Это все результаты
            </div>
        )}
      </div>
    </div>
  );
}