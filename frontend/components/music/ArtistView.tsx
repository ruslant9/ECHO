'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { ArrowLeft, Play, Pause, Loader, Disc, Music2, Music, Mic2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import { getAverageColor, ColorResult } from '@/lib/color-utils';
import TrackRow from './TrackRow';
import AlbumCard from './AlbumCard';

const GET_ARTIST_DETAILS = gql`
 query GetArtistDetails($id: Int!) {
    getArtist(id: $id) { 
      id name bio avatar 
      albums { 
        id title coverUrl year releaseDate 
        tracks { id } 
      }
      featuredInAlbums { 
        id title coverUrl year releaseDate 
        tracks { id }
      }
    }
    getArtistTopTracks(artistId: $id) { 
      id title url duration isLiked coverUrl 
      artist { id name } 
      featuredArtists { id name } 
      album { id title }
      releaseDate
    }
  }
`;

const ExpandableGrid = ({ items, title, icon: Icon, onAlbumClick }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!items || items.length === 0) return null;

  const displayItems = isExpanded ? items : items.slice(0, 8);

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Icon size={24} className="text-lime-400" /> {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
        {displayItems.map((album: any) => (
          <AlbumCard key={album.id} album={album} onClick={onAlbumClick} />
        ))}
      </div>
      
      {items.length > 8 && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-8 mx-auto flex items-center gap-3 px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-sm font-bold transition-all cursor-pointer border border-white/10 shadow-lg"
        >
          {isExpanded ? (
            <><ChevronUp size={20} /> Скрыть</>
          ) : (
            <><ChevronDown size={20} /> Показать еще ({items.length - 8})</>
          )}
        </button>
      )}
    </section>
  );
};

