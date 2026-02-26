'use client';
import { useState, useEffect } from 'react';
import { useMutation, gql } from '@apollo/client';
import { Heart, Play, Pause } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { getAvatarUrl } from '@/lib/avatar-url';

const TOGGLE_LIKE = gql`mutation ToggleTrackLike($trackId: Int!) { toggleTrackLike(trackId: $trackId) }`;

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function TrackRow({ track, onLikeToggle }: { track: any, onLikeToggle?: () => void }) {
  const { isDarkMode } = useTheme();
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
  
  // Синхронизируем состояние с пропсом (важно при обновлении родителя)
  const [isLiked, setIsLiked] = useState(track.isLiked);

  useEffect(() => {
    setIsLiked(track.isLiked);
  }, [track.isLiked]);

  const [toggleLike] = useMutation(TOGGLE_LIKE, {
      variables: { trackId: track.id },
      onCompleted: () => {
          // Сообщаем родителю об изменении
          if (onLikeToggle) onLikeToggle();
      },
      onError: () => setIsLiked(!isLiked) // Откат при ошибке
  });

  const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newState = !isLiked;
      setIsLiked(newState); 
      toggleLike();
  };

  const isCurrent = currentTrack?.id === track.id;
  const playingNow = isCurrent && isPlaying;

  return (
    <div 
        onClick={() => playTrack(track)}
        className={`group flex items-center gap-4 p-3 rounded-2xl transition-all cursor-pointer border border-transparent
            ${isDarkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-100'}
            ${isCurrent ? (isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200') : ''}
        `}
    >
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
            <img src={getAvatarUrl(track.coverUrl) || '/disc.png'} className="w-full h-full object-cover" alt={track.title} />
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity backdrop-blur-[1px]
                ${playingNow ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {playingNow ? <Pause size={20} className="text-white fill-current" /> : <Play size={20} className="text-white fill-current ml-1" />}
            </div>
        </div>

        <div className="flex-1 min-w-0">
            <h4 className={`font-bold text-sm truncate ${isCurrent ? 'text-lime-400' : (isDarkMode ? 'text-white' : 'text-zinc-900')}`}>{track.title}</h4>
            <p className="text-xs text-zinc-500 truncate font-medium">{track.artist.name}</p>
        </div>

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