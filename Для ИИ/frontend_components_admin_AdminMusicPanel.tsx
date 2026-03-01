'use client';

import { useState, useId, useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { Plus, Edit2, Trash2, Mic2, Disc3, Music, Loader, Search, X } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar-url';
import { useDebounce } from '@/hooks/use-debounce';
import Toast from '@/components/Toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import { motion, AnimatePresence } from 'framer-motion';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

// Импорт редакторов
import AdminArtistEditor from './AdminArtistEditor';
import AdminAlbumEditor from './AdminAlbumEditor';
import AdminTrackEditor from './AdminTrackEditor';

// --- GraphQL Запросы (с поддержкой поиска) ---
const GET_ALL_ARTISTS = gql`
  query AdminGetArtists($query: String) { 
    adminGetAllArtists(query: $query) { id name avatar bio } 
  }
`;

const GET_ALL_ALBUMS = gql`
  query AdminGetAlbums($query: String) { 
    adminGetAllAlbums(query: $query) { id title coverUrl genre year releaseDate artist { id name } } 
  }
`;

const GET_ALL_TRACKS = gql`
  query AdminGetTracks($query: String) { 
    adminGetAllTracks(query: $query) { id title url duration coverUrl genre releaseDate artist { id name } album { id title } } 
  }
`;

const DELETE_ARTIST = gql`mutation AdminDeleteArtist($id: Int!) { adminDeleteArtist(id: $id) }`;
const DELETE_ALBUM = gql`mutation AdminDeleteAlbum($id: Int!) { adminDeleteAlbum(id: $id) }`;
const DELETE_TRACK = gql`mutation AdminDeleteTrack($id: Int!) { adminDeleteTrack(id: $id) }`;

type TabType = 'artists' | 'albums' | 'tracks';

export default function AdminMusicPanel() {
  const { isDarkMode } = useTheme();
  const filterId = `admin-tabs-filter-${useId()}`; 
  
  const [activeTab, setActiveTab] = useState<TabType>('artists');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    type: TabType | null;
    data: any;
  }>({ isOpen: false, type: null, data: null });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: TabType | null;
    id: number | null;
    title: string;
    message: string;
  }>({ isOpen: false, type: null, id: null, title: '', message: '' });

  // Запросы данных с учетом поискового запроса
  const { data: artistsData, loading: loadingArtists, refetch: refetchArtists } = useQuery(GET_ALL_ARTISTS, { 
    variables: { query: debouncedSearch },
    fetchPolicy: 'network-only' 
  });
  const { data: albumsData, loading: loadingAlbums, refetch: refetchAlbums } = useQuery(GET_ALL_ALBUMS, { 
    variables: { query: debouncedSearch },
    fetchPolicy: 'network-only' 
  });
  const { data: tracksData, loading: loadingTracks, refetch: refetchTracks } = useQuery(GET_ALL_TRACKS, { 
    variables: { query: debouncedSearch },
    fetchPolicy: 'network-only' 
  });

  const [deleteArtist] = useMutation(DELETE_ARTIST);
  const [deleteAlbum] = useMutation(DELETE_ALBUM);
  const [deleteTrack] = useMutation(DELETE_TRACK);

  const refetchAll = () => {
    refetchArtists();
    refetchAlbums();
    refetchTracks();
  };

  const handleDeleteClick = (type: TabType, item: any) => {
    let title = '';
    let message = '';

    if (type === 'artists') {
      title = 'Удалить артиста?';
      message = `Внимание! Артист «${item.name}», а также ВСЕ его альбомы и треки будут удалены.`;
    } else if (type === 'albums') {
      title = 'Удалить альбом?';
      message = `Альбом «${item.title}» и все треки внутри него будут удалены.`;
    } else {
      title = 'Удалить трек?';
      message = `Трек «${item.title}» будет удален из базы.`;
    }

    setConfirmModal({ isOpen: true, type, id: item.id, title, message });
  };

  const executeDelete = async () => {
    if (!confirmModal.id || !confirmModal.type) return;
    try {
      if (confirmModal.type === 'artists') await deleteArtist({ variables: { id: confirmModal.id } });
      else if (confirmModal.type === 'albums') await deleteAlbum({ variables: { id: confirmModal.id } });
      else if (confirmModal.type === 'tracks') await deleteTrack({ variables: { id: confirmModal.id } });
      
      setToast({ message: 'Успешно удалено', type: 'success' });
      refetchAll();
    } catch (e: any) {
      setToast({ message: e.message || 'Ошибка при удалении', type: 'error' });
    } finally {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': isDarkMode ? '#a3e635' : '#0052f5',
    '--saturation': '150%',
  } as React.CSSProperties;

  const renderList = () => {
    const isDark = isDarkMode;
    const cardClass = `flex items-center justify-between p-4 rounded-2xl border transition-colors ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`;
    const btnBase = `p-2 rounded-xl transition-colors cursor-pointer`;
    const btnEdit = `${btnBase} ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-black hover:bg-zinc-100'}`;
    const btnDelete = `${btnBase} text-red-500 ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`;

    if (activeTab === 'artists') {
      if (loadingArtists) return <div className="py-10 text-center text-lime-500"><Loader className="animate-spin mx-auto"/></div>;
      const artists = artistsData?.adminGetAllArtists || [];
      if (artists.length === 0) return <div className="py-10 text-center text-zinc-500">Ничего не найдено</div>;

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {artists.map((artist: any) => (
            <div key={artist.id} className={cardClass}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-700">
                  {artist.avatar ? (
                    <img src={getAvatarUrl(artist.avatar)!} className="w-full h-full object-cover" alt={artist.name} />
                  ) : (
                    <Mic2 size={24} className="text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm truncate">{artist.name}</h3>
                  <p className="text-xs text-zinc-500 truncate">{artist.bio || 'Нет биографии'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => setEditorState({ isOpen: true, type: 'artists', data: artist })} className={btnEdit}><Edit2 size={16}/></button>
                <button onClick={() => handleDeleteClick('artists', artist)} className={btnDelete}><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'albums') {
      if (loadingAlbums) return <div className="py-10 text-center text-lime-500"><Loader className="animate-spin mx-auto"/></div>;
      const albums = albumsData?.adminGetAllAlbums || [];
      if (albums.length === 0) return <div className="py-10 text-center text-zinc-500">Ничего не найдено</div>;

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album: any) => (
            <div key={album.id} className={cardClass}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-700">
                  {album.coverUrl ? (
                    <img src={getAvatarUrl(album.coverUrl)!} className="w-full h-full object-cover" alt={album.title} />
                  ) : (
                    <Disc3 size={24} className="text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm truncate">{album.title}</h3>
                  <p className="text-xs text-zinc-500 truncate">{album.artist?.name} • {album.year || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button onClick={() => setEditorState({ isOpen: true, type: 'albums', data: album })} className={btnEdit}><Edit2 size={16}/></button>
                <button onClick={() => handleDeleteClick('albums', album)} className={btnDelete}><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'tracks') {
      if (loadingTracks) return <div className="py-10 text-center text-lime-500"><Loader className="animate-spin mx-auto"/></div>;
      const tracks = tracksData?.adminGetAllTracks || [];
      if (tracks.length === 0) return <div className="py-10 text-center text-zinc-500">Ничего не найдено</div>;

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map((track: any) => (
            <div key={track.id} className={cardClass}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-700">
                  {track.coverUrl ? (
                    <img src={getAvatarUrl(track.coverUrl)!} className="w-full h-full object-cover" alt={track.title} />
                  ) : (
                    <Music size={24} className="text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm truncate">{track.title}</h3>
                  <p className="text-xs text-zinc-500 truncate">{track.artist?.name} {track.album ? `• ${track.album.title}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-xs font-mono text-zinc-500">{Math.floor(track.duration/60)}:{(track.duration%60).toString().padStart(2, '0')}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditorState({ isOpen: true, type: 'tracks', data: track })} className={btnEdit}><Edit2 size={16}/></button>
                  <button onClick={() => handleDeleteClick('tracks', track)} className={btnDelete}><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  const getAddLabel = () => {
    if (activeTab === 'artists') return 'Добавить артиста';
    if (activeTab === 'albums') return 'Создать альбом';
    return 'Добавить трек';
  };

  return (
    <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-liquid-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 52px;
          padding: 6px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#${filterId}) saturate(var(--saturation));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
        .admin-liquid-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 20px;
          border-radius: 99em;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms;
        }
        .admin-liquid-option:hover { color: var(--c-action); }
        .admin-liquid-option[data-active="true"] { color: var(--c-content); cursor: default; }
        .admin-liquid-blob {
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
      `}} />

      <svg className="absolute w-0 h-0">
        <filter id={filterId} primitiveUnits="objectBoundingBox">
          <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64} />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
          <feDisplacementMap in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <AdminArtistEditor 
        isOpen={editorState.isOpen && editorState.type === 'artists'} 
        onClose={() => setEditorState({ isOpen: false, type: null, data: null })} 
        artist={editorState.data}
        onSuccess={(msg: string) => { setToast({ message: msg, type: 'success' }); refetchAll(); setEditorState({ isOpen: false, type: null, data: null }); }}
      />

      <AdminAlbumEditor 
        isOpen={editorState.isOpen && editorState.type === 'albums'} 
        onClose={() => setEditorState({ isOpen: false, type: null, data: null })} 
        album={editorState.data}
        artists={artistsData?.adminGetAllArtists || []}
        allTracks={tracksData?.adminGetAllTracks || []}
        onSuccess={(msg: string) => { setToast({ message: msg, type: 'success' }); refetchAll(); setEditorState({ isOpen: false, type: null, data: null }); }}
      />

      <AdminTrackEditor 
        isOpen={editorState.isOpen && editorState.type === 'tracks'} 
        onClose={() => setEditorState({ isOpen: false, type: null, data: null })} 
        track={editorState.data}
        artists={artistsData?.adminGetAllArtists || []}
        albums={albumsData?.adminGetAllAlbums || []}
        onSuccess={(msg: string) => { setToast({ message: msg, type: 'success' }); refetchAll(); setEditorState({ isOpen: false, type: null, data: null }); }}
      />

      {/* ШАПКА И ПОИСК */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            {/* Кнопки в стиле Liquid Glass */}
            <div className="admin-liquid-switcher" style={liquidGlassStyles}>
            {[
                { id: 'artists', label: 'Артисты', icon: Mic2 },
                { id: 'albums', label: 'Альбомы', icon: Disc3 },
                { id: 'tracks', label: 'Треки', icon: Music }
            ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                <button
                    key={tab.id}
                    onClick={() => {
                        setActiveTab(tab.id as TabType);
                        setSearchQuery(''); // Сброс поиска при смене вкладки
                    }}
                    className="admin-liquid-option"
                    data-active={isActive}
                >
                    {isActive && (
                        <motion.div
                        layoutId="admin-music-tab-blob"
                        className="admin-liquid-blob absolute inset-0 z-0"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                    )}
                    <div className="relative z-10 flex items-center gap-2">
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                    </div>
                </button>
                )
            })}
            </div>

            {/* ПОИСК */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Найти..."
                    className={`w-full pl-10 pr-10 py-3 rounded-2xl outline-none transition-all border text-sm
                        ${isDarkMode 
                            ? 'bg-zinc-800 border-zinc-700 focus:border-lime-500 text-white' 
                            : 'bg-zinc-50 border-zinc-200 focus:border-lime-500 text-zinc-900 shadow-sm'}`}
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>

        <button 
          onClick={() => setEditorState({ isOpen: true, type: activeTab, data: null })}
          className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white dark:bg-white dark:text-black rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-lg w-full md:w-auto justify-center"
        >
          <Plus size={18} />
          {getAddLabel()}
        </button>
      </div>

      {/* КОНТЕНТ ВКЛАДКИ */}
      <div>
        {renderList()}
      </div>

    </div>
  );
}