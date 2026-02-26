'use client';

import { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { Play, Pause, Search, Trash2, Edit2, Plus, ArrowLeft, Loader, Check, Camera, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getAvatarUrl } from '@/lib/avatar-url';
import Cookies from 'js-cookie';
import AddTrackPanel from './AddTrackPanel';

const GET_PLAYLIST = gql`
  query GetPlaylist($id: Int!) {
    playlist(id: $id) {
      id
      title
      coverUrl
      createdAt
      owner { id username name avatar }
      tracks { id title url duration isLiked artist { name } coverUrl }
    }
  }
`;

const SEARCH_TRACKS = gql`
    query SearchTracksForPlaylist($query: String!) {
        searchMusic(query: $query) { id title url coverUrl artist { name } duration }
    }
`;

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
  const [isAddTrackPanelOpen, setIsAddTrackPanelOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, refetch } = useQuery(GET_PLAYLIST, { variables: { id: playlistId }, fetchPolicy: 'cache-and-network' });

  const { data: searchData } = useQuery(SEARCH_TRACKS, {
    variables: { query: searchQuery },
    skip: searchQuery.length < 2
  });

  const [removeTrack] = useMutation(REMOVE_TRACK, { onCompleted: () => refetch() });
  const [deletePlaylist] = useMutation(DELETE_PLAYLIST, { onCompleted: onBack });
  const [updatePlaylist] = useMutation(UPDATE_PLAYLIST, {
    onCompleted: () => {
      setIsEditing(false);
      refetch();
    }
  });

  const playlist = data?.playlist;
  const tracks: any[] = playlist?.tracks || [];
  const existingTrackIds = useMemo(() => new Set(tracks.map((t) => t.id as number)), [tracks]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader className="animate-spin text-lime-400"/></div>;
  if (!playlist) return <div className="pt-24 p-8 text-center">Плейлист не найден</div>;

  const bgColor = isDarkMode ? 'from-[#424131] to-[#181818]' : 'from-[#d4d4aa] to-white';

  const handlePlay = () => {
      if (tracks.length > 0) playTrack(tracks[0]);
  };

  const handleSaveEdit = () => {
      if (editTitle.trim() === playlist.title) {
          setIsEditing(false);
          return;
      }
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
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        const data = await res.json();
        await updatePlaylist({ variables: { input: { id: playlistId, coverUrl: data.url } } });
    } catch (err) {
        console.error("Cover upload error:", err);
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#181818]' : 'bg-white'}`}>
       
       <AddTrackPanel 
          isOpen={isAddTrackPanelOpen}
          onClose={() => setIsAddTrackPanelOpen(false)}
          playlistId={playlistId}
          existingTrackIds={existingTrackIds}
          onTrackAdded={refetch}
       />

       <ConfirmationModal 
          isOpen={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)} 
          onConfirm={() => deletePlaylist({ variables: { id: playlistId } })}
          title="Удалить плейлист?"
          message="Это действие нельзя отменить."
       />

       {/* Шапка плейлиста */}
       <div className={`relative p-8 pb-10 flex flex-col md:flex-row gap-8 items-start md:items-end bg-linear-to-b ${bgColor} pt-24 md:pt-32 shrink-0`}>
          
          <div className="absolute top-0 left-0 right-0 h-40 bg-linear-to-b from-black/50 to-transparent pointer-events-none z-0" />

          <button 
            onClick={onBack} 
            className="absolute top-10 left-10 p-2.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-20 backdrop-blur-md cursor-pointer"
          >
              <ArrowLeft size={24} />
          </button>

          <div className="w-52 h-52 md:w-60 md:h-60 shrink-0 rounded-xl shadow-2xl overflow-hidden bg-zinc-800 relative group z-10">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCoverChange} />
              {playlist.coverUrl ? (
                  <img src={getAvatarUrl(playlist.coverUrl) || playlist.coverUrl} className="w-full h-full object-cover" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-500 font-bold text-5xl select-none">
                      {playlist.title[0]?.toUpperCase()}
                  </div>
              )}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
              >
                  <Camera size={40} />
                  <span className="text-sm font-bold mt-2">Изменить</span>
              </div>
          </div>

          <div className="flex-1 text-white z-10 w-full drop-shadow-md">
              <div className="text-sm font-bold uppercase opacity-90 mb-2 tracking-widest">Плейлист</div>
              
              {isEditing ? (
                  <div className="flex gap-3 mb-4 items-center">
                      <input 
                        value={editTitle} 
                        onChange={e => setEditTitle(e.target.value)} 
                        className="text-3xl md:text-5xl font-bold bg-black/30 rounded-xl px-4 py-1 outline-none w-full border border-white/20 text-white"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                      />
                      <button onClick={handleSaveEdit} className="p-3 bg-lime-400 text-black rounded-full hover:bg-lime-500 transition-colors shadow-lg cursor-pointer"><Check size={24}/></button>
                      <button onClick={() => setIsEditing(false)} className="p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors cursor-pointer"><X size={24}/></button>
                  </div>
              ) : (
                  <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-none">{playlist.title}</h1>
              )}
              
              <div className="flex items-center gap-3 text-sm mb-8 font-medium">
                  {playlist.owner.avatar && <img src={getAvatarUrl(playlist.owner.avatar) || playlist.owner.avatar} className="w-6 h-6 rounded-full border border-white/20" />}
                  <span className="hover:underline cursor-pointer opacity-90 hover:opacity-100 transition-opacity">{playlist.owner.name || playlist.owner.username}</span>
                  <span className="opacity-60">•</span>
                  <span className="opacity-80">Обновлен {new Date(playlist.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Кнопки управления (кнопка лайка удалена) */}
              <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={handlePlay}
                    className="h-14 px-8 bg-[#f5cb42] hover:bg-[#e3bb3b] text-black rounded-full font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl cursor-pointer text-base disabled:opacity-50"
                    disabled={tracks.length === 0}
                  >
                     {isPlaying && currentTrack && tracks.some((t: any) => t.id === currentTrack.id) 
                        ? <span className="flex items-center gap-2"><Pause size={22} fill="black" /> Пауза</span> 
                        : <span className="flex items-center gap-2"><Play size={22} fill="black" /> Слушать</span>
                     }
                  </button>
                  
                  {playlist.owner.id === 1 && !isEditing && ( // TODO: заменить 1 на currentUserId
                      <button onClick={() => { setEditTitle(playlist.title); setIsEditing(true); }} className="h-12 w-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10">
                          <Edit2 size={22} />
                      </button>
                  )}
                   <button onClick={() => setIsDeleteModalOpen(true)} className="h-12 w-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-red-500/80 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10">
                      <Trash2 size={22} />
                  </button>
                  <button 
                    onClick={() => setIsAddTrackPanelOpen(true)} 
                    className="h-12 w-12 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors cursor-pointer border border-white/10"
                  >
                      <Plus size={22} />
                  </button>
              </div>
          </div>
       </div>

       {/* Список треков */}
       <div className={`p-4 md:p-8 flex-1 flex flex-col`}>
          {tracks.length > 0 ? (
              <div className="space-y-1 w-full">
                 {tracks.map((track: any, index: number) => {
                     const isCurrent = currentTrack?.id === track.id;
                     return (
                        <div 
                            key={track.id} 
                            className={`group flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer border border-transparent
                                ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-zinc-100'}
                                ${isCurrent ? (isDarkMode ? 'bg-white/10' : 'bg-zinc-100') : ''}
                            `}
                            onClick={() => playTrack(track)}
                        >
                            <div className="w-6 text-center text-sm font-medium text-zinc-500 group-hover:hidden">
                                {index + 1}
                            </div>
                            <div className="w-6 hidden group-hover:flex justify-center">
                                <Play size={16} className={isDarkMode ? "text-white" : "text-black"} fill="currentColor" />
                            </div>

                            <div className="relative w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0 shadow-sm">
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
                                <div className="text-xs text-zinc-500 truncate font-medium">{track.artist.name}</div>
                            </div>

                            <div className="flex items-center gap-6 text-zinc-500 text-sm font-medium">
                                 <span className="font-mono w-10 text-right">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}</span>
                                 
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); removeTrack({ variables: { playlistId, trackId: track.id } }); }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity p-2 hover:bg-red-500/10 rounded-full cursor-pointer"
                                 >
                                     <Trash2 size={18} />
                                 </button>
                            </div>
                        </div>
                     )
                 })}
              </div>
          ) : (
              // Текст об отсутствии треков отцентрирован по всему экрану
              <div className="flex-1 flex flex-col items-center justify-center pb-20 opacity-60">
                 <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
                    <Search size={32} className="text-zinc-500" />
                 </div>
                 <span className="text-lg font-medium text-zinc-500">В этом плейлисте пока нет треков</span>
              </div>
          )}
       </div>
    </div>
  );
}