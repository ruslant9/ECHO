'use client';
import { createContext, useContext, useState, useRef, useEffect } from 'react';

interface Track {
  id: number;
  title: string;
  url: string;
  coverUrl?: string;
  artist: { name: string };
  duration: number;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>; // Экспортируем ref для доступа к прогрессу
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  closePlayer: () => void; // Новая функция
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        audioRef.current = new Audio();
        // Автопереключение можно добавить позже
    }
  }, []);

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    
    if (audioRef.current) {
      const src = track.url.startsWith('http') ? track.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${track.url}`;
      audioRef.current.src = src;
      audioRef.current.play().catch(e => console.error("Playback error:", e));
      setIsPlaying(true);
      setCurrentTrack(track);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Playback error:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Функция для закрытия плеера
  const closePlayer = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
  };

  return (
    <MusicContext.Provider value={{ currentTrack, isPlaying, playTrack, togglePlay, closePlayer, audioRef }}>
      {children}
    </MusicContext.Provider>
  );
}

export const useMusicPlayer = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusicPlayer must be used within MusicProvider');
  return context;
};