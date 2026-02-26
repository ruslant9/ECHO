'use client';

import { useState, useRef, useId, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Disc, User, ListMusic, UploadCloud, CheckCircle, Loader2, X, Calendar, Type, Search } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Toast from '@/components/Toast';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';
import { gql, useMutation, useQuery } from '@apollo/client';
import Cookies from 'js-cookie';

// Импорт кастомных компонентов (убедитесь, что они существуют по этим путям)
import CustomSelect from '@/components/CustomSelect';
import CustomCalendar from '@/components/CustomCalendar';

// --- GRAPHQL QUERIES & MUTATIONS ---
const GET_ARTISTS = gql`
  query GetArtistsAdmin($query: String!) {
    searchArtistsAdmin(query: $query) { id name }
  }
`;

const CREATE_ARTIST = gql`
  mutation CreateArtistAdmin($input: CreateArtistInput!) {
    createArtistAdmin(input: $input) { id name }
  }
`;

const CREATE_ALBUM = gql`
  mutation CreateAlbumAdmin($input: CreateAlbumInput!) {
    createAlbumAdmin(input: $input)
  }
`;

const CREATE_TRACK = gql`
  mutation CreateTrackAdmin($input: CreateTrackInput!) {
    createTrackAdmin(input: $input) { id title }
  }
`;

