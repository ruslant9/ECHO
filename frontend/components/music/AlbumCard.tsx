'use client';

import { Play } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar-url';
import Tooltip from '@/components/Tooltip';
import { useTheme } from '@/context/ThemeContext';

interface AlbumCardProps {
  album: any;
  onClick: (id: number) => void;
}

export default function AlbumCard({ album, onClick }: AlbumCardProps) {
  const { isDarkMode } = useTheme();

  const formattedDate = album.releaseDate 
    ? new Date(album.releaseDate).toLocaleDateString('ru-RU', { year: 'numeric' })
    : album.year;

  // Если в альбоме 1 трек (или меньше), считаем его синглом
  const isSingle = album.tracks && album.tracks.length < 2;

  return (
    <div 
      className="group cursor-pointer w-full"
      onClick={() => onClick(album.id)}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden mb-2 bg-zinc-800 shadow-lg border border-white/5">
        {album.coverUrl ? (
          <img 
            src={getAvatarUrl(album.coverUrl) || ''} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            alt={album.title} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800 font-bold text-xl">
             {album.title[0]}
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
           <Tooltip content={isSingle ? "Перейти к синглу" : "Перейти к альбому"} position="top">
              <button className="p-2 bg-lime-400 text-black rounded-full transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-xl">
                 <Play size={16} fill="currentColor" className="ml-0.5" />
              </button>
           </Tooltip>
        </div>
      </div>
      
      <div className="px-0.5">
        <h4 className={`font-bold text-[11px] leading-tight truncate ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
          {album.title}
        </h4>
        <p className="text-[9px] text-zinc-500 truncate mt-0.5 font-medium">
            {formattedDate} • {isSingle ? 'Сингл' : 'Альбом'}
        </p>
      </div>
    </div>
  );
}