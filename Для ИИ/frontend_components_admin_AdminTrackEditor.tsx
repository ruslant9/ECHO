'use client';

import { useState, useRef, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import { X, Camera, Loader, Image as ImageIcon, Calendar as CalendarIcon, UploadCloud, Music, Trash2 } from 'lucide-react'; // Добавили Trash2
import LiquidGlassModal from '@/components/LiquidGlassModal';
import { getAvatarUrl } from '@/lib/avatar-url';
import Cookies from 'js-cookie';
import CustomSelect from '@/components/CustomSelect';
import CustomCalendar from '@/components/CustomCalendar';

const CREATE_TRACK = gql`mutation CreateTrack($input: CreateTrackInput!) { createTrackAdmin(input: $input) { id title } }`;
const UPDATE_TRACK = gql`mutation AdminUpdateTrack($input: UpdateTrackInput!) { adminUpdateTrack(input: $input) { id title } }`;

const uploadFile = async (file: File, type: 'image' | 'audio') => {
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = type === 'image' ? '/upload/message' : '/upload/audio';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Cookies.get('token')}` },
        body: formData
    });
    const data = await res.json();
    return data.url;
};

export default function AdminTrackEditor({ isOpen, onClose, track, artists, albums, onSuccess }: any) {
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState('');
  const [albumId, setAlbumId] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseDate, setReleaseDate] = useState<Date | null>(null);
  
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);

  const [isCalOpen, setIsCalOpen] = useState(false);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [createTrack, { loading: creating }] = useMutation(CREATE_TRACK);
  const [updateTrack, { loading: updating }] = useMutation(UPDATE_TRACK);

  useEffect(() => {
    if (isOpen) {
      setTitle(track?.title || '');
      setArtistId(track?.artist?.id ? String(track.artist.id) : '');
      setAlbumId(track?.album?.id ? String(track.album.id) : '');
      setGenre(track?.genre || '');
      setReleaseDate(track?.releaseDate ? new Date(track.releaseDate) : null);
      setCoverUrl(track?.coverUrl || null);
      setNewImageFile(null);
      setAudioFile(null);
      setDuration(track?.duration || 0);
      setIsCalOpen(false);
    }
  }, [isOpen, track]);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            setAudioFile(file);
            setDuration(Math.round(audio.duration));
        };
    }
  };

  const handleClearAudio = (e: React.MouseEvent) => {
      e.stopPropagation(); 
      setAudioFile(null);
      setDuration(track?.duration || 0); 
      if (audioInputRef.current) {
          audioInputRef.current.value = '';
      }
  };

  const handleSave = async () => {
    try {
      let finalCover = coverUrl;
      let finalAudioUrl = track?.url || null;

      if (newImageFile) finalCover = await uploadFile(newImageFile, 'image');
      
      if (!track && !audioFile) {
          alert('Выберите аудиофайл!');
          return;
      }

      if (audioFile) finalAudioUrl = await uploadFile(audioFile, 'audio');

      const payload = {
          title,
          artistId: parseInt(artistId),
          albumId: albumId ? parseInt(albumId) : null,
          genre,
          releaseDate: releaseDate || null,
          coverUrl: finalCover,
          url: finalAudioUrl,
          duration
      };

      if (track) {
        await updateTrack({ variables: { input: { id: track.id, ...payload } }});
      } else {
        await createTrack({ variables: { input: payload }});
      }
      onSuccess(track ? 'Трек обновлен' : 'Трек создан');
    } catch (e) {
      console.error(e);
    }
  };

  const loading = creating || updating;
  
  const inputClass = "w-full p-3 rounded-xl border outline-none text-sm transition-colors bg-zinc-100 border-zinc-300 text-zinc-900 focus:border-zinc-500 placeholder:text-zinc-500";
  
  const artistOptions = artists.map((a:any) => ({ value: String(a.id), label: a.name }));
  const albumOptions = [{ value: '', label: '-- Без альбома (Сингл) --' }, ...albums.filter((a:any) => a.artist.id === parseInt(artistId)).map((a:any) => ({ value: String(a.id), label: a.title }))];

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-bold">{track ? 'Редактировать трек' : 'Новый трек'}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"><X size={20}/></button>
        </div>
        
        <div className="space-y-5 overflow-y-auto custom-scrollbar flex-1 pr-2 pb-4">
            
            <div className="flex flex-col items-center gap-2">
                {/* ИСПРАВЛЕННЫЙ БЛОК ОБЛОЖКИ ТРЕКА */}
                <div className="relative group w-32 h-32 flex justify-center items-center">
                    
                    {/* Контейнер картинки с чистой рамкой */}
                    <div className="w-32 h-32 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-400/30 shadow-md">
                        {newImageFile ? (
                            <img src={URL.createObjectURL(newImageFile)} className="w-full h-full object-cover"/>
                        ) : coverUrl ? (
                            <img src={getAvatarUrl(coverUrl)!} className="w-full h-full object-cover"/>
                        ) : (
                            <ImageIcon size={32} className="text-zinc-500"/>
                        )}
                    </div>
                    
                    {/* Оверлей с кнопками */}
                    <div className="absolute inset-0 w-32 h-32 mx-auto rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity backdrop-blur-[2px]">
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                            className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
                            title="Изменить обложку"
                        >
                            <Camera size={20} />
                        </button>
                        
                        {(newImageFile || coverUrl) && (
                            <button 
                                type="button"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setNewImageFile(null); 
                                    setCoverUrl(null); 
                                    if(imageInputRef.current) imageInputRef.current.value=''; 
                                }}
                                className="p-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors cursor-pointer"
                                title="Удалить обложку"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>

                <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setNewImageFile(e.target.files[0])} />
            </div>

            <div 
                className={`relative p-4 rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${audioFile ? 'border-lime-500 bg-lime-500/10' : 'border-zinc-500 bg-zinc-800/30 hover:border-lime-400'}`} 
                onClick={() => audioInputRef.current?.click()}
            >
                <input type="file" ref={audioInputRef} className="hidden" accept="audio/*" onChange={handleAudioSelect} />
                
                {audioFile && (
                    <button 
                        onClick={handleClearAudio}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-md cursor-pointer"
                        title="Убрать файл"
                    >
                        <X size={14} />
                    </button>
                )}

                {audioFile ? (
                    <div className="text-center text-lime-500 font-bold flex flex-col items-center">
                        <Music size={24} className="mb-1"/> 
                        <span className="max-w-[200px] truncate">{audioFile.name}</span>
                        <span className="text-xs font-normal opacity-80 mt-0.5">({(duration/60).toFixed(2)} мин)</span>
                    </div>
                ) : track?.url ? (
                    <div className="text-center text-zinc-300 flex flex-col items-center"><Music size={24} className="mb-1"/> Аудиофайл уже загружен. Нажмите, чтобы заменить.</div>
                ) : (
                    <div className="text-center text-zinc-400 flex flex-col items-center"><UploadCloud size={24} className="mb-1"/> Загрузить MP3 / WAV</div>
                )}
            </div>

            <div>
                <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Название трека</label>
                <input className={inputClass} placeholder="Например: Каша из топора" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="z-30 relative">
                <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Артист</label>
                <CustomSelect options={artistOptions} value={artistId} onChange={setArtistId} placeholder="Выберите артиста" isDarkMode={false} />
            </div>

            <div className="z-20 relative">
                <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Альбом</label>
                <CustomSelect options={albumOptions} value={albumId} onChange={setAlbumId} placeholder="Выберите альбом" isDarkMode={false} />
            </div>

            <div>
                <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Жанр</label>
                <input className={inputClass} placeholder="Рэйв" value={genre} onChange={e => setGenre(e.target.value)} />
            </div>

            <div className="relative z-10">
                <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Дата релиза</label>
                <button type="button" ref={dateBtnRef} onClick={() => setIsCalOpen(!isCalOpen)} className={`${inputClass} flex justify-between items-center cursor-pointer hover:border-zinc-500`}>
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

        <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
            <button onClick={handleSave} disabled={loading || !title || !artistId || (!track && !audioFile)} className="w-full p-3.5 bg-lime-400 text-black font-bold rounded-xl hover:bg-lime-500 transition-colors cursor-pointer disabled:opacity-50">
                {loading ? <Loader className="animate-spin mx-auto" size={20}/> : 'Сохранить'}
            </button>
        </div>
      </div>
    </LiquidGlassModal>
  );
}