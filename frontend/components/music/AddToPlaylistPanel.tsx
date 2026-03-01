// frontend/components/music/AddToPlaylistPanel.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Check, Loader, ListMusic } from 'lucide-react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import { useDebounce } from '@/hooks/use-debounce'; // Добавлен Debounce для поиска
import { useState } from 'react';

const GET_MY_PLAYLISTS = gql`
  query GetMyPlaylistsForAdd {
    myPlaylists { 
      id 
      title 
      coverUrl 
      tracks { id } 
    }
  }
`;

const ADD_TRACK = gql`
  mutation AddTrackToPlaylistPanel($playlistId: Int!, $trackId: Int!) { 
    addTrackToPlaylist(playlistId: $playlistId, trackId: $trackId) 
  }
`;

interface AddToPlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: number;
}

export default function AddToPlaylistPanel({ isOpen, onClose, trackId }: AddToPlaylistPanelProps) {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data, loading, refetch } = useQuery(GET_MY_PLAYLISTS, {
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });
  
  const [addTrack, { loading: adding }] = useMutation(ADD_TRACK, {
    onCompleted: () => {
      refetch(); 
    },
  });

  const playlists = data?.myPlaylists || [];
  
  // Фильтрация плейлистов
  const filteredPlaylists = playlists.filter((pl: any) => 
      pl.title.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  const handleAdd = (playlistId: number) => {
    addTrack({ variables: { playlistId, trackId } });
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[10000] backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            // ИСПРАВЛЕНО: Добавлен явный цвет текста для светлой темы
            className={`fixed top-0 right-0 h-full w-full max-w-sm z-[10001] flex flex-col shadow-2xl
              ${isDarkMode ? 'bg-zinc-900 border-l border-zinc-800 text-zinc-100' : 'bg-white border-l border-zinc-200 text-zinc-900'}`}
          >
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <h3 className="font-bold text-lg">Добавить в плейлист</h3>
              <button onClick={onClose} className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}><X/></button>
            </div>
            
            <div className={`p-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
               <div className="relative">
                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                 <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Найти плейлист..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm transition-colors
                        ${isDarkMode ? 'bg-zinc-800 focus:bg-zinc-700' : 'bg-zinc-100 focus:bg-zinc-50 border border-transparent focus:border-zinc-300'}`}
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {loading ? (
                <div className="flex items-center justify-center h-full"><Loader className="animate-spin text-lime-400"/></div>
              ) : filteredPlaylists.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                    <ListMusic size={40} className="mb-4 text-zinc-500" />
                    <p className="font-medium text-sm">Плейлисты не найдены</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPlaylists.map((pl: any) => {
                    const isAdded = pl.tracks.some((t: any) => t.id === trackId);

                    return (
                      <div key={pl.id} className={`flex items-center justify-between p-3 rounded-xl border border-transparent transition-colors ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0 overflow-hidden">
                              {pl.coverUrl ? (
                                  <img src={getAvatarUrl(pl.coverUrl) || ''} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-600"><ListMusic size={20} /></div>
                              )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`truncate font-bold text-sm ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{pl.title}</div>
                            <div className="truncate text-xs text-zinc-500">{pl.tracks.length} треков</div>
                          </div>
                        </div>

                        <button 
                          onClick={() => !isAdded && handleAdd(pl.id)}
                          disabled={isAdded || adding}
                          className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-colors cursor-pointer
                            ${isAdded 
                              ? 'bg-transparent text-lime-400' 
                              : (isDarkMode ? 'bg-zinc-800 hover:bg-lime-500 hover:text-black text-zinc-400' : 'bg-zinc-200 hover:bg-lime-400 text-zinc-600')
                            }
                          `}
                        >
                          {isAdded ? <Check size={18} /> : <Plus size={18} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}