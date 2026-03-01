'use client';

import { Plus, ListMusic, Eye, Trash2 } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar-url';
import Tooltip from '@/components/Tooltip';

interface PlaylistsGridProps {
  playlists: any[];
  isDarkMode: boolean;
  onCreateClick: () => void;
  onOpenPlaylist: (id: number) => void;
  onDeleteClick: (id: number) => void;
}

export default function PlaylistsGrid({ playlists, isDarkMode, onCreateClick, onOpenPlaylist, onDeleteClick }: PlaylistsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div 
        onClick={onCreateClick}
        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all border border-dashed
            ${isDarkMode 
                ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-lime-400' 
                : 'bg-zinc-50 border-zinc-300 hover:bg-zinc-100 hover:border-lime-500'}`}
      >
        <div className={`p-4 rounded-full ${isDarkMode ? 'bg-zinc-800' : 'bg-white'} shadow-sm`}>
            <Plus size={32} className="text-lime-400" />
        </div>
        <span className="font-bold text-sm">Создать плейлист</span>
      </div>

      {playlists.map((pl: any) => (
        <div key={pl.id} onClick={() => onOpenPlaylist(pl.id)} className="group cursor-pointer">
          <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative shadow-md bg-zinc-800 border border-white/5">
            {pl.coverUrl ? (
              <img src={getAvatarUrl(pl.coverUrl) || pl.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800 group-hover:bg-zinc-700 transition-colors duration-500">
                <ListMusic size={48} />
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                 <Tooltip content="Открыть" position="top">
                    <button onClick={(e) => { e.stopPropagation(); onOpenPlaylist(pl.id); }} className="p-3 bg-white/20 hover:bg-white/40 rounded-full shadow-lg transform scale-50 group-hover:scale-100 transition-all duration-300 text-white cursor-pointer">
                        <Eye size={24} />
                    </button>
                 </Tooltip>
                 <Tooltip content="Удалить" position="top">
                    <button onClick={(e) => { e.stopPropagation(); onDeleteClick(pl.id); }} className="p-3 bg-red-500/80 hover:bg-red-500 rounded-full shadow-lg transform scale-50 group-hover:scale-100 transition-all duration-300 text-white cursor-pointer">
                        <Trash2 size={24} />
                    </button>
                 </Tooltip>
            </div>
          </div>
          <h3 className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{pl.title}</h3>
          <p className="text-xs text-zinc-500">{pl.tracks.length} треков</p>
        </div>
      ))}
    </div>
  );
}