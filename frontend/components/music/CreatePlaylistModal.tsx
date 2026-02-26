'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Loader, Music, Check, Plus } from 'lucide-react';
import { gql, useMutation, useQuery } from '@apollo/client';
import LiquidGlassModal from '../LiquidGlassModal';
import Cookies from 'js-cookie';
import { getAvatarUrl } from '@/lib/avatar-url';
import { useTheme } from '@/context/ThemeContext';

// 1. Запрос на создание плейлиста
const CREATE_PLAYLIST = gql`
  mutation CreatePlaylist($input: CreatePlaylistInput!) {
    createPlaylist(input: $input) { id }
  }
`;

// 2. Запрос на получение сохраненных треков пользователя (для выбора)
const GET_MY_LIBRARY = gql`
  query GetMyMusicForPlaylistCreate {
    myMusicLibrary {
      id
      title
      coverUrl
      artist { name }
    }
  }
`;

// 3. Запрос на добавление трека в плейлист
const ADD_TRACK = gql`
  mutation AddTrackToPlaylistCreate($playlistId: Int!, $trackId: Int!) {
    addTrackToPlaylist(playlistId: $playlistId, trackId: $trackId)
  }
`;

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlaylistId: number) => void;
}

export default function CreatePlaylistModal({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) {
  const { isDarkMode } = useTheme();
  
  const [title, setTitle] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Состояние общей отправки
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<number>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Получаем библиотеку пользователя
  const { data: libData, loading: libLoading } = useQuery(GET_MY_LIBRARY, {
    skip: !isOpen,
    fetchPolicy: 'cache-first'
  });

  const [createPlaylist] = useMutation(CREATE_PLAYLIST);
  const [addTrack] = useMutation(ADD_TRACK);

  // Сброс состояний при закрытии
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setCoverPreview(null);
      setSelectedTrackIds(new Set());
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
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
        setCoverPreview(data.url); // Сохраняем относительный URL
    } catch (e) {
        console.error(e);
    } finally {
        setIsUploading(false);
    }
  };

  const toggleTrack = (trackId: number) => {
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Шаг 1: Создаем сам плейлист
      const { data } = await createPlaylist({
          variables: {
              input: { title, coverUrl: coverPreview }
          }
      });
      const newPlaylistId = data.createPlaylist.id;

      // Шаг 2: Если выбраны треки, добавляем их по очереди
      if (selectedTrackIds.size > 0) {
        const promises = Array.from(selectedTrackIds).map(trackId => 
           addTrack({ variables: { playlistId: newPlaylistId, trackId } })
        );
        await Promise.all(promises);
      }

      onSuccess(newPlaylistId);
      onClose();
    } catch (e) {
      console.error("Ошибка при создании плейлиста:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const library = libData?.myMusicLibrary || [];

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 flex flex-col max-h-[85vh]">
        {/* Хедер */}
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-bold">Новый плейлист</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Обложка и Название */}
        <div className="flex gap-4 mb-6 shrink-0">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 bg-zinc-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors relative overflow-hidden shrink-0 border border-zinc-700"
            >
                {/* ИСПРАВЛЕНИЕ: Используем getAvatarUrl для превью картинки */}
                {coverPreview ? (
                    <img src={getAvatarUrl(coverPreview) || coverPreview} className="w-full h-full object-cover" alt="Cover preview" />
                ) : (
                    <Camera className="text-zinc-500" size={32} />
                )}
                {isUploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm"><Loader className="animate-spin text-lime-400" /></div>}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="flex-1 flex flex-col justify-center">
                <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Название</label>
                <input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="Мой плейлист" 
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 outline-none focus:border-lime-400 text-white transition-colors"
                    autoFocus
                />
            </div>
        </div>

        {/* Разделитель */}
        <div className={`h-px w-full shrink-0 mb-4 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

        {/* Зона выбора треков (Скроллируемая) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar mb-6 min-h-[150px]">
          <h3 className="text-sm font-bold text-zinc-500 uppercase mb-3 px-1 tracking-wider">Добавить треки</h3>
          
          {libLoading ? (
            <div className="flex items-center justify-center h-32"><Loader className="animate-spin text-lime-400" /></div>
          ) : library.length === 0 ? (
            // ИСПРАВЛЕНИЕ: Заглушка, если нет музыки в библиотеке
            <div className="flex flex-col items-center justify-center h-32 opacity-50 text-center px-4">
              <Music size={32} className="mb-2 text-zinc-500" />
              <p className="text-sm font-medium">Ваша библиотека пуста</p>
              <p className="text-xs mt-1">Добавьте музыку в "Моя музыка", чтобы собрать свой первый плейлист.</p>
            </div>
          ) : (
            <div className="space-y-1 px-1">
              {library.map((track: any) => {
                const isSelected = selectedTrackIds.has(track.id);
                return (
                  <div 
                    key={track.id} 
                    onClick={() => toggleTrack(track.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border
                      ${isSelected 
                        ? (isDarkMode ? 'bg-lime-400/10 border-lime-400/30' : 'bg-lime-100 border-lime-300') 
                        : (isDarkMode ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-black/5')
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={getAvatarUrl(track.coverUrl) || '/disc.png'} className="w-10 h-10 rounded-lg object-cover bg-zinc-800" alt="track" />
                      <div className="flex-1 min-w-0">
                        <div className={`truncate font-semibold text-sm ${isSelected ? (isDarkMode ? 'text-lime-400' : 'text-lime-700') : ''}`}>{track.title}</div>
                        <div className="truncate text-xs text-zinc-500">{track.artist.name}</div>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all
                      ${isSelected ? 'bg-lime-400 border-lime-400 text-black' : 'border-zinc-500 text-transparent'}
                    `}>
                      {isSelected ? <Check size={14} strokeWidth={3} /> : <Plus size={14} className="text-zinc-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Кнопка отправки */}
        <button 
            onClick={handleSubmit} 
            disabled={!title.trim() || isUploading || isSubmitting}
            className="w-full shrink-0 py-3.5 bg-lime-400 text-black font-bold rounded-xl hover:bg-lime-500 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2"
        >
            {isSubmitting ? <><Loader size={18} className="animate-spin"/> Создание...</> : 'Создать плейлист'}
        </button>
      </div>
    </LiquidGlassModal>
  );
}