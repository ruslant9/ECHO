'use client';

import { useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import { motion } from 'framer-motion';
import { Search, Music, Disc, Loader, Sparkles, Clock, ListMusic, Plus, Play, Pause } from 'lucide-react'; // Play, Pause не нужны здесь, но оставим чтобы не ломать импорты
import { useTheme } from '@/context/ThemeContext';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useDebounce } from '@/hooks/use-debounce';
import CreatePlaylistModal from '@/components/music/CreatePlaylistModal';
import PlaylistView from '@/components/music/PlaylistView';
import { getAvatarUrl } from '@/lib/avatar-url';
import TrackRow from '@/components/music/TrackRow';

// Queries
const GET_RECOMMENDATIONS = gql`
  query GetRecommendations {
    musicRecommendations { id title url coverUrl artist { name } duration isLiked }
  }
`;

const SEARCH_MUSIC = gql`
  query SearchMusic($query: String!) {
    searchMusic(query: $query) { id title url coverUrl artist { name } duration isLiked }
  }
`;

const GET_MY_LIBRARY = gql`
  query MyMusicLibrary {
    myMusicLibrary { id title url coverUrl artist { name } duration isLiked }
  }
`;

const GET_MY_PLAYLISTS = gql`
  query GetMyPlaylists {
    myPlaylists { id title coverUrl tracks { id } }
  }
`;

