'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';
import TrackRow from './TrackRow';

interface TrackListProps {
  tracks: any[];
  isLoading: boolean;
  emptyState: { icon: any; title: string; desc: string };
  isDarkMode: boolean;
  onLikeToggle: () => void;
  onPlay: (track: any) => void;
  onLoadMore?: () => void; // Новый проп
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

  useEffect(() => {
    if (!onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && tracks.length > 0) {
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

  if (isLoading && tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <Loader className="animate-spin text-lime-400 mb-4" size={32} />
        <p className="text-sm font-medium">Загружаем музыку...</p>
      </div>
    );
  }

  if (tracks.length === 0) {
    const Icon = emptyState.icon;
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 opacity-60 flex flex-col items-center">
        <div className={`p-6 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
          <Icon size={48} className="text-zinc-500" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold mb-1">{emptyState.title}</h3>
        <p className="text-sm font-medium text-zinc-500 max-w-xs">{emptyState.desc}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => ( // 1. Добавляем index в параметры map
    // 2. Используем комбинированный ключ
    <div key={`${track.id}-${index}`} onClick={() => onPlay(track)}>
      <TrackRow track={track} onLikeToggle={onLikeToggle} />
    </div>
  ))}

      {/* Элемент-сентинель, за которым следит Observer */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {isLoading && tracks.length > 0 && (
          <Loader className="animate-spin text-lime-400" size={24} />
        )}
      </div>
    </div>
  );
}