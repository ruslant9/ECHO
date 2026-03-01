'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { motion } from 'framer-motion';
import { Search, Music, Clock, ListMusic, Sparkles, Loader } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/use-debounce';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useMusicPlayer } from '@/context/MusicPlayerContext';

import CreatePlaylistModal from '@/components/music/CreatePlaylistModal';
import PlaylistView from '@/components/music/PlaylistView';
import ArtistView from '@/components/music/ArtistView';
import AlbumView from '@/components/music/AlbumView';
import ConfirmationModal from '@/components/ConfirmationModal';
import TrackList from '@/components/music/TrackList';
import PlaylistsGrid from '@/components/music/PlaylistsGrid';
import SearchResults from '@/components/music/SearchResults';

// --- QUERIES ---
const GET_RECOMMENDATIONS = gql`
  query GetRecommendations($skip: Int, $take: Int) { 
    musicRecommendations(skip: $skip, take: $take) { 
      id title url coverUrl duration isLiked 
      artist { id name } 
      featuredArtists { id name } 
    } 
  }
`;

const SEARCH_MUSIC = gql`
  query SearchMusic($query: String!) { 
    searchMusic(query: $query) { 
      tracks { 
        id title url coverUrl duration isLiked 
        artist { id name } 
        featuredArtists { id name } 
        album { id title } 
      } 
      artists { id name avatar } 
      albums { id title coverUrl year artist { name } } 
      playlists { id title coverUrl owner { name username } tracks { id } } 
    } 
  }
`;

const GET_MY_LIBRARY = gql`
  query MyMusicLibrary($skip: Int, $take: Int) { 
    myMusicLibrary(skip: $skip, take: $take) { 
      id title url coverUrl duration isLiked 
      artist { id name } 
      featuredArtists { id name } 
    } 
  }
`;

const GET_RECENT_HISTORY = gql`
  query GetRecentHistory($skip: Int, $take: Int) {
    myRecentHistory(skip: $skip, take: $take) {
      id title url coverUrl duration isLiked
      artist { id name }
      featuredArtists { id name }
    }
  }
`;

const GET_MY_PLAYLISTS = gql`query GetMyPlaylists { myPlaylists { id title coverUrl tracks { id } } }`;
const DELETE_PLAYLIST = gql`mutation DeletePlaylistFromPage($id: Int!) { deletePlaylist(id: $id) }`;