export default function MusicPage() {
  const { isDarkMode } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'rec' | 'search' | 'my'>('rec');
  const [myMusicTab, setMyMusicTab] = useState<'all' | 'recent' | 'playlists'>('all');
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Состояния для плейлистов
  const [viewingPlaylistId, setViewingPlaylistId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Запросы данных с возможностью refetch
  const { data: recData, loading: recLoading, refetch: refetchRec } = useQuery(GET_RECOMMENDATIONS, { 
    skip: activeTab !== 'rec',
    fetchPolicy: 'cache-first'
  });
  
  const { data: searchData, loading: searchLoading, refetch: refetchSearch } = useQuery(SEARCH_MUSIC, { 
    variables: { query: debouncedSearchQuery }, 
    skip: activeTab !== 'search' || debouncedSearchQuery.length < 2,
    fetchPolicy: 'network-only'
  });
  
  const { data: libData, loading: libLoading, refetch: refetchLib } = useQuery(GET_MY_LIBRARY, { 
    skip: activeTab !== 'my' || myMusicTab !== 'all',
    fetchPolicy: 'cache-and-network' 
  });

  const { data: playlistsData, refetch: refetchPlaylists } = useQuery(GET_MY_PLAYLISTS, {
    skip: activeTab !== 'my' || myMusicTab !== 'playlists',
    fetchPolicy: 'network-only'
  });

  // Функция для обновления всех списков при лайке
  const handleLikeToggle = () => {
    // В зависимости от активной вкладки, обновляем нужные данные
    if (activeTab === 'rec') refetchRec();
    if (activeTab === 'search') refetchSearch();
    if (activeTab === 'my' && myMusicTab === 'all') refetchLib();
    
    // Можно также обновлять библиотеку в фоне, чтобы при переключении вкладки данные были свежими
    // Но для оптимизации можно делать это лениво при переключении (уже настроено в useQuery fetchPolicy)
    
    // Если мы в библиотеке и убрали лайк -> трек должен исчезнуть
    if (activeTab === 'my' && myMusicTab === 'all') {
        refetchLib();
    }
  };

  // Логика переключения контента
  let tracks: any[] = [];
  let playlists: any[] = [];

  if (activeTab === 'rec') tracks = recData?.musicRecommendations || [];
  if (activeTab === 'search') tracks = searchData?.searchMusic || [];
  if (activeTab === 'my') {
      if (myMusicTab === 'all') tracks = libData?.myMusicLibrary || [];
      if (myMusicTab === 'recent') tracks = []; 
      if (myMusicTab === 'playlists') playlists = playlistsData?.myPlaylists || []; 
  }

  const isContentLoading = 
    (activeTab === 'rec' && recLoading) ||
    (activeTab === 'search' && searchLoading) ||
    (activeTab === 'my' && myMusicTab === 'all' && libLoading);

  const emptyStates = {
      rec: { icon: Sparkles, title: "В поисках вдохновения...", desc: "Мы подбираем для вас лучшие треки. Загляните позже!" },
      search: { icon: Search, title: "Найдите свой ритм", desc: searchQuery.length > 0 ? "Ничего не найдено по вашему запросу." : "Введите название трека или имя артиста." },
      my: {
          all: { icon: Music, title: "Ваша библиотека пуста", desc: "Лайкайте треки, чтобы они появились здесь." },
          recent: { icon: Clock, title: "История пуста", desc: "Вы еще ничего не слушали. Самое время начать!" },
          playlists: { icon: ListMusic, title: "Нет плейлистов", desc: "Создайте свой первый плейлист для любого настроения." }
      }
  };

  let currentEmptyState;
  if (activeTab === 'my') {
      currentEmptyState = emptyStates.my[myMusicTab];
  } else {
      currentEmptyState = emptyStates[activeTab];
  }

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': isDarkMode ? '#a3e635' : '#0052f5',
    '--c-bg': isDarkMode ? '#1b1b1d' : '#E8E8E9',
    '--glass-reflex-dark': isDarkMode ? 2 : 1,
    '--glass-reflex-light': isDarkMode ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;

  const handlePlaylistCreated = (newPlaylistId: number) => {
    refetchPlaylists();
    setViewingPlaylistId(newPlaylistId);
  };

  if (viewingPlaylistId) {
      return <PlaylistView playlistId={viewingPlaylistId} onBack={() => { setViewingPlaylistId(null); refetchPlaylists(); }} />;
  }

  return (
    <div className={`min-h-full p-6 pt-32 md:p-8 md:pt-40 pb-24 transition-colors relative z-10 ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      <CreatePlaylistModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={handlePlaylistCreated} 
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .music-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          width: fit-content; 
          min-width: 320px;
          height: 60px;
          box-sizing: border-box;
          padding: 6px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#music-filter) saturate(var(--saturation));
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent);
        }
        .music-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          flex: 1;
          padding: 0 16px;
          border-radius: 99em;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms;
          white-space: nowrap;
        }
        .music-option:hover { color: var(--c-action); }
        .music-option[data-active="true"] { color: var(--c-content); cursor: default; }
        .music-blob {
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 2px 1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent);
        }
      `}} />
      
      <div className="absolute w-0 h-0 overflow-hidden -z-10">
        <svg>
          <filter id="music-filter" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap id="disp" in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </svg>
      </div>

      <div className="max-w-4xl mx-auto mb-8">
         <h1 className="text-3xl font-bold mb-2">Музыка</h1>
         <p className="text-zinc-500">Слушайте любимые треки и находите новые</p>
      </div>

      <div className="max-w-4xl mx-auto mb-8 flex flex-col gap-6 items-center">
        <div className="music-switcher" style={liquidGlassStyles}>
            {[
                { id: 'rec', label: 'Рекомендации' },
                { id: 'search', label: 'Поиск' },
                { id: 'my', label: 'Моя музыка' }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="music-option"
                    data-active={activeTab === tab.id}
                >
                    {activeTab === tab.id && (
                        <motion.div layoutId="music-blob-main" className="music-blob absolute inset-0 z-0" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                </button>
            ))}
        </div>

        {activeTab === 'search' && (
            <div className="w-full max-w-md relative animate-in fade-in zoom-in duration-300">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Найти трек, артиста или альбом..."
                    className={`w-full pl-12 pr-4 py-3.5 rounded-2xl outline-none transition-colors font-medium
                        ${isDarkMode ? 'bg-zinc-900 focus:bg-zinc-800' : 'bg-zinc-100 focus:bg-white border'}`}
                />
            </div>
        )}

        {activeTab === 'my' && (
            <div className="music-switcher" style={liquidGlassStyles}>
                {[
                    { id: 'all', label: 'Треки' },
                    { id: 'recent', label: 'Недавно' },
                    { id: 'playlists', label: 'Плейлисты' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setMyMusicTab(tab.id as any)}
                        className="music-option"
                        data-active={myMusicTab === tab.id}
                    >
                        {myMusicTab === tab.id && (
                            <motion.div layoutId="music-blob-sub" className="music-blob absolute inset-0 z-0" transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto space-y-1 min-h-[300px]">
        {isContentLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
               <Loader className="animate-spin text-lime-400 mb-4" size={32} />
               <p className="text-sm font-medium">Загружаем музыку...</p>
            </div>
        ) : (
            <>
                {activeTab === 'search' && searchLoading && (
                   <div className="py-20 flex flex-col items-center opacity-50">
                       <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin mb-4" />
                       <p>Ищем музыку...</p>
                   </div>
                )}

                {activeTab === 'my' && myMusicTab === 'playlists' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div 
                          onClick={() => setIsCreateModalOpen(true)}
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
                          <div 
                              key={pl.id}
                              onClick={() => setViewingPlaylistId(pl.id)}
                              className="group cursor-pointer"
                          >
                              <div className="aspect-square rounded-2xl overflow-hidden mb-3 relative shadow-md bg-zinc-800">
                                  {pl.coverUrl ? (
                                        <img src={getAvatarUrl(pl.coverUrl) || pl.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                                          <ListMusic size={48} />
                                      </div>
                                  )}
                                  
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                       <div className="p-3 bg-lime-400 rounded-full shadow-lg transform scale-50 group-hover:scale-100 transition-transform">
                                           <Play size={24} fill="black" className="ml-1" />
                                       </div>
                                  </div>
                              </div>
                              <h3 className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{pl.title}</h3>
                              <p className="text-xs text-zinc-500">{pl.tracks.length} треков</p>
                          </div>
                      ))}
                  </div>
                )}

                {!searchLoading && tracks.length === 0 && (!playlists || playlists.length === 0) && (activeTab !== 'my' || myMusicTab !== 'playlists') && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 opacity-60 flex flex-col items-center"
                    >
                        <div className={`p-6 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                            <currentEmptyState.icon size={48} className="text-zinc-500" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold mb-1">{currentEmptyState.title}</h3>
                        <p className="text-sm font-medium text-zinc-500 max-w-xs">{currentEmptyState.desc}</p>
                    </motion.div>
                )}

                {/* ПЕРЕДАЕМ handleLikeToggle */}
                {!searchLoading && tracks.map((track: any) => (
                    <TrackRow key={track.id} track={track} onLikeToggle={handleLikeToggle} />
                ))}
            </>
        )}
      </div>
    </div>
  );
}