type TabType = 'track' | 'album' | 'artist' | 'playlist';
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function AdminMusicPanel() {
  const { isDarkMode } = useTheme();
  const filterId = `admin-music-noise-${useId()}`;
  
  const [activeTab, setActiveTab] = useState<TabType>('track');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Мутации
  const [createArtist] = useMutation(CREATE_ARTIST);
  const [createAlbum] = useMutation(CREATE_ALBUM);
  const [createTrack] = useMutation(CREATE_TRACK);

  // Получение списка артистов для dropdown
  const { data: artistsData, refetch: refetchArtists } = useQuery(GET_ARTISTS, {
    variables: { query: '' },
    fetchPolicy: 'network-only'
  });

  // Преобразуем данные для CustomSelect
  const artistsList = artistsData?.searchArtistsAdmin?.map((a: any) => ({ 
    value: String(a.id), 
    label: a.name 
  })) || [];

  // --- Стейты для ТРЕКА ---
  const [trackTitle, setTrackTitle] = useState('');
  const [trackGenre, setTrackGenre] = useState('');
  const [releaseDate, setReleaseDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false); // Тоггл календаря

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [mainArtistId, setMainArtistId] = useState(''); 
  const [albumId, setAlbumId] = useState(''); 

  // --- Стейты для АРТИСТА ---
  const [artistName, setArtistName] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistAvatar, setArtistAvatar] = useState<File | null>(null);

  // --- Стейты для АЛЬБОМА ---
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumGenre, setAlbumGenre] = useState('');
  const [albumRelease, setAlbumRelease] = useState<Date>(new Date());
  const [showAlbumCalendar, setShowAlbumCalendar] = useState(false); // Тоггл календаря альбома

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'track', label: 'Трек', icon: Music },
    { id: 'album', label: 'Альбом', icon: Disc },
    { id: 'artist', label: 'Артист', icon: User },
    { id: 'playlist', label: 'Плейлист', icon: ListMusic },
  ];

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDropAudio = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setAudioFile(e.dataTransfer.files[0]);
  };
  const handleDropCover = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setCoverFile(e.dataTransfer.files[0]);
  };

  // Хелпер загрузки файлов
  const uploadFileRest = async (file: File, type: 'avatar' | 'audio'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = Cookies.get('token');
    
    const endpoint = type === 'audio' ? '/upload/audio' : '/upload/avatar';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    
    if (!res.ok) throw new Error(`Ошибка загрузки ${type}`);
    const data = await res.json();
    return data.url;
  };

  // Получение длительности
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration));
        URL.revokeObjectURL(url);
      };
    });
  };

  const handleUpload = async () => {
    setStatus('uploading');
    
    try {
      // 1. СОЗДАНИЕ АРТИСТА
      if (activeTab === 'artist') {
        if (!artistName) throw new Error("Укажите имя артиста");
        let avatarUrl = null;
        if (artistAvatar) avatarUrl = await uploadFileRest(artistAvatar, 'avatar');

        await createArtist({
          variables: {
            input: { name: artistName, bio: artistBio, avatar: avatarUrl }
          }
        });
        refetchArtists();
      } 
      
      // 2. СОЗДАНИЕ АЛЬБОМА
      else if (activeTab === 'album') {
        if (!albumTitle || !mainArtistId) throw new Error("Укажите название и артиста");
        let coverUrl = null;
        if (coverFile) coverUrl = await uploadFileRest(coverFile, 'avatar');

        await createAlbum({
          variables: {
            input: {
              title: albumTitle,
              artistId: parseInt(mainArtistId),
              coverUrl,
              genre: albumGenre,
              releaseDate: albumRelease,
              year: albumRelease.getFullYear(),
            }
          }
        });
      }

      // 3. СОЗДАНИЕ ТРЕКА
      else if (activeTab === 'track') {
        if (!trackTitle || !mainArtistId || !audioFile) throw new Error("Укажите название, артиста и аудиофайл");
        
        let coverUrl = null;
        if (coverFile) coverUrl = await uploadFileRest(coverFile, 'avatar');
        
        const audioUrl = await uploadFileRest(audioFile, 'audio');
        const duration = await getAudioDuration(audioFile);

        await createTrack({
          variables: {
            input: {
              title: trackTitle,
              artistId: parseInt(mainArtistId),
              url: audioUrl,
              duration,
              albumId: albumId ? parseInt(albumId) : null,
              coverUrl,
              genre: trackGenre,
              releaseDate: releaseDate,
              featuredArtistIds: [] 
            }
          }
        });
      }

      setStatus('success');
      setToast({ message: 'Успешно добавлено!', type: 'success' });
      
      setTimeout(() => {
        setStatus('idle');
        // Очистка
        setTrackTitle(''); setAudioFile(null); setCoverFile(null);
        setArtistName(''); setArtistBio(''); setArtistAvatar(null);
        setAlbumTitle('');
      }, 2000);

    } catch (e: any) {
      setStatus('error');
      setToast({ message: e.message || 'Ошибка при загрузке', type: 'error' });
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className={`relative w-full max-w-5xl mx-auto rounded-[32px] overflow-visible shadow-2xl border isolate
        ${isDarkMode ? 'bg-zinc-900/60 border-zinc-700/50 text-zinc-100' : 'bg-white/60 border-zinc-200/50 text-zinc-900'}
    `}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ФОНОВЫЙ ШУМ (LIQUID GLASS) */}
      <svg className="absolute w-0 h-0">
        <filter id={filterId} primitiveUnits="objectBoundingBox">
          <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64} />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
          <feDisplacementMap in="blur" in2="map" scale="0.3" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>
      <div className="absolute inset-0 z-0 backdrop-blur-3xl rounded-[32px]" style={{ filter: `url(#${filterId})` }} />
      <div className={`absolute inset-0 z-0 rounded-[32px] ${isDarkMode ? 'bg-black/40' : 'bg-white/40'}`} />

      {/* ОВЕРЛЕЙ ЗАГРУЗКИ */}
      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white rounded-[32px]">
            {status === 'uploading' && (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-24 h-24">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full border-4 border-white/10 border-t-lime-400 rounded-full" />
                  <Music className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lime-400 animate-pulse" size={32} />
                </div>
                <h3 className="text-2xl font-bold tracking-widest uppercase text-center">Загрузка...</h3>
              </div>
            )}
            {status === 'success' && (
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4 text-lime-400">
                <CheckCircle size={80} />
                <h3 className="text-3xl font-black">Успешно!</h3>
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4 text-red-500">
                <X size={80} />
                <h3 className="text-3xl font-black">Ошибка</h3>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col h-full min-h-[600px]">
        {/* Хедер с вкладками */}
        <div className={`p-6 border-b flex flex-col md:flex-row justify-between items-center gap-6 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Музыкальная база</h2>
                <p className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Загрузка и управление контентом</p>
            </div>
            
            <div className="flex p-1.5 rounded-2xl bg-black/20 border border-white/10 shadow-inner overflow-x-auto">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`relative px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all z-10 cursor-pointer
                                ${isActive ? 'text-black' : 'text-zinc-400 hover:text-white'}`}>
                            {isActive && (
                                <motion.div layoutId="music-admin-tab" className="absolute inset-0 bg-lime-400 rounded-xl -z-10 shadow-[0_0_15px_rgba(163,230,53,0.4)]" />
                            )}
                            <tab.icon size={16} /> <span className="hidden sm:block">{tab.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>

        {/* Тело формы */}
        <div className="flex-1 p-6 overflow-y-auto glass-scrollbar">
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                    
                    {/* === Вкладка: ТРЕК === */}
                    {activeTab === 'track' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                {/* Загрузка Аудио */}
                                <div onClick={() => audioInputRef.current?.click()} className={`relative h-40 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${audioFile ? 'border-lime-400 bg-lime-400/10' : (isDarkMode ? 'border-zinc-600 bg-black/20 hover:border-lime-500 hover:bg-black/40' : 'border-zinc-300 bg-white/50 hover:border-lime-500')}`}>
                                    <input type="file" ref={audioInputRef} onChange={e => setAudioFile(e.target.files?.[0] || null)} accept="audio/*" className="hidden" />
                                    {audioFile ? (
                                        <div className="text-center text-lime-400"><Music size={32} className="mx-auto mb-2"/><p className="font-bold">{audioFile.name}</p></div>
                                    ) : (
                                        <div className="text-center text-zinc-500"><UploadCloud size={32} className="mx-auto mb-2"/><p className="font-bold">Аудиофайл (.mp3, .wav)</p></div>
                                    )}
                                </div>
                                {/* Загрузка Обложки */}
                                <div onClick={() => coverInputRef.current?.click()} className={`relative h-64 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${isDarkMode ? 'border-zinc-600 bg-black/20 hover:border-lime-500' : 'border-zinc-300 bg-white/50 hover:border-lime-500'}`}>
                                    <input type="file" ref={coverInputRef} onChange={e => setCoverFile(e.target.files?.[0] || null)} accept="image/*" className="hidden" />
                                    {coverFile ? (
                                        <img src={URL.createObjectURL(coverFile)} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="cover" />
                                    ) : (
                                        <div className="text-center text-zinc-500 z-10"><Disc size={32} className="mx-auto mb-2"/><p className="font-bold">Обложка (1000x1000)</p></div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Название трека</label>
                                    <div className={`flex items-center px-4 py-3 rounded-2xl border transition-colors ${isDarkMode ? 'bg-black/40 border-white/10 focus-within:border-lime-400' : 'bg-white/60 border-black/10 focus-within:border-lime-500'}`}>
                                        <Type size={18} className="text-zinc-500 mr-3" />
                                        <input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="Например: Blinding Lights" className="bg-transparent w-full outline-none font-bold text-lg text-inherit" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative z-30">
                                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Главный Артист</label>
                                        {/* КАСТОМНЫЙ СЕЛЕКТ */}
                                        <CustomSelect 
                                            options={artistsList} 
                                            value={mainArtistId} 
                                            onChange={setMainArtistId} 
                                            placeholder="Выберите артиста"
                                            isDarkMode={isDarkMode}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Альбом (если есть)</label>
                                        <input value={albumId} onChange={e => setAlbumId(e.target.value)} placeholder="ID альбома" className={`w-full px-4 py-3.5 rounded-2xl border transition-colors text-sm outline-none text-inherit ${isDarkMode ? 'bg-black/40 border-white/10 focus:border-lime-400' : 'bg-white/60 border-black/10'}`} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Жанр</label>
                                        <input value={trackGenre} onChange={e => setTrackGenre(e.target.value)} placeholder="Pop, Rap, Rock..." className={`w-full px-4 py-3.5 rounded-2xl border outline-none text-sm text-inherit ${isDarkMode ? 'bg-black/40 border-white/10 focus:border-lime-400' : 'bg-white/60 border-black/10'}`} />
                                    </div>
                                    <div className="relative z-20">
                                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Дата релиза</label>
                                        <button 
                                            onClick={() => setShowCalendar(!showCalendar)}
                                            className={`w-full px-4 py-3.5 rounded-2xl border text-left text-sm font-medium flex items-center justify-between cursor-pointer transition-colors
                                                ${isDarkMode ? 'bg-black/40 border-white/10 hover:bg-black/50 text-white' : 'bg-white/60 border-black/10 hover:bg-white/80 text-black'}`}
                                        >
                                            <span className="flex items-center gap-2"><Calendar size={16} className="text-zinc-500"/> {releaseDate.toLocaleDateString()}</span>
                                        </button>
                                        
                                        {/* КАСТОМНЫЙ КАЛЕНДАРЬ */}
                                        <AnimatePresence>
                                            {showCalendar && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }} 
                                                    animate={{ opacity: 1, y: 0 }} 
                                                    exit={{ opacity: 0, y: 10 }} 
                                                    className="absolute bottom-full left-0 mb-2 z-50 w-full"
                                                >
                                                    <CustomCalendar value={releaseDate} onChange={(d) => { setReleaseDate(d); setShowCalendar(false); }} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === Вкладка: АРТИСТ === */}
                    {activeTab === 'artist' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                             <div className="flex flex-col items-center gap-4">
                                <div onClick={() => avatarInputRef.current?.click()} className={`w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative group
                                    ${isDarkMode ? 'border-zinc-600 bg-black/40 hover:border-lime-400' : 'border-zinc-300 bg-white hover:border-lime-500'}`}>
                                    <input type="file" ref={avatarInputRef} onChange={e => setArtistAvatar(e.target.files?.[0] || null)} accept="image/*" className="hidden" />
                                    {artistAvatar ? (
                                        <img src={URL.createObjectURL(artistAvatar)} className="w-full h-full object-cover" alt="avatar" />
                                    ) : (
                                        <User size={40} className="text-zinc-500 group-hover:text-lime-400 transition-colors" />
                                    )}
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-lg">Аватар артиста</h3>
                                </div>
                             </div>

                             <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Имя артиста</label>
                                <input value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Например: The Weeknd" 
                                    className={`w-full px-4 py-4 rounded-2xl border transition-colors text-lg font-bold outline-none text-inherit ${isDarkMode ? 'bg-black/40 border-white/10 focus:border-lime-400' : 'bg-white/60 border-black/10'}`} />
                             </div>
                             <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Биография</label>
                                <textarea value={artistBio} onChange={e => setArtistBio(e.target.value)} rows={5} placeholder="История артиста..." 
                                    className={`w-full px-4 py-4 rounded-2xl border transition-colors text-sm outline-none resize-none glass-scrollbar text-inherit ${isDarkMode ? 'bg-black/40 border-white/10 focus:border-lime-400' : 'bg-white/60 border-black/10'}`} />
                             </div>
                        </div>
                    )}

                    {/* === Вкладка: АЛЬБОМ === */}
                    {activeTab === 'album' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                             <div className="flex flex-col items-center gap-4">
                                <div onClick={() => coverInputRef.current?.click()} className={`w-40 h-40 rounded-3xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative group
                                    ${isDarkMode ? 'border-zinc-600 bg-black/40 hover:border-lime-400' : 'border-zinc-300 bg-white hover:border-lime-500'}`}>
                                    <input type="file" ref={coverInputRef} onChange={e => setCoverFile(e.target.files?.[0] || null)} accept="image/*" className="hidden" />
                                    {coverFile ? (
                                        <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" alt="cover" />
                                    ) : (
                                        <Disc size={40} className="text-zinc-500 group-hover:text-lime-400 transition-colors" />
                                    )}
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-lg">Обложка альбома</h3>
                                </div>
                             </div>

                             <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Название альбома</label>
                                <input value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} placeholder="Название..." 
                                    className={`w-full px-4 py-3 rounded-2xl border transition-colors text-lg font-bold outline-none text-inherit ${isDarkMode ? 'bg-black/40 border-white/10 focus:border-lime-400' : 'bg-white/60 border-black/10'}`} />
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="relative z-30">
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Артист</label>
                                    <CustomSelect 
                                        options={artistsList} 
                                        value={mainArtistId} 
                                        onChange={setMainArtistId} 
                                        placeholder="Выберите артиста"
                                        isDarkMode={isDarkMode}
                                    />
                                 </div>
                                 <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Жанр</label>
                                    <input value={albumGenre} onChange={e => setAlbumGenre(e.target.value)} placeholder="Pop, Rock..." 
                                        className={`w-full px-4 py-3 rounded-2xl border transition-colors text-sm outline-none text-inherit ${isDarkMode ? 'bg-black/40 border-white/10 focus:border-lime-400' : 'bg-white/60 border-black/10'}`} />
                                 </div>
                             </div>

                             <div className="relative z-20">
                                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1 block">Дата релиза</label>
                                <button 
                                    onClick={() => setShowAlbumCalendar(!showAlbumCalendar)}
                                    className={`w-full px-4 py-3 rounded-2xl border text-left text-sm font-medium flex items-center justify-between cursor-pointer transition-colors
                                        ${isDarkMode ? 'bg-black/40 border-white/10 hover:bg-black/50 text-white' : 'bg-white/60 border-black/10 hover:bg-white/80 text-black'}`}
                                >
                                    <span className="flex items-center gap-2"><Calendar size={16} className="text-zinc-500"/> {albumRelease.toLocaleDateString()}</span>
                                </button>
                                <AnimatePresence>
                                    {showAlbumCalendar && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 mb-2 z-30 w-full">
                                            <CustomCalendar value={albumRelease} onChange={(d) => { setAlbumRelease(d); setShowAlbumCalendar(false); }} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* === Заглушка ПЛЕЙЛИСТ === */}
                    {activeTab === 'playlist' && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <ListMusic size={64} className="mb-4 text-zinc-500" />
                            <h3 className="text-xl font-bold mb-2">Раздел в разработке</h3>
                            <p className="text-sm text-center max-w-md text-zinc-500">Функционал создания редакторских плейлистов появится в следующих обновлениях.</p>
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>
        </div>

        <div className={`p-6 border-t flex justify-end shrink-0 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
            <button onClick={handleUpload} disabled={status !== 'idle'} 
                className="px-10 py-4 bg-lime-400 text-black rounded-2xl font-black text-lg hover:bg-lime-500 transition-all shadow-[0_0_20px_rgba(163,230,53,0.4)] active:scale-95 disabled:opacity-50 flex items-center gap-3 cursor-pointer">
                Загрузить в ECHO <UploadCloud size={20} />
            </button>
        </div>
      </div>
    </div>
  );
}