export default function ArtistView({ artistId, onBack, onAlbumClick }: { artistId: number, onBack: () => void, onAlbumClick: (id: number) => void }) {
  const { isDarkMode } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
  const [dominantColorData, setDominantColorData] = useState<ColorResult | null>(null);

  const { data, loading, error } = useQuery(GET_ARTIST_DETAILS, { 
    variables: { id: artistId },
    fetchPolicy: 'cache-and-network' 
  });

  const artist = data?.getArtist;
  const rawTracks = data?.getArtistTopTracks || [];

  // Вспомогательная функция для сортировки по дате (от новых к старым)
  const sortByDateDesc = (a: any, b: any) => {
    // Пытаемся взять время из releaseDate, если его нет - из поля year, если и его нет - 0
    const timeA = a.releaseDate ? new Date(a.releaseDate).getTime() : (a.year ? a.year * 1000000000 : 0);
    const timeB = b.releaseDate ? new Date(b.releaseDate).getTime() : (b.year ? b.year * 1000000000 : 0);
    
    return timeB - timeA; // От большего к меньшему
  };

  // 1. Сортировка всех треков и выделение ТОП-5
  const topTracks = useMemo(() => {
    return [...rawTracks].sort(sortByDateDesc).slice(0, 5);
  }, [rawTracks]);

  // 2. Уникальное "Участие в релизах" без дублей и с сортировкой
 const featuredAlbumsUnique = useMemo(() => {
    if (!artist?.featuredInAlbums) return [];

    const seen = new Set();
    const uniqueList: any[] = [];

    artist.featuredInAlbums.forEach((alb: any) => {
      // Создаем уникальный ключ: ID или Название (на случай если ID разные)
      // Если мы уже видели это название или этот ID — пропускаем
      const identifier = `${alb.id}-${alb.title}`; 
      
      if (!seen.has(identifier)) {
        seen.add(identifier);
        uniqueList.push(alb);
      }
    });

    // Сортируем: сначала новые
    return uniqueList.sort(sortByDateDesc);
  }, [artist]);

  // 2. Сортировка основных релизов (Альбомы / Синглы)
  const { albumsOnly, singlesOnly } = useMemo(() => {
    const albums = artist?.albums || [];
    
    // Убираем дубликаты здесь тоже (на всякий случай)
    const uniqueMap = new Map();
    albums.forEach((alb: any) => uniqueMap.set(alb.title, alb));
    const uniqueAlbums = Array.from(uniqueMap.values());

    const sorted = uniqueAlbums.sort(sortByDateDesc);

    return {
        albumsOnly: sorted.filter((a: any) => (a.tracks?.length || 0) >= 2),
        singlesOnly: sorted.filter((a: any) => (a.tracks?.length || 0) < 2),
    };
  }, [artist]);

  // 4. Сольные треки (которые не входят в альбомы этого артиста)
  const looseTracks = useMemo(() => {
    return rawTracks
        .filter((t: any) => !t.album)
        .sort(sortByDateDesc);
  }, [rawTracks]);

  useEffect(() => {
    if (artist?.avatar) {
      const url = getAvatarUrl(artist.avatar);
      if (url) {
        getAverageColor(url).then(setDominantColorData).catch(() => setDominantColorData(null));
      }
    }
  }, [artist]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader className="animate-spin text-lime-400" /></div>;
  if (error || !artist) return <div className="pt-24 p-8 text-center">Артист не найден</div>;

  const handlePlayTop = () => {
    const sortedAll = [...rawTracks].sort(sortByDateDesc);
    if (sortedAll.length > 0) playTrack(sortedAll[0], sortedAll);
  };

  const isPlayingArtist = rawTracks.some((t: any) => t.id === currentTrack?.id) && isPlaying;
  const scrollbarColor = dominantColorData?.color || (isDarkMode ? '#52525b' : '#a1a1aa');

  return (
    <div className={`relative min-h-full flex flex-col ${isDarkMode ? 'bg-black' : 'bg-zinc-50'}`}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 22px; }
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
         style={dominantColorData ? { backgroundColor: dominantColorData.color } : { backgroundColor: '#18181b' }}
      >
        <button onClick={onBack} className="absolute top-10 left-10 p-2.5 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors z-20 cursor-pointer border border-white/10">
            <ArrowLeft size={24} />
        </button>

        <div className="w-52 h-52 md:w-60 md:h-60 shrink-0 rounded-full shadow-2xl overflow-hidden bg-zinc-800 border-4 border-white/10 relative z-10">
           {artist.avatar ? (
             <img src={getAvatarUrl(artist.avatar) || ''} className="w-full h-full object-cover" alt={artist.name} />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-zinc-500 text-6xl font-bold">{artist.name[0]}</div>
           )}
        </div>

        <div className="flex-1 z-10 w-full drop-shadow-lg text-white">
           <div className="text-sm font-bold uppercase mb-2 tracking-widest flex items-center gap-2 opacity-80">
               <Mic2 size={16} /> Исполнитель
           </div>
           <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-none">{artist.name}</h1>
           
           <button 
             onClick={handlePlayTop}
             disabled={rawTracks.length === 0}
             className="h-14 px-8 rounded-full font-bold flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-2xl cursor-pointer text-base bg-lime-400 text-black border border-lime-300"
           >
             {isPlayingArtist ? <><Pause size={22} fill="currentColor"/> Пауза</> : <><Play size={22} fill="currentColor"/> Слушать</>}
           </button>
        </div>
      </div>

      <div className="p-4 md:p-8 flex-1 flex flex-col relative z-20 w-full">
         
         {/* ПОПУЛЯРНЫЕ (ОТСОРТИРОВАННЫЕ) ТРЕКИ */}
         <section className="mb-12">
            <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Последние релизы</h2>
            <div className="space-y-1">
               {topTracks.map((track: any, idx: number) => (
                  <div key={track.id} className="flex gap-4 items-center">
                    <span className="w-6 text-center text-sm text-zinc-500 font-mono pt-1">{idx + 1}</span>
                    <div className="flex-1">
                        <TrackRow track={track} trackList={rawTracks} />
                    </div>
                  </div>
               ))}
            </div>
         </section>

         {/* АЛЬБОМЫ (ОТСОРТИРОВАНЫ) */}
         <ExpandableGrid title="Альбомы" items={albumsOnly} icon={Disc} onAlbumClick={onAlbumClick} />
         
         {/* СИНГЛЫ (ОТСОРТИРОВАНЫ) */}
         <ExpandableGrid title="Синглы" items={singlesOnly} icon={Music2} onAlbumClick={onAlbumClick} />

         {/* СОЛЬНЫЕ ТРЕКИ (ОТСОРТИРОВАНЫ) */}
         {looseTracks.length > 0 && (
            <section className="mb-12">
                <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                   <Mic2 size={24} className="text-lime-400" /> Сольные треки
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    {looseTracks.map((track: any) => (
                        <TrackRow key={track.id} track={track} trackList={looseTracks} />
                    ))}
                </div>
            </section>
         )}

         {/* УЧАСТИЕ В РЕЛИЗАХ (БЕЗ ДУБЛИКАТОВ + ОТСОРТИРОВАНО) */}
         <ExpandableGrid title="Участие в релизах" items={featuredAlbumsUnique} icon={Music} onAlbumClick={onAlbumClick} />
      </div>
    </div>
  );
}