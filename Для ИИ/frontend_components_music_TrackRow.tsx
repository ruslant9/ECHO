'use client';

import { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Heart, Play, Pause, Music } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import { useRouter } from 'next/navigation';

const TOGGLE_LIKE = gql`mutation ToggleTrackLike($trackId: Int!) { toggleTrackLike(trackId: $trackId) }`;

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface TrackRowProps {
  track: any;
  onLikeToggle?: () => void;
  trackList?: any[]; // Добавили проп для очереди
}

export default function TrackRow({ track, onLikeToggle, trackList = [] }: TrackRowProps) {
  const { isDarkMode } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
  const router = useRouter();
  
  const [isLiked, setIsLiked] = useState(track.isLiked);

  useEffect(() => {
    setIsLiked(track.isLiked);
  }, [track.isLiked]);

  const [toggleLike] = useMutation(TOGGLE_LIKE, {
      variables: { trackId: track.id },
      onCompleted: () => {
          if (onLikeToggle) onLikeToggle();
      },
      onError: () => setIsLiked(!isLiked)
  });

  const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newState = !isLiked;
      setIsLiked(newState); 
      toggleLike();
  };

  const handleArtistClick = (e: React.MouseEvent, artistId: number) => {
      e.stopPropagation(); 
      router.push(`/dashboard/music?artistId=${artistId}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // ИСПРАВЛЕНИЕ: Передаем трек И список (очередь)
    playTrack(track, trackList);
  };

  const isCurrent = currentTrack?.id === track.id;
  const playingNow = isCurrent && isPlaying;
  
  const coverArtUrl = getAvatarUrl(track.coverUrl);
  const mainArtist = track.artist;
  const guests = track.featuredArtists || [];

  return (
    <div 
        className={`group flex items-center gap-4 p-3 rounded-2xl transition-all border border-transparent
            ${isDarkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'}
            ${isCurrent ? (isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200') : ''}
        `}
        onClick={handlePlayClick} // Добавили клик на всю строку для удобства
    >
        {/* Обложка трека */}
        <div 
            className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 cursor-pointer group"
        >
            {coverArtUrl ? (
              <img src={coverArtUrl} className="w-full h-full object-cover shadow-sm" alt={track.title} />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <Music size={24} className={isDarkMode ? 'text-zinc-600' : 'text-zinc-400'} />
              </div>
            )}
            
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity backdrop-blur-[1px] rounded-xl
                ${playingNow ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {playingNow ? <Pause size={20} className="text-white fill-current" /> : <Play size={20} className="text-white fill-current ml-1" />}
            </div>
        </div>

        {/* Название и Артисты */}
        <div className="flex-1 min-w-0">
            <h4 
                className={`font-bold text-sm truncate cursor-pointer hover:underline ${isCurrent ? 'text-lime-400' : (isDarkMode ? 'text-white' : 'text-zinc-900')}`}
            >
                {track.title}
            </h4>
            
            <div className="flex items-center gap-1 text-xs text-zinc-500 truncate font-medium">
                <span onClick={(e) => handleArtistClick(e, mainArtist.id)} className="hover:underline cursor-pointer">{mainArtist.name}</span>
                {guests.length > 0 && (
                    <>
                        <span className="opacity-60">, </span>
                        {guests.map((guest: any, index: number) => (
                            <span key={guest.id}>
                                <span onClick={(e) => handleArtistClick(e, guest.id)} className="hover:underline cursor-pointer">{guest.name}</span>
                                {index < guests.length - 1 && <span className="opacity-60">, </span>}
                            </span>
                        ))}
                    </>
                )}
            </div>
        </div>

        {/* Продолжительность и Лайк */}
        <div className="flex items-center gap-4">
             <div className="text-xs text-zinc-500 font-mono font-medium hidden sm:block w-10 text-right">
                {formatDuration(track.duration)}
            </div>
            
            <button 
                onClick={handleLike}
                className={`p-2 rounded-full transition-colors cursor-pointer hover:bg-black/10 dark:hover:bg-white/10
                    ${isLiked ? 'text-lime-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            >
                <Heart size={20} className={isLiked ? "fill-current" : ""} />
            </button>
        </div>
    </div>
  );
}