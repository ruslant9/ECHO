'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { gql, useMutation } from '@apollo/client';

const RECORD_PLAYBACK = gql`
  mutation RecordPlayback($trackId: Int!) {
    recordPlayback(trackId: $trackId)
  }
`;

interface Track {
  id: number;
  title: string;
  url: string;
  coverUrl?: string;
  artist: { id: number; name: string };
  album?: { id: number; title: string };
  duration: number;
  isLiked: boolean;
}

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  buffered: number; // % загрузки в буфер
  trackList: Track[];
  playTrack: (track: Track, list?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  closePlayer: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [trackList, setTrackList] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffered, setBuffered] = useState(0); // Состояние буферизации
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [recordPlayback] = useMutation(RECORD_PLAYBACK);

  // Инициализация аудио элемента
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      // 'metadata' - грузит только инфо о треке (длительность), не качая сам файл
      audio.preload = 'metadata'; 
      audioRef.current = audio;

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, []);

  // Синхронизация прогресса загрузки (буфера)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateBuffer = () => {
      if (audio.buffered.length > 0 && audio.duration > 0) {
        // Находим кусок буфера, который соответствует текущему времени воспроизведения
        let currentBufferEnd = 0;
        for (let i = 0; i < audio.buffered.length; i++) {
          if (audio.buffered.start(i) <= audio.currentTime) {
            currentBufferEnd = audio.buffered.end(i);
          }
        }
        setBuffered((currentBufferEnd / audio.duration) * 100);
      }
    };

    audio.addEventListener('progress', updateBuffer);
    audio.addEventListener('waiting', () => {}); // Можно добавить лоадер, если буфер пуст
    
    return () => {
      audio.removeEventListener('progress', updateBuffer);
    };
  }, [currentTrack]);

  // Запись в историю
  useEffect(() => {
    if (currentTrack?.id && isPlaying) {
      recordPlayback({ variables: { trackId: currentTrack.id } }).catch(() => {});
    }
  }, [currentTrack?.id, isPlaying, recordPlayback]);

  const playTrack = useCallback((track: Track, list: Track[] = []) => {
    if (!audioRef.current) return;

    if (list.length > 0) setTrackList(list);

    if (currentTrack?.id === track.id) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400';
    const src = track.url.startsWith('http') ? track.url : `${baseUrl}${track.url}`;
    
    setBuffered(0); // Сбрасываем буфер при смене трека
    audioRef.current.src = src;
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(e => console.error("Ошибка воспроизведения:", e));
      
    setCurrentTrack(track);
    localStorage.setItem('last_played_track', JSON.stringify(track));
  }, [currentTrack]);

  const nextTrack = useCallback(() => {
    if (trackList.length === 0 || !currentTrack) return;
    const currentIndex = trackList.findIndex(t => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < trackList.length - 1) {
      playTrack(trackList[currentIndex + 1]);
    } else {
      setIsPlaying(false);
    }
  }, [trackList, currentTrack, playTrack]);

  const prevTrack = useCallback(() => {
    if (trackList.length === 0 || !currentTrack) return;
    const currentIndex = trackList.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(trackList[currentIndex - 1]);
    } else if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [trackList, currentTrack, playTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => nextTrack();
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [nextTrack]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setBuffered(0);
  };

  return (
    <MusicContext.Provider value={{ 
      currentTrack, isPlaying, buffered, trackList, 
      playTrack, togglePlay, nextTrack, prevTrack, closePlayer, audioRef 
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export const useMusicPlayer = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusicPlayer must be used within MusicProvider');
  return context;
};