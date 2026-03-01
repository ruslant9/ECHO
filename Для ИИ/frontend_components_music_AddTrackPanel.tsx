'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Check, Loader, Music } from 'lucide-react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/use-debounce';
import { getAvatarUrl } from '@/lib/avatar-url';

const GET_MY_LIBRARY = gql`
  query GetMyMusicForPlaylist {
    myMusicLibrary {
      id
      title
      coverUrl
      artist { name }
    }
  }
`;

const ADD_TRACK = gql`mutation AddTrackToPlaylist($playlistId: Int!, $trackId: Int!) { addTrackToPlaylist(playlistId: $playlistId, trackId: $trackId) }`;

interface AddTrackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlistId: number;
  existingTrackIds: Set<number>;
  onTrackAdded: () => void;
}

export default function AddTrackPanel({ isOpen, onClose, playlistId, existingTrackIds, onTrackAdded }: AddTrackPanelProps) {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data, loading } = useQuery(GET_MY_LIBRARY, {
    skip: !isOpen,
    fetchPolicy: 'cache-and-network',
  });
  
  const [addTrack, { loading: addingTrackId }] = useMutation(ADD_TRACK, {
    onCompleted: () => {
      onTrackAdded(); 
    },
  });

  const library = data?.myMusicLibrary || [];

  const filteredLibrary = library.filter((track: any) => 
    track.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    track.artist.name.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  const handleAddTrack = (trackId: number) => {
    addTrack({ variables: { playlistId, trackId } });
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[10000] backdrop-blur-sm"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed top-0 right-0 h-full w-full max-w-md z-[10001] flex flex-col shadow-2xl
              ${isDarkMode 
                ? 'bg-zinc-900 border-l border-zinc-800 text-zinc-100' 
                : 'bg-white border-l border-zinc-200 text-zinc-900'
              }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <h3 className="font-bold text-lg">Добавить треки</h3>
              <button onClick={onClose} className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}><X/></button>
            </div>
            
            {/* Search */}
            <div className={`p-4 border-b ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по моей музыке..."
                  className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-colors
                    ${isDarkMode 
                        ? 'bg-zinc-800 border-zinc-700 focus:border-lime-500 text-white placeholder:text-zinc-500' 
                        : 'bg-zinc-100 border-zinc-200 focus:border-lime-500 text-zinc-900 placeholder:text-zinc-400'
                    }`}
                />
              </div>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full"><Loader className="animate-spin text-lime-400"/></div>
              ) : filteredLibrary.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 px-6 text-center">
                    <div className={`p-4 rounded-full mb-3 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <Music size={32} className="text-zinc-400" />
                    </div>
                    <p className="font-medium text-sm">Ничего не найдено</p>
                    <p className="text-xs mt-1 text-zinc-500">Добавьте треки в "Мою музыку", чтобы они появились здесь.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredLibrary.map((track: any) => {
                    const isAdded = existingTrackIds.has(track.id);
                    return (
                      <div key={track.id} className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={getAvatarUrl(track.coverUrl) || '/disc.png'} className="w-10 h-10 rounded object-cover bg-zinc-800" />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-semibold text-sm">{track.title}</div>
                            <div className="truncate text-xs text-zinc-500">{track.artist.name}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => !isAdded && handleAddTrack(track.id)}
                          disabled={isAdded || addingTrackId === track.id}
                          className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-colors cursor-pointer
                            ${isAdded 
                              ? 'bg-transparent text-lime-400' 
                              : (isDarkMode ? 'bg-zinc-700 hover:bg-lime-500 hover:text-black' : 'bg-zinc-200 hover:bg-lime-400 text-zinc-600')
                            }
                          `}
                        >
                          {addingTrackId === track.id ? (
                            <Loader size={16} className="animate-spin" />
                          ) : isAdded ? (
                            <Check size={18} />
                          ) : (
                            <Plus size={18} />
                          )}
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