export default function MusicPage() {
  const { isDarkMode } = useTheme();
  const { playTrack } = useMusicPlayer();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ITEMS_PER_PAGE = 20;

  const viewingPlaylistId = searchParams.get('playlistId') ? Number(searchParams.get('playlistId')) : null;
  const viewingArtistId = searchParams.get('artistId') ? Number(searchParams.get('artistId')) : null;
  const viewingAlbumId = searchParams.get('albumId') ? Number(searchParams.get('albumId')) : null;

  const [activeTab, setActiveTab] = useState<'rec' | 'search' | 'my'>('rec');
  const [myMusicTab, setMyMusicTab] = useState<'all' | 'recent' | 'playlists'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<number | null>(null);

  // --- DATA FETCHING WITH PAGINATION ---
  const { data: recData, loading: recLoading, refetch: refetchRec, fetchMore: fetchMoreRec } = useQuery(GET_RECOMMENDATIONS, { 
    variables: { skip: 0, take: ITEMS_PER_PAGE },
    skip: activeTab !== 'rec', 
    fetchPolicy: 'cache-and-network' 
  });

  const { data: searchData, loading: searchLoading, refetch: refetchSearch } = useQuery(SEARCH_MUSIC, { 
    variables: { query: debouncedSearchQuery }, 
    skip: activeTab !== 'search' || debouncedSearchQuery.length < 2 
  });

  const { data: libData, loading: libLoading, refetch: refetchLib, fetchMore: fetchMoreLib } = useQuery(GET_MY_LIBRARY, { 
    variables: { skip: 0, take: ITEMS_PER_PAGE },
    skip: activeTab !== 'my' || myMusicTab !== 'all', 
    fetchPolicy: 'cache-and-network' 
  });

  const { data: recentData, loading: recentLoading, refetch: refetchRecent, fetchMore: fetchMoreRecent } = useQuery(GET_RECENT_HISTORY, { 
    variables: { skip: 0, take: ITEMS_PER_PAGE },
    skip: activeTab !== 'my' || myMusicTab !== 'recent', 
    fetchPolicy: 'network-only' 
  });

  const { data: playlistsData, refetch: refetchPlaylists } = useQuery(GET_MY_PLAYLISTS, { 
    skip: activeTab !== 'my' || myMusicTab !== 'playlists' 
  });

  const [deletePlaylist] = useMutation(DELETE_PLAYLIST, { onCompleted: () => { refetchPlaylists(); setPlaylistToDelete(null); } });

  const handleLoadMore = () => {
    if (activeTab === 'rec' && recData?.musicRecommendations) {
        fetchMoreRec({ variables: { skip: recData.musicRecommendations.length } });
    } else if (activeTab === 'my') {
        if (myMusicTab === 'all' && libData?.myMusicLibrary) {
            fetchMoreLib({ variables: { skip: libData.myMusicLibrary.length } });
        } else if (myMusicTab === 'recent' && recentData?.myRecentHistory) {
            fetchMoreRecent({ variables: { skip: recentData.myRecentHistory.length } });
        }
    }
  };

  const handleLikeToggle = () => {
    if (activeTab === 'rec') refetchRec();
    if (activeTab === 'my' && myMusicTab === 'all') refetchLib();
  };

  const closeView = () => {
    // Если есть история переходов — возвращаемся назад
    if (window.history.length > 1) {
      router.back();
    } else {
      // Если открыли ссылку в новой вкладке и истории нет — идем на главную музыки
      router.push(pathname);
    }
  };
  const openPlaylist = (id: number) => router.push(`${pathname}?playlistId=${id}`);
  const openArtist = (id: number) => router.push(`${pathname}?artistId=${id}`);
  const openAlbum = (id: number) => router.push(`${pathname}?albumId=${id}`);

  if (viewingAlbumId) return <AlbumView albumId={viewingAlbumId} onBack={closeView} onArtistClick={openArtist} />;
  if (viewingArtistId) return <ArtistView artistId={viewingArtistId} onBack={closeView} onAlbumClick={openAlbum} />;
  if (viewingPlaylistId) return <PlaylistView playlistId={viewingPlaylistId} onBack={() => { refetchPlaylists(); closeView(); }} />;

  let tracks: any[] = [];
  let playlists: any[] = [];
  const searchResults = searchData?.searchMusic || { tracks: [], artists: [], albums: [], playlists: [] };

  if (activeTab === 'rec') tracks = recData?.musicRecommendations || [];
  if (activeTab === 'my') {
      if (myMusicTab === 'all') tracks = libData?.myMusicLibrary || [];
      if (myMusicTab === 'recent') tracks = recentData?.myRecentHistory || [];
      if (myMusicTab === 'playlists') playlists = playlistsData?.myPlaylists || []; 
  }

  const isContentLoading = (activeTab === 'rec' && recLoading) || (activeTab === 'my' && myMusicTab === 'all' && libLoading) || (activeTab === 'my' && myMusicTab === 'recent' && recentLoading);

  const emptyStates = {
      rec: { icon: Sparkles, title: "В поисках вдохновения...", desc: "Мы подбираем для вас лучшие треки. Загляните позже!" },
      search: { icon: Search, title: "Найдите свой ритм", desc: "Введите название трека или имя артиста." },
      my: {
          all: { icon: Music, title: "Ваша библиотека пуста", desc: "Лайкайте треки, чтобы они появились здесь." },
          recent: { icon: Clock, title: "История пуста", desc: "Вы еще ничего не слушали. Самое время начать!" },
          playlists: { icon: ListMusic, title: "Нет плейлистов", desc: "Создайте свой первый плейлист для любого настроения." }
      }
  };

  const currentEmptyState = activeTab === 'my' ? emptyStates.my[myMusicTab] : emptyStates[activeTab];

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': isDarkMode ? '#a3e635' : '#0052f5',
    '--saturation': '150%',
  } as React.CSSProperties;

  return (
    <div className={`min-h-full p-4 pt-12 md:p-8 md:pt-14 transition-colors relative z-10 ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      <CreatePlaylistModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={(id) => { refetchPlaylists(); openPlaylist(id); }} />
      <ConfirmationModal isOpen={playlistToDelete !== null} onClose={() => setPlaylistToDelete(null)} onConfirm={() => playlistToDelete && deletePlaylist({ variables: { id: playlistToDelete } })} title="Удалить плейлист?" message="Плейлист будет удален безвозвратно." />

      <style dangerouslySetInnerHTML={{ __html: `
        .music-switcher {
          position: relative; z-index: 1; display: flex; align-items: center; gap: 4px; width: fit-content; min-width: 320px;
          height: 52px; box-sizing: border-box; padding: 6px; border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#music-filter) saturate(var(--saturation));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
        .music-option {
          color: var(--c-content); position: relative; z-index: 2; display: flex; align-items: center; justify-content: center;
          height: 100%; flex: 1; padding: 0 16px; border-radius: 99em; font-size: 14px; font-weight: 700; cursor: pointer; transition: color 160ms; white-space: nowrap;
        }
        .music-option[data-active="true"] { color: var(--c-content); cursor: default; }
        .music-blob {
          border-radius: 99em; background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
      `}} />
      
      <div className="max-w-4xl mx-auto mb-2">
         <h1 className="text-3xl font-bold mb-1">Музыка</h1>
         <p className="text-zinc-500 text-sm">Слушайте любимые треки и находите новые</p>
      </div>

      <div className="max-w-4xl mx-auto mb-4 flex flex-col gap-4 items-center">
        <div className="music-switcher" style={liquidGlassStyles}>
            {[ { id: 'rec', label: 'Рекомендации' }, { id: 'search', label: 'Поиск' }, { id: 'my', label: 'Моя музыка' } ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className="music-option" data-active={activeTab === tab.id}>
                    {activeTab === tab.id && <motion.div layoutId="music-blob-main" className="music-blob absolute inset-0 z-0" transition={{ type: "spring", stiffness: 500, damping: 30 }} />}
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
                  className={`w-full pl-12 pr-4 py-3 rounded-2xl outline-none transition-colors font-medium text-sm border
                      ${isDarkMode ? 'bg-zinc-900 focus:bg-zinc-800 text-white border-zinc-800' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'}`}
              />
            </div>
        )}

        {activeTab === 'my' && (
            <div className="music-switcher" style={liquidGlassStyles}>
                {[ { id: 'all', label: 'Треки' }, { id: 'recent', label: 'Недавно' }, { id: 'playlists', label: 'Плейлисты' } ].map((tab) => (
                    <button key={tab.id} onClick={() => setMyMusicTab(tab.id as any)} className="music-option" data-active={myMusicTab === tab.id}>
                        {myMusicTab === tab.id && <motion.div layoutId="music-blob-sub" className="music-blob absolute inset-0 z-0" transition={{ type: "spring", stiffness: 500, damping: 30 }} />}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto min-h-[300px]">
        {(activeTab === 'rec' || (activeTab === 'my' && (myMusicTab === 'all' || myMusicTab === 'recent'))) && (
            <TrackList 
                tracks={tracks} 
                isLoading={isContentLoading} 
                emptyState={currentEmptyState} 
                isDarkMode={isDarkMode} 
                onLikeToggle={handleLikeToggle}
                onPlay={(track) => playTrack(track, tracks)}
                onLoadMore={handleLoadMore} // Передаем функцию подгрузки
            />
        )}

        {activeTab === 'my' && myMusicTab === 'playlists' && (
            <PlaylistsGrid playlists={playlists} isDarkMode={isDarkMode} onCreateClick={() => setIsCreateModalOpen(true)} onOpenPlaylist={openPlaylist} onDeleteClick={setPlaylistToDelete} />
        )}
        
         {activeTab === 'search' && searchLoading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader className="animate-spin text-lime-400 mb-4" size={32} />
                <p className="text-sm font-medium">Ищем музыку...</p>
            </div>
        )}
        
{activeTab === 'search' && !searchLoading && (
            <SearchResults 
                searchResults={searchResults} 
                searchQuery={searchQuery} 
                // ИСПРАВЛЕНИЕ: Проверяем все массивы, а не только треки
                hasSearchResults={
                    searchResults.tracks.length > 0 || 
                    searchResults.artists.length > 0 || 
                    searchResults.albums.length > 0 || 
                    searchResults.playlists.length > 0
                } 
                isDarkMode={isDarkMode} 
                openArtist={openArtist} 
                openAlbum={openAlbum} 
                openPlaylist={openPlaylist} 
                handleLikeToggle={handleLikeToggle} 
            />
        )}
      </div>
    </div>
  );
}