'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import { ArrowLeft, Play, Pause, Loader, Calendar, User, Clock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import { getAverageColor, ColorResult } from '@/lib/color-utils';
import TrackRow from './TrackRow';

const GET_ALBUM = gql`
  query GetAlbum($id: Int!) {
    getAlbum(id: $id) {
      id title coverUrl genre year releaseDate
      artist { id name }
      featuredArtists { id name }
      tracks { 
        id title url duration isLiked coverUrl
        artist { id name } 
        featuredArtists { id name } 
        album { id title }
      }
    }
  }
`;

export default function AlbumView({ albumId, onBack, onArtistClick }: { albumId: number, onBack: () => void, onArtistClick: (id: number) => void }) {
  const { isDarkMode } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
  const [dominantColorData, setDominantColorData] = useState<ColorResult | null>(null);

  const { data, loading, error } = useQuery(GET_ALBUM, { 
      variables: { id: albumId },
      fetchPolicy: 'cache-and-network' 
  });
  
  const album = data?.getAlbum;
  const tracks = album?.tracks || [];

  // Определяем, сингл это или альбом (меньше 2 треков = сингл)
  const isSingle = tracks.length < 2;

  useEffect(() => {
    if (album?.coverUrl) {
      const url = getAvatarUrl(album.coverUrl);
      if (url) getAverageColor(url).then(setDominantColorData).catch(() => setDominantColorData(null));
    }
  }, [album]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader className="animate-spin text-lime-400" /></div>;
  if (error) return <div className="pt-24 p-8 text-center text-red-500">Ошибка загрузки альбома</div>;
  if (!album) return <div className="pt-24 p-8 text-center">Альбом не найден</div>;

  const isThisAlbumPlaying = currentTrack && tracks.some((t: any) => t.id === currentTrack.id) && isPlaying;

  const handlePlayBigButton = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks); 
    }
  };

  const formattedDate = album.releaseDate 
    ? new Date(album.releaseDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : album.year;

  const scrollbarColor = dominantColorData?.color || (isDarkMode ? '#52525b' : '#a1a1aa');

  return (
    <div className={`relative min-h-full flex flex-col ${isDarkMode ? 'bg-black' : 'bg-zinc-50'}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 20px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background-color: ${scrollbarColor};
          border-radius: 9999px;
          border: 6px solid transparent;
          background-clip: padding-box;
        }
        * { scrollbar-width: auto; scrollbar-color: ${scrollbarColor} transparent; }
      `}} />

       <div 
         className="relative p-8 pb-10 flex flex-col md:flex-row gap-8 items-start md:items-end pt-24 md:pt-32 shrink-0 transition-colors duration-700"
         style={dominantColorData ? { backgroundColor: dominantColorData.color } : { backgroundColor: isDarkMode ? '#18181b' : '#d4d4d8' }}
       >
          <button onClick={onBack} className="absolute top-10 left-10 p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors z-20 border border-white/10 cursor-pointer">
              <ArrowLeft size={24} />
          </button>

          <div className="w-52 h-52 md:w-60 md:h-60 shrink-0 rounded-xl shadow-2xl overflow-hidden bg-zinc-800 border border-white/10 relative z-10">
              {album.coverUrl ? <img src={getAvatarUrl(album.coverUrl) || ''} className="w-full h-full object-cover" alt={album.title} /> : <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-5xl bg-zinc-700">{album.title[0]}</div>}
          </div>

          <div className="flex-1 z-10 w-full drop-shadow-lg text-white">
              <div className="text-sm font-bold uppercase mb-2 tracking-widest opacity-80">
                  {isSingle ? 'Сингл' : 'Альбом'}
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight leading-none">{album.title}</h1>
              
              <div className="flex items-center gap-4 text-sm mb-8 font-medium opacity-90">
                  {/* Основной артист */}
                  <div className="flex items-center gap-1">
  <User size={16} />
  <span onClick={() => onArtistClick(album.artist.id)} className="hover:underline cursor-pointer">
    {album.artist.name}
  </span>
  
  {/* ДОБАВЛЯЕМ .filter(f => f.id !== album.artist.id) СЮДА: */}
  {isSingle && album.featuredArtists?.filter((f: any) => f.id !== album.artist.id).length > 0 && (
    <>
      <span className="opacity-70 mx-1">feat.</span>
      {album.featuredArtists
        .filter((feat: any) => feat.id !== album.artist.id) // Дублируем фильтр здесь
        .map((feat: any, idx: number, filteredArr: any[]) => (
          <React.Fragment key={feat.id}>
            <span 
              onClick={(e) => { e.stopPropagation(); onArtistClick(feat.id); }} 
              className="hover:underline cursor-pointer"
            >
              {feat.name}
            </span>
            {idx < filteredArr.length - 1 && <span>, </span>}
          </React.Fragment>
        ))}
    </>
  )}
</div>


                  <span>•</span>
                  <div className="flex items-center gap-1"><Calendar size={14} /> {formattedDate}</div>
                  
                  {!isSingle && (
                      <>
                        <span>•</span>
                        <span>{tracks.length} треков</span>
                      </>
                  )}
              </div>

              <button 
                onClick={handlePlayBigButton} 
                disabled={tracks.length === 0} 
                className="h-14 px-8 rounded-full font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-2xl cursor-pointer text-base bg-lime-400 text-black border border-lime-300"
              >
                  {isThisAlbumPlaying ? <><Pause size={22} fill="currentColor"/> Пауза</> : <><Play size={22} fill="currentColor"/> Слушать</>}
              </button>
          </div>
       </div>

       <div className="p-4 md:p-8 flex-1 flex flex-col relative z-20 w-full">
          {tracks.length > 0 ? (
              <div className="space-y-1">
                 <div className="flex items-center gap-4 px-3 py-2 mb-2 text-xs font-bold uppercase tracking-wider opacity-50">
                     <div className="w-6 text-center">#</div>
                     <div className="flex-1">Название</div>
                     <div className="w-10 text-right"><Clock size={14} /></div>
                 </div>

                 {tracks.map((track: any, index: number) => (
                    <div 
                      key={track.id} 
                      className="flex gap-4 items-center group hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <span className="w-10 text-center text-sm text-zinc-500 font-mono font-medium">{index + 1}</span>
                        <div className="flex-1">
                          <TrackRow track={track} trackList={tracks} />
                        </div>
                    </div>
                 ))}
              </div>
          ) : (
              <div className="py-20 text-center opacity-50">В этом релизе еще нет треков</div>
          )}
       </div>
    </div>
  );
}