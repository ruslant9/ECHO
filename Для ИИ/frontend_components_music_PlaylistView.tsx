'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { Play, Pause, Search, Trash2, Edit2, Plus, ArrowLeft, Loader, Check, Camera, X, Clock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { motion } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getAvatarUrl } from '@/lib/avatar-url';
import Cookies from 'js-cookie';
import AddTrackPanel from './AddTrackPanel';
import { getAverageColor, ColorResult } from '@/lib/color-utils';
import Tooltip from '@/components/Tooltip';

const GET_PLAYLIST = gql`
  query GetPlaylist($id: Int!) {
    playlist(id: $id) {
      id title coverUrl updatedAt
      owner { id username name avatar }
      tracks { 
        id title url duration isLiked coverUrl
        artist { id name } 
        featuredArtists { id name } # Добавлено
      }
    }
  }
`;

const SEARCH_TRACKS = gql`query SearchTracksForPlaylist($query: String!) { searchMusic(query: $query) { id title url coverUrl artist { name } duration } }`;
const REMOVE_TRACK = gql`mutation RemoveTrack($playlistId: Int!, $trackId: Int!) { removeTrackFromPlaylist(playlistId: $playlistId, trackId: $trackId) }`;
const DELETE_PLAYLIST = gql`mutation DeletePlaylist($id: Int!) { deletePlaylist(id: $id) }`;
const UPDATE_PLAYLIST = gql`mutation UpdatePlaylist($input: UpdatePlaylistInput!) { updatePlaylist(input: $input) { id title coverUrl } }`;

export default function PlaylistView({ playlistId, onBack }: { playlistId: number, onBack: () => void }) {
  const { isDarkMode } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [trackToRemove, setTrackToRemove] = useState<number | null>(null); 
  const [isAddTrackPanelOpen, setIsAddTrackPanelOpen] = useState(false);
  
  const [dominantColorData, setDominantColorData] = useState<ColorResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, refetch } = useQuery(GET_PLAYLIST, { variables: { id: playlistId }, fetchPolicy: 'cache-and-network' });

  useQuery(SEARCH_TRACKS, { variables: { query: searchQuery }, skip: searchQuery.length < 2 });

  const [removeTrack] = useMutation(REMOVE_TRACK, { onCompleted: () => refetch() });
  const [deletePlaylist] = useMutation(DELETE_PLAYLIST, { onCompleted: onBack });
  const [updatePlaylist] = useMutation(UPDATE_PLAYLIST, { onCompleted: () => { setIsEditing(false); refetch(); } });

  const playlist = data?.playlist;
  const tracks: any[] = playlist?.tracks || [];
  const existingTrackIds = useMemo(() => new Set(tracks.map((t) => t.id as number)), [tracks]);

  useEffect(() => {
    if (playlist?.coverUrl) {
        const fullUrl = getAvatarUrl(playlist.coverUrl);
        if (fullUrl) {
            getAverageColor(fullUrl).then(setDominantColorData).catch(() => setDominantColorData(null));
        }
    } else {
        setDominantColorData(null);
    }
  }, [playlist?.coverUrl]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader className="animate-spin text-lime-400"/></div>;
  if (!playlist) return <div className="pt-24 p-8 text-center">Плейлист не найден</div>;

  const fallbackBg = isDarkMode ? 'bg-zinc-900' : 'bg-zinc-300';

  const handlePlay = () => {
  if (tracks.length > 0) {
    // Передаем первый трек И весь список треков альбома
    playTrack(tracks[0], tracks); 
  }
};

  const handleSaveEdit = () => {
      if (editTitle.trim() === playlist.title) { setIsEditing(false); return; }
      updatePlaylist({ variables: { input: { id: playlistId, title: editTitle } } });
  };
  
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    const token = Cookies.get('token');

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}/upload/message`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
        });
        const data = await res.json();
        await updatePlaylist({ variables: { input: { id: playlistId, coverUrl: data.url } } });
    } catch (err) {
        console.error("Cover upload error:", err);
    }
  };

  const formattedDate = new Date(playlist.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  const textColorClass = dominantColorData ? (dominantColorData.isLight ? 'text-black' : 'text-white') : (isDarkMode ? 'text-white' : 'text-zinc-900');
  const secondaryTextClass = dominantColorData ? (dominantColorData.isLight ? 'text-black/60' : 'text-white/60') : 'opacity-60';

  const backButtonClass = dominantColorData
    ? (dominantColorData.isLight ? 'bg-black/10 hover:bg-black/20 text-black border-black/10' : 'bg-white/20 hover:bg-white/30 text-white border-white/20')
    : (isDarkMode ? 'bg-white/20 hover:bg-white/30 text-white border-white/20' : 'bg-black/10 hover:bg-black/20 text-black border-black/10');

  const actionButtonClass = dominantColorData
     ? (dominantColorData.isLight ? 'bg-black/5 border-black/10 text-black hover:bg-black/10' : 'bg-white/10 border-white/10 text-white hover:bg-white/20')
     : (isDarkMode ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' : 'bg-black/5 border-black/10 text-black hover:bg-black/10');

  const scrollbarColor = dominantColorData?.color || (isDarkMode ? '#52525b' : '#a1a1aa');

  return (
    <div className={`relative min-h-full flex flex-col ${isDarkMode ? 'bg-black' : 'bg-zinc-50'}`}>
      
      {/* ДИНАМИЧЕСКИЙ СТИЛЬ СКРОЛЛБАРА */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Общая ширина области скролла (сделали шире) */
        ::-webkit-scrollbar {
          width: 22px; 
        }
        
        /* Убираем фон (трек) полностью */
        ::-webkit-scrollbar-track {
          background: transparent;
          border: none;
        }
        
        /* Ползунок */
        ::-webkit-scrollbar-thumb {
          background-color: ${scrollbarColor};
          border-radius: 9999px;
          /* Прозрачная рамка отступает от краев, оставляя только "таблетку" в центре */
          border: 6px solid transparent; 
          background-clip: padding-box;
        }

        /* При наведении делаем его чуть ярче/шире визуально (по желанию) */
        ::-webkit-scrollbar-thumb:hover {
          border: 5px solid transparent; 
        }

        /* УБИРАЕМ СТРЕЛОЧКИ СВЕРХУ И СНИЗУ */
        ::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }

        /* Настройка для Firefox */
        * {
          scrollbar-width: auto;
          scrollbar-color: ${scrollbarColor} transparent;
        }
      `}} />

       <AddTrackPanel isOpen={isAddTrackPanelOpen} onClose={() => setIsAddTrackPanelOpen(false)} playlistId={playlistId} existingTrackIds={existingTrackIds} onTrackAdded={refetch} />
       <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => deletePlaylist({ variables: { id: playlistId } })} title="Удалить плейлист?" message="Это действие нельзя отменить." />
       <ConfirmationModal isOpen={trackToRemove !== null} onClose={() => setTrackToRemove(null)} onConfirm={() => { if (trackToRemove !== null) { removeTrack({ variables: { playlistId, trackId: trackToRemove } }); setTrackToRemove(null); } }} title="Убрать трек?" message="Трек будет удален из этого плейлиста." />

       <div 
         className={`relative p-8 pb-10 flex flex-col md:flex-row gap-8 items-start md:items-end pt-24 md:pt-32 shrink-0 transition-colors duration-700
            ${!dominantColorData ? fallbackBg : ''}
         `}
         style={dominantColorData ? { backgroundColor: dominantColorData.color } : undefined}
       >
          <button onClick={onBack} className={`absolute top-10 left-10 p-2.5 rounded-full transition-colors z-20 backdrop-blur-md cursor-pointer shadow-sm border ${backButtonClass}`}>
              <ArrowLeft size={24} />
          </button>

          <div className="w-52 h-52 md:w-60 md:h-60 shrink-0 rounded-xl shadow-2xl overflow-hidden bg-zinc-800 relative group z-10 border border-white/10">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
              {playlist.coverUrl ? (
                  <img src={getAvatarUrl(playlist.coverUrl) || playlist.coverUrl} className="w-full h-full object-cover" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-500 font-bold text-5xl select-none">
                      {playlist.title[0]?.toUpperCase()}
                  </div>
              )}
              <div 
                onClick={() => { if (!isEditing) fileInputRef.current?.click(); }}
                className={`absolute inset-0 bg-black/50 opacity-0 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm ${isEditing ? 'pointer-events-none' : 'group-hover:opacity-100 cursor-pointer'}`}
              >
                  <Camera size={40} />
                  <span className="text-sm font-bold mt-2">Изменить</span>
              </div>
          </div>

          <div className={`flex-1 z-10 w-full drop-shadow-sm ${textColorClass}`}>
              <div className={`text-sm font-bold uppercase mb-2 tracking-widest ${secondaryTextClass}`}>Плейлист</div>
              
              {isEditing ? (
                  <div className="flex gap-3 mb-4 items-center">
                      <input 
                        value={editTitle} onChange={e => setEditTitle(e.target.value)} 
                        className={`text-3xl md:text-5xl font-bold rounded-xl px-4 py-1 outline-none w-full border backdrop-blur-md transition-colors
                            ${dominantColorData?.isLight ? 'bg-black/5 border-black/20 text-black placeholder:text-black/50' : 'bg-white/20 border-white/30 text-white placeholder:text-white/50'}
                        `}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                      />
                      <button onClick={handleSaveEdit} className="p-3 bg-lime-400 text-black rounded-full hover:bg-lime-500 transition-colors shadow-sm cursor-pointer"><Check size={24}/></button>
                      <button onClick={() => setIsEditing(false)} className={`p-3 rounded-full border backdrop-blur-md transition-colors cursor-pointer ${backButtonClass}`}><X size={24}/></button>
                  </div>
              ) : (
                  <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-none drop-shadow-sm">{playlist.title}</h1>
              )}
              
              <div className={`flex items-center gap-3 text-sm mb-8 font-medium ${secondaryTextClass}`}>
                  {playlist.owner.avatar && <img src={getAvatarUrl(playlist.owner.avatar) || playlist.owner.avatar} className={`w-6 h-6 rounded-full border shadow-sm ${dominantColorData?.isLight ? 'border-black/20' : 'border-white/30'}`} />}
                  <span className="hover:underline cursor-pointer transition-opacity">{playlist.owner.name || playlist.owner.username}</span>
                  <span>•</span>
                  <span>Обновлен {formattedDate}</span>
              </div>

              <div className={`flex flex-wrap items-center gap-3 transition-all duration-300 ${isEditing ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>
                  <Tooltip content={isPlaying && currentTrack && tracks.some((t: any) => t.id === currentTrack.id) ? "Остановить" : "Воспроизвести плейлист"} position="top">
                    <button 
                      onClick={handlePlay}
                      className="h-14 px-8 rounded-full font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(0,0,0,0.4)] cursor-pointer text-base disabled:opacity-50 text-white border border-white/30"
                      disabled={tracks.length === 0}
                      style={{ 
                          backgroundColor: dominantColorData ? dominantColorData.color : (isDarkMode ? '#3f3f46' : '#18181b'),
                          backgroundImage: dominantColorData ? 'linear-gradient(rgba(255,255,255,0.15), rgba(255,255,255,0.15))' : undefined
                      }}
                    >
                      {isPlaying && currentTrack && tracks.some((t: any) => t.id === currentTrack.id) 
                          ? <span className="flex items-center gap-2 drop-shadow-md"><Pause size={22} fill="white" /> Пауза</span> 
                          : <span className="flex items-center gap-2 drop-shadow-md"><Play size={22} fill="white" /> Слушать</span>
                      }
                    </button>
                  </Tooltip>
                  
                  {playlist.owner.id === 1 && !isEditing && (
                    <Tooltip content="Изменить название" position="top">
                      <button onClick={() => { setEditTitle(playlist.title); setIsEditing(true); }} className={`h-14 w-14 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md border ${actionButtonClass}`}>
                          <Edit2 size={24} />
                      </button>
                    </Tooltip>
                  )}
                  
                  <Tooltip content="Удалить плейлист" position="top">
                    <button onClick={() => setIsDeleteModalOpen(true)} className={`h-14 w-14 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md border ${actionButtonClass} hover:text-red-500`}>
                        <Trash2 size={24} />
                    </button>
                  </Tooltip>
                  
                  <Tooltip content="Добавить треки" position="top">
                    <button onClick={() => setIsAddTrackPanelOpen(true)} className={`h-14 w-14 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg backdrop-blur-md border ${actionButtonClass}`}>
                        <Plus size={24} />
                    </button>
                  </Tooltip>
              </div>
          </div>
       </div>

       <div className="p-4 md:p-8 flex-1 flex flex-col relative z-20 w-full">
          {tracks.length > 0 ? (
              <div className="w-full">
                 <div className={`flex items-center gap-4 px-3 py-2 mb-4 text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'text-zinc-500 border-white/10' : 'text-zinc-400 border-black/10'}`}>
                     <div className="w-6 text-center">#</div>
                     <div className="w-12" />
                     <div className="flex-1">Название</div>
                     <div className="flex items-center gap-6">
                         <div className="w-10 text-right"><Clock size={14} className="inline-block" /></div>
                         <div className="w-8" />
                     </div>
                 </div>

                 <div className="space-y-1.5">
                 {tracks.map((track: any, index: number) => {
                     const isCurrent = currentTrack?.id === track.id;
                     return (
                        <div 
                            key={track.id} 
                            className={`group flex items-center gap-4 p-3 rounded-xl transition-all border
                                ${isCurrent 
                                    ? (isDarkMode ? 'bg-white/10 border-white/20 shadow-md' : 'bg-zinc-200 border-zinc-300 shadow-md') 
                                    : (isDarkMode ? 'bg-zinc-900/40 border-white/5 hover:bg-white/5 hover:border-white/10' : 'bg-white border-black/5 hover:bg-white hover:border-black/10 hover:shadow-sm')
                                }
                            `}
                        >
                            <div onClick={() => playTrack(track)} className="w-6 text-center cursor-pointer relative flex items-center justify-center">
                                <span className={`text-sm font-medium text-zinc-500 group-hover:hidden ${isCurrent ? 'text-lime-500' : ''}`}>{index + 1}</span>
                                <div className="hidden group-hover:flex justify-center">
                                    <Play size={16} className={isDarkMode ? "text-white" : "text-black"} fill="currentColor" />
                                </div>
                            </div>

                            <div onClick={() => playTrack(track)} className="relative w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0 shadow-sm border border-white/5 cursor-pointer">
                                {track.coverUrl && <img src={getAvatarUrl(track.coverUrl) || track.coverUrl} className="w-full h-full object-cover" />}
                                 {isCurrent && isPlaying && (
                                     <div className="absolute inset-0 flex items-end justify-center pb-1 gap-0.5 bg-black/40 backdrop-blur-[1px]">
                                         <motion.div animate={{ height: [4, 12, 6] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-lime-400 rounded-t-sm" />
                                         <motion.div animate={{ height: [10, 5, 14] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-lime-400 rounded-t-sm" />
                                         <motion.div animate={{ height: [6, 12, 4] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1 bg-lime-400 rounded-t-sm" />
                                     </div>
                                 )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className={`font-bold text-sm truncate ${isCurrent ? 'text-lime-500' : (isDarkMode ? 'text-zinc-100' : 'text-zinc-900')}`}>{track.title}</div>
                                <div className={`text-xs truncate font-medium ${isCurrent ? 'text-lime-500/70' : 'text-zinc-500'}`}>{track.artist.name}</div>
                            </div>

                            <div className="flex items-center gap-6 text-sm font-medium">
                                 <span className={`font-mono w-10 text-right ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                     {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                 </span>
                                 
                                 <Tooltip content="Убрать из плейлиста" position="top">
                                   <button onClick={(e) => { e.stopPropagation(); setTrackToRemove(track.id); }} className="text-zinc-400 hover:text-red-500 transition-colors p-2 hover:bg-red-500/10 rounded-full cursor-pointer">
                                       <Trash2 size={18} />
                                   </button>
                                 </Tooltip>
                            </div>
                        </div>
                     )
                 })}
                 </div>
              </div>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center pb-20 opacity-60">
                 <div className={`p-6 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-200/50'}`}>
                    <Search size={32} className={isDarkMode ? 'text-zinc-500' : 'text-zinc-400'} />
                 </div>
                 <span className="text-lg font-medium text-zinc-500">В этом плейлисте пока нет треков</span>
              </div>
          )}
       </div>
    </div>
  );
}