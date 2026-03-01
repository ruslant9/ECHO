'use client';

import { useState, useRef, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import { X, Camera, Loader, Image as ImageIcon, Calendar as CalendarIcon, Music, ChevronUp, ChevronDown, Plus, Trash2, AlertCircle } from 'lucide-react';
import LiquidGlassModal from '@/components/LiquidGlassModal';
import { getAvatarUrl } from '@/lib/avatar-url';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';
import CustomCalendar from '@/components/CustomCalendar';

// === МУТАЦИИ ===
const CREATE_ALBUM = gql`mutation CreateAlbum($input: CreateAlbumInput!) { createAlbumAdmin(input: $input) }`;
const UPDATE_ALBUM = gql`mutation AdminUpdateAlbum($input: UpdateAlbumInput!) { adminUpdateAlbum(input: $input) { id title } }`;

const CREATE_TRACK = gql`mutation CreateTrack($input: CreateTrackInput!) { createTrackAdmin(input: $input) { id } }`;
const UPDATE_TRACK = gql`mutation AdminUpdateTrack($input: UpdateTrackInput!) { adminUpdateTrack(input: $input) { id } }`;

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ЗАГРУЗКИ ===
const uploadFile = async (file: File, type: 'image' | 'audio') => {
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = type === 'image' ? '/upload/message' : '/upload/audio';
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Cookies.get('token')}` },
        body: formData
    });
    
    if (!res.ok) throw new Error('Ошибка загрузки файла');
    const data = await res.json();
    return data.url;
};

// Тип для локального списка треков
type LocalTrack = {
  id?: number;
  title: string;
  file?: File;
  url?: string;
  duration: number;
};

export default function AdminAlbumEditor({ isOpen, onClose, album, artists, allTracks, onSuccess }: any) {
  // Поля альбома
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [releaseDate, setReleaseDate] = useState<Date | null>(null);
  
  // Обложка
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  
  // Треки
  const [albumTracks, setAlbumTracks] = useState<LocalTrack[]>([]);
  const [initialTrackIds, setInitialTrackIds] = useState<number[]>([]);

  // UI
  const [isCalOpen, setIsCalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Мутации
  const [createAlbum] = useMutation(CREATE_ALBUM);
  const [updateAlbum] = useMutation(UPDATE_ALBUM);
  const [createTrack] = useMutation(CREATE_TRACK);
  const [updateTrack] = useMutation(UPDATE_TRACK);

  // Инициализация данных при открытии
  useEffect(() => {
    if (isOpen) {
      setTitle(album?.title || '');
      setArtistId(album?.artist?.id ? String(album.artist.id) : '');
      setGenre(album?.genre || '');
      setYear(album?.year ? String(album.year) : '');
      setReleaseDate(album?.releaseDate ? new Date(album.releaseDate) : null);
      setCoverUrl(album?.coverUrl || null);
      setNewFile(null);
      setIsCalOpen(false); 
      
      // Логика подгрузки треков
      if (album && allTracks) {
          // Фильтруем треки, которые принадлежат этому альбому
          const tracksOfThisAlbum = allTracks
            .filter((t: any) => t.album?.id === album.id)
            .sort((a: any, b: any) => (a.trackNumber || 0) - (b.trackNumber || 0));
          
          setAlbumTracks(tracksOfThisAlbum.map((t: any) => ({
              id: t.id,
              title: t.title,
              url: t.url,
              duration: t.duration
          })));
          
          setInitialTrackIds(tracksOfThisAlbum.map((t: any) => t.id));
      } else {
          setAlbumTracks([]);
          setInitialTrackIds([]);
      }
    }
  }, [isOpen, album, allTracks]);

  // Обработчик выбора аудиофайлов
  const handleAudioFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const newTracks: LocalTrack[] = [];
      
      for (const file of files) {
          // Получаем длительность аудио
          const url = URL.createObjectURL(file);
          const audio = new Audio(url);
          
          await new Promise<void>((resolve) => {
              audio.onloadedmetadata = () => {
                  newTracks.push({
                      title: file.name.replace(/\.[^/.]+$/, ""), // Убираем расширение
                      file: file,
                      duration: Math.round(audio.duration)
                  });
                  resolve();
              };
              audio.onerror = () => resolve(); // Чтобы не зависло при ошибке
          });
      }

      setAlbumTracks(prev => [...prev, ...newTracks]);
      if (audioInputRef.current) audioInputRef.current.value = '';
  };

  // Перемещение треков (сортировка)
  const moveTrack = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === albumTracks.length - 1) return;

      const newTracks = [...albumTracks];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      [newTracks[index], newTracks[targetIndex]] = [newTracks[targetIndex], newTracks[index]];
      setAlbumTracks(newTracks);
  };

  const removeTrackFromList = (index: number) => {
      setAlbumTracks(prev => prev.filter((_, i) => i !== index));
  };

  const updateTrackTitle = (index: number, newTitle: string) => {
      const newTracks = [...albumTracks];
      newTracks[index].title = newTitle;
      setAlbumTracks(newTracks);
  };

  // === ГЛАВНАЯ ФУНКЦИЯ СОХРАНЕНИЯ ===
  const handleSave = async () => {
    // 1. Валидация полей
    if (!title.trim()) {
        alert('Введите название альбома');
        return;
    }
    if (!artistId) {
        alert('Выберите артиста');
        return;
    }
    
    // 2. Преобразование типов (защита от NaN)
    const parsedArtistId = parseInt(artistId, 10);
    const parsedYear = year && year.trim() !== '' ? parseInt(year, 10) : null;

    if (isNaN(parsedArtistId)) {
        alert('Ошибка: Некорректный ID артиста');
        return;
    }

    setIsSaving(true);
    try {
      // 3. Загрузка обложки (если новая)
      let finalCover = coverUrl;
      if (newFile) {
          finalCover = await uploadFile(newFile, 'image');
      }

      const albumPayload = {
          title,
          artistId: parsedArtistId,
          genre,
          year: parsedYear,
          releaseDate: releaseDate || null,
          coverUrl: finalCover,
      };

      let currentAlbumId: number;

      // 4. Создание или обновление альбома
      if (!album) {
         // Создание
         // Обратите внимание: createAlbumAdmin возвращает ID созданного альбома (если вы так настроили на бэке) 
         // или boolean. Если boolean, то нельзя сразу добавить треки, нужно перезайти.
         // Предположим, вы не возвращаете ID, тогда просто создаем и выходим.
         await createAlbum({ variables: { input: albumPayload }});
         onSuccess('Альбом создан. Откройте его заново, чтобы добавить треки.');
         setIsSaving(false);
         return; 
      } else {
         // Обновление
         currentAlbumId = album.id;
         await updateAlbum({ variables: { input: { id: currentAlbumId, ...albumPayload } }});
      }

      // 5. Обработка треков
      const finalTrackIds: number[] = [];

      for (let i = 0; i < albumTracks.length; i++) {
          const track = albumTracks[i];
          let audioUrl = track.url;
          
          // Если файл новый, загружаем его
          if (track.file) {
              audioUrl = await uploadFile(track.file, 'audio');
          }

          if (track.id) {
              // Обновляем существующий трек (позицию, имя, обложку)
              await updateTrack({ variables: { input: { 
                  id: track.id, 
                  title: track.title, 
                  trackNumber: i + 1,
                  artistId: parsedArtistId,
                  albumId: currentAlbumId, 
                  coverUrl: finalCover // Наследуем обложку альбома
              }}});
              finalTrackIds.push(track.id);
          } else {
              // Создаем новый трек
              // Важно! Передаем все обязательные поля
              const res = await createTrack({ variables: { input: {
                  title: track.title,
                  url: audioUrl,
                  duration: track.duration,
                  artistId: parsedArtistId,
                  trackNumber: i + 1,
                  coverUrl: finalCover,
                  albumId: currentAlbumId 
              }}});
              // Получаем ID созданного трека
              if (res.data?.createTrackAdmin?.id) {
                  finalTrackIds.push(res.data.createTrackAdmin.id);
              }
          }
      }

      // 6. Удаление треков, которые были убраны из списка
      const removedTrackIds = initialTrackIds.filter(id => !finalTrackIds.includes(id));
      for (const removedId of removedTrackIds) {
          // Отвязываем трек от альбома или удаляем (в данном случае просто убираем albumId)
          await updateTrack({ variables: { input: { id: removedId, albumId: null, trackNumber: 0 } }});
      }

      // 7. Опционально: обновляем связи в альбоме (если нужно для сортировки)
      // await updateAlbum({ variables: { input: { id: currentAlbumId, trackIds: finalTrackIds } } });
      
      onSuccess('Альбом и треки обновлены');
    } catch (e: any) {
      console.error(e);
      alert('Ошибка: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full p-3 rounded-xl border outline-none text-sm transition-colors bg-zinc-100 border-zinc-300 text-zinc-900 focus:border-zinc-500 placeholder:text-zinc-500";
  const artistOptions = artists.map((a:any) => ({ value: String(a.id), label: a.name }));
  const hasEmptyTrackTitles = albumTracks.some(track => !track.title.trim());

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={isSaving ? () => {} : onClose} maxWidth="max-w-4xl">
      <div className="p-6 flex flex-col max-h-[90vh]">
        
        {/* Шапка */}
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-bold">{album ? 'Редактировать альбом' : 'Новый альбом'}</h2>
            <button onClick={onClose} disabled={isSaving} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"><X size={20}/></button>
        </div>
        
        {/* Контент */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-8 pr-2 pb-4">
            
            {/* === ЛЕВАЯ КОЛОНКА (Инфо) === */}
            <div className="w-full md:w-1/2 space-y-5">
                <div className="flex flex-col items-center gap-2">
                    <div className="relative group w-32 h-32 flex justify-center items-center">
                        <div className="w-32 h-32 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-400/30 shadow-md">
                            {newFile ? (
                                <img src={URL.createObjectURL(newFile)} className="w-full h-full object-cover"/>
                            ) : coverUrl ? (
                                <img src={getAvatarUrl(coverUrl)!} className="w-full h-full object-cover"/>
                            ) : (
                                <ImageIcon size={32} className="text-zinc-500"/>
                            )}
                        </div>
                        
                        {!isSaving && (
                            <div className="absolute inset-0 w-32 h-32 mx-auto rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity backdrop-blur-[2px]">
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
                                    className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
                                    title="Изменить обложку"
                                >
                                    <Camera size={20} />
                                </button>
                                
                                {(newFile || coverUrl) && (
                                    <button 
                                        type="button"
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setNewFile(null); 
                                            setCoverUrl(null); 
                                            if(coverInputRef.current) coverInputRef.current.value=''; 
                                        }}
                                        className="p-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors cursor-pointer"
                                        title="Удалить обложку"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setNewFile(e.target.files[0])} />
                </div>

                <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Название альбома</label>
                    <input className={inputClass} placeholder="Например: Уроборос" value={title} onChange={e => setTitle(e.target.value)} disabled={isSaving}/>
                </div>

                <div className="z-30 relative">
                    <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Артист</label>
                    <CustomSelect options={artistOptions} value={artistId} onChange={setArtistId} placeholder="Выберите артиста" isDarkMode={false} disabled={isSaving}/>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Жанр</label>
                        <input className={inputClass} placeholder="Рэп / Хип-Хоп" value={genre} onChange={e => setGenre(e.target.value)} disabled={isSaving}/>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Год</label>
                        <input type="number" className={inputClass} placeholder="2025" value={year} onChange={e => setYear(e.target.value)} disabled={isSaving}/>
                    </div>
                </div>

                <div className="relative z-10">
                    <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Дата релиза</label>
                    <button type="button" ref={dateBtnRef} onClick={() => !isSaving && setIsCalOpen(!isCalOpen)} className={`${inputClass} flex justify-between items-center cursor-pointer hover:border-zinc-500 disabled:opacity-50`}>
                        <span className={releaseDate ? "" : "text-zinc-500"}>
                            {releaseDate ? releaseDate.toLocaleDateString('ru-RU') : "Выберите дату"}
                        </span>
                        <CalendarIcon size={16} className="text-zinc-500 pointer-events-none" />
                    </button>
                    {isCalOpen && (
                        <CustomCalendar 
                            onClose={() => setIsCalOpen(false)} 
                            anchorRef={dateBtnRef} 
                            value={releaseDate || new Date()} 
                            onChange={(d) => { setReleaseDate(d); setIsCalOpen(false); }} 
                            timeLabel="Время" 
                            minDate={new Date('1900-01-01')} 
                            maxDate={new Date()} 
                        />
                    )}
                </div>
            </div>

            {/* === ПРАВАЯ КОЛОНКА (ПЛЕЙЛИСТ) === */}
            <div className="w-full md:w-1/2 flex flex-col h-full min-h-[380px]">
                {album ? (
                    <div className="flex flex-col h-full bg-zinc-100 border border-zinc-200 rounded-2xl p-4 shadow-inner">
                        
                        <div className="flex justify-between items-center mb-4 border-b border-zinc-200 pb-3 shrink-0">
                            <span className="text-xs font-bold uppercase text-zinc-600 tracking-wider">
                                Плейлист альбома ({albumTracks.length})
                            </span>
                            <button 
                                onClick={() => audioInputRef.current?.click()}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-400 text-zinc-900 rounded-lg text-xs font-bold hover:bg-lime-500 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                <Plus size={14} /> Добавить MP3
                            </button>
                            <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" multiple onChange={handleAudioFiles} />
                        </div>
                        
                        <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2 max-h-[360px]">
                            {albumTracks.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-500 font-medium opacity-70">
                                    <Music size={32} className="mb-2"/>
                                    <p>Загрузите треки</p>
                                </div>
                            )}
                            
                            {albumTracks.map((t, index) => {
                                const isTrackEmpty = !t.title.trim();
                                return (
                                    <div key={index} className="flex items-center gap-2 bg-white rounded-xl border border-zinc-200 shadow-sm p-2 group shrink-0">
                                        <div className="flex flex-col gap-0.5 shrink-0 text-zinc-400">
                                            <button onClick={() => moveTrack(index, 'up')} disabled={index === 0 || isSaving} className="hover:text-zinc-800 disabled:opacity-30 cursor-pointer"><ChevronUp size={14}/></button>
                                            <button onClick={() => moveTrack(index, 'down')} disabled={index === albumTracks.length - 1 || isSaving} className="hover:text-zinc-800 disabled:opacity-30 cursor-pointer"><ChevronDown size={14}/></button>
                                        </div>
                                        
                                        <span className="text-xs font-bold text-zinc-400 w-4 text-center shrink-0">{index + 1}</span>
                                        
                                        <input 
                                            value={t.title} 
                                            onChange={(e) => updateTrackTitle(index, e.target.value)}
                                            disabled={isSaving}
                                            placeholder="Название трека"
                                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm outline-none transition-colors text-zinc-900 border 
                                                ${isTrackEmpty ? 'border-red-400 bg-red-50 focus:border-red-500 placeholder:text-red-300' : 'bg-zinc-50 border-zinc-200 focus:border-zinc-400'}
                                            `}
                                        />
                                        
                                        <span className="text-xs font-mono text-zinc-500 shrink-0 w-10 text-right">
                                            {Math.floor(t.duration / 60)}:{(t.duration % 60).toString().padStart(2, '0')}
                                        </span>

                                        <button onClick={() => removeTrackFromList(index)} disabled={isSaving} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                        <AlertCircle size={32} className="mb-3 opacity-80" />
                        <span className="text-sm font-medium">Создайте альбом, чтобы открыть управление треками.</span>
                    </div>
                )}
            </div>

        </div>

        {/* Футер */}
        <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 shrink-0 flex flex-col">
            {hasEmptyTrackTitles && album && (
                <p className="text-red-400 text-xs text-center font-bold mb-2 uppercase tracking-wide">
                    Заполните названия всех добавленных треков
                </p>
            )}
            
            <button 
                onClick={handleSave} 
                disabled={isSaving || !title.trim() || !artistId || hasEmptyTrackTitles} 
                className="w-full p-3.5 bg-lime-400 text-black font-bold rounded-xl hover:bg-lime-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-lime-400/20"
            >
                {isSaving ? <><Loader className="animate-spin" size={18}/> Сохранение файлов...</> : (album ? 'Сохранить изменения' : 'Создать альбом')}
            </button>
        </div>
      </div>
    </LiquidGlassModal>
  );
}