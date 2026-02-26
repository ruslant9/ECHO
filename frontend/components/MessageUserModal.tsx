'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader, Search, Users, Image as ImageIcon, Megaphone, Globe, Lock, ArrowRight, Plus } from 'lucide-react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Avatar from './Avatar';
import { useTheme } from '@/context/ThemeContext';
import { useDebounce } from '@/hooks/use-debounce';
import { formatTimeAgo } from '@/lib/time-ago';

const SEARCH_USERS = gql`
    query SearchUsers($query: String!) {
        searchUsers(query: $query) { id username name avatar isOnline lastOnlineAt }
    }
`;

const CREATE_GROUP_CONVERSATION = gql`
  mutation CreateGroupConversation($participantIds: [Int!]!, $title: String!, $avatar: String) {
    createGroupConversation(participantIds: $participantIds, title: $title, avatar: $avatar)
  }
`;

const CREATE_CHANNEL = gql`
  mutation CreateChannel($input: CreateChannelInput!) {
    createChannel(input: $input) { id }
  }
`;

interface UserToMessage {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
  isOnline: boolean;
  lastOnlineAt?: string;
}

interface MessageUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: number;
}

type Mode = 'direct' | 'group' | 'channel';

export default function MessageUserModal({ isOpen, onClose, currentUserId }: MessageUserModalProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [mode, setMode] = useState<Mode>('direct');
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Record<number, UserToMessage>>({});
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [isPublicChannel, setIsPublicChannel] = useState(true);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, loading } = useQuery(SEARCH_USERS, {
    variables: { query: debouncedSearchQuery },
    skip: !isOpen || mode === 'channel' || debouncedSearchQuery.length < 2,
    fetchPolicy: 'network-only',
  });

  const [createGroup] = useMutation(CREATE_GROUP_CONVERSATION);
  const [createChannel] = useMutation(CREATE_CHANNEL);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setMode('direct');
      setSelectedIds(new Set());
      setSelectedUsers({});
      setTitle('');
      setDescription('');
      setSlug('');
      setIsPublicChannel(true);
      setAvatarFile(null);
      setAvatarPreview(null);
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUserSelect = (user: UserToMessage) => {
    if (mode === 'direct') {
      onClose();
      router.push(`/dashboard/messages?userId=${user.id}`);
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.add(user.id);
      return next;
    });

    setSelectedUsers((prev) => {
      const copy = { ...prev };
      if (copy[user.id] && !selectedIds.has(user.id)) delete copy[user.id];
      else copy[user.id] = user;
      return copy;
    });
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      alert('Выберите изображение (JPG, PNG, GIF или WebP)'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5MB'); return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = Cookies.get('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}/upload/avatar`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      return data.url;
    } catch (error) {
      return null;
    }
  };

  const handleCreateGroup = async () => {
    const ids = Array.from(selectedIds).filter((id) => id !== currentUserId);
    if (ids.length < 2 || !title.trim()) return;
    setUploadingAvatar(true);
    let avatarUrl = avatarFile ? await uploadAvatar(avatarFile) : null;

    try {
      const { data } = await createGroup({
        variables: { participantIds: ids, title: title.trim(), avatar: avatarUrl },
      });
      if (data?.createGroupConversation) {
        onClose();
        router.push(`/dashboard/messages?conversationId=${data.createGroupConversation}`);
      }
    } catch (e) { console.error(e); } 
    finally { setUploadingAvatar(false); }
  };

  const handleCreateChannel = async () => {
    if (!title.trim()) return;
    setUploadingAvatar(true);
    let avatarUrl = avatarFile ? await uploadAvatar(avatarFile) : null;

    try {
        const { data } = await createChannel({
            variables: {
                input: {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    slug: isPublicChannel && slug.trim() ? slug.trim() : undefined,
                    avatar: avatarUrl
                }
            }
        });
        if (data?.createChannel?.id) {
            onClose();
            router.push(`/dashboard/messages?conversationId=${data.createChannel.id}`);
        }
    } catch (e: any) { alert(e.message || 'Ошибка создания канала'); } 
    finally { setUploadingAvatar(false); }
  };

  const searchResults: UserToMessage[] = data?.searchUsers || [];

  const tabs: { id: Mode; label: string; icon?: any }[] = [
    { id: 'direct', label: 'Личное' },
    { id: 'group', label: 'Беседа', icon: Users },
    { id: 'channel', label: 'Канал', icon: Megaphone }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border backdrop-blur-2xl
             ${isDarkMode ? 'bg-zinc-900/90 border-white/10 text-zinc-100 shadow-[0_0_40px_rgba(0,0,0,0.5)]' : 'bg-white/90 border-zinc-200 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'}`}
        >
          {/* HEADER */}
          <div className={`px-6 py-5 flex items-center justify-between shrink-0 border-b ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
            <h2 className="text-xl font-bold tracking-tight">Новое сообщение</h2>
            <button onClick={onClose} className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-black'}`}>
              <X size={20} />
            </button>
          </div>

          {/* TABS */}
          <div className="px-6 py-4 shrink-0">
            <div className={`flex items-center p-1.5 rounded-2xl relative border ${isDarkMode ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-100 border-zinc-200/50'}`}>
                {tabs.map((tab) => {
                    const isActive = mode === tab.id;
                    return (
                        <button 
                            key={tab.id}
                            onClick={() => setMode(tab.id)}
                            className={`relative flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors z-10 
                                ${isActive 
                                    ? (isDarkMode ? 'text-white' : 'text-zinc-900') 
                                    : (isDarkMode ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-700')}`}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="modal-tab-blob" 
                                    className={`absolute inset-0 rounded-xl -z-10 shadow-sm border
                                        ${isDarkMode ? 'bg-zinc-700 border-zinc-600' : 'bg-white border-zinc-200'}`} 
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }} 
                                />
                            )}
                            {tab.icon && <tab.icon size={16} />}
                            {tab.label}
                        </button>
                    )
                })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* === ФОРМА ДЛЯ КАНАЛА === */}
                {mode === 'channel' && (
                  <>
                    <div className="flex gap-4 items-start">
                        {/* ИСПРАВЛЕНО: Убран backdrop-blur-sm, добавлено isolation для Webkit */}
                        <div className="relative shrink-0 group isolate">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center border overflow-hidden relative cursor-pointer transition-colors
                                ${isDarkMode ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-500' : 'border-zinc-300 bg-zinc-100 hover:border-zinc-400'}`}
                                onClick={() => fileInputRef.current?.click()}
                                style={{ transform: 'translateZ(0)' }} // Исправляет рендеринг закругления в Safari/Chrome
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={24} className={isDarkMode ? "text-zinc-500" : "text-zinc-400"} />
                                )}
                                {/* Убран backdrop-blur-sm */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Plus size={20} className="text-white" />
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                            {avatarPreview && (
                                <button onClick={() => {setAvatarFile(null); setAvatarPreview(null);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md cursor-pointer hover:scale-110 transition-transform z-10"><X size={12} /></button>
                            )}
                        </div>
                        <div className="flex-1 space-y-3">
                            <input 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                placeholder="Название канала"
                                className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-medium border transition-colors cursor-text
                                    ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700 focus:border-lime-400 text-white' : 'bg-zinc-100 border-zinc-200 focus:border-lime-500 text-zinc-900'}`}
                            />
                            <textarea 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Описание (необязательно)"
                                rows={2}
                                className={`w-full px-4 py-3 rounded-xl outline-none text-sm resize-none border transition-colors cursor-text
                                    ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700 focus:border-lime-400 text-white' : 'bg-zinc-100 border-zinc-200 focus:border-lime-500 text-zinc-900'}`}
                            />
                        </div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className={`flex gap-2 mb-3 p-1 rounded-xl ${isDarkMode ? 'bg-zinc-900/50' : 'bg-zinc-200/50'}`}>
                            <button onClick={() => setIsPublicChannel(true)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${isPublicChannel ? 'bg-lime-400 text-black shadow-sm' : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')}`}>
                                <Globe size={14} /> Публичный
                            </button>
                            <button onClick={() => setIsPublicChannel(false)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${!isPublicChannel ? 'bg-lime-400 text-black shadow-sm' : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')}`}>
                                <Lock size={14} /> Частный
                            </button>
                        </div>
                        {isPublicChannel ? (
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500 ml-1 font-semibold uppercase tracking-wider">Ссылка</label>
                                <div className={`flex items-center px-4 py-3 rounded-xl border transition-colors cursor-text
                                    ${isDarkMode ? 'bg-zinc-900/50 border-zinc-700 focus-within:border-lime-400' : 'bg-white border-zinc-300 focus-within:border-lime-500'}`}>
                                    <span className="text-zinc-400 mr-1 font-bold">@</span>
                                    <input 
                                        value={slug}
                                        onChange={e => setSlug(e.target.value.replace(/\s+/g, ''))}
                                        placeholder="channel_link"
                                        className="bg-transparent w-full outline-none text-sm font-medium"
                                    />
                                </div>
                                <p className="text-[10px] text-zinc-500 ml-1">Можно будет найти через поиск</p>
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-500 text-center py-4 font-medium">Доступ только по пригласительной ссылке</p>
                        )}
                    </div>
                  </>
                )}

                {/* === ФОРМА ДЛЯ ГРУППЫ ИЛИ ЛС === */}
                {mode !== 'channel' && (
                  <>
                    {mode === 'group' && (
                        <div className="flex gap-4 items-center mb-4">
                             {/* ИСПРАВЛЕНО: Убран backdrop-blur-sm, добавлено isolation для Webkit */}
                             <div className="relative shrink-0 group isolate">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center border overflow-hidden relative cursor-pointer transition-colors
                                    ${isDarkMode ? 'border-zinc-700 bg-zinc-800 hover:border-zinc-500' : 'border-zinc-300 bg-zinc-100 hover:border-zinc-400'}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ transform: 'translateZ(0)' }} // Исправляет рендеринг закругления
                                >
                                    {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" /> : <ImageIcon size={20} className={isDarkMode ? "text-zinc-500" : "text-zinc-400"} />}
                                    {/* Убран backdrop-blur-sm */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Plus size={16} className="text-white" />
                                    </div>
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                                {avatarPreview && (
                                    <button onClick={() => {setAvatarFile(null); setAvatarPreview(null);}} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-md cursor-pointer hover:scale-110 transition-transform z-10"><X size={10} /></button>
                                )}
                            </div>
                            <input 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                placeholder="Название беседы"
                                className={`flex-1 px-4 py-3 rounded-xl outline-none text-sm font-medium border transition-colors cursor-text
                                    ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700 focus:border-lime-400 text-white' : 'bg-zinc-100 border-zinc-200 focus:border-lime-500 text-zinc-900'}`}
                            />
                        </div>
                    )}

                    <div className="relative flex items-center mb-4">
                        <Search size={18} className="absolute left-4 text-zinc-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск людей..."
                            className={`w-full pl-11 pr-4 py-3.5 rounded-xl outline-none text-sm font-medium border transition-colors cursor-text
                                ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700 focus:border-lime-400 placeholder:text-zinc-500 text-white' : 'bg-zinc-100 border-zinc-200 focus:border-lime-500 placeholder:text-zinc-400 text-zinc-900'}`}
                        />
                    </div>

                    <div className="space-y-1">
                        {/* Selected Users Chips for Group */}
                        {mode === 'group' && selectedIds.size > 0 && (
                            <div className={`flex flex-wrap gap-2 mb-4 p-3 rounded-xl border ${isDarkMode ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                                <span className="w-full text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Участники ({selectedIds.size})</span>
                                <AnimatePresence>
                                    {Array.from(selectedIds).map(id => {
                                        const u = selectedUsers[id];
                                        if (!u) return null;
                                        return (
                                            <motion.button 
                                                key={id} 
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                onClick={() => handleUserSelect(u)} 
                                                className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border
                                                    ${isDarkMode ? 'bg-zinc-900 border-zinc-700 hover:border-red-900/50 hover:text-red-400' : 'bg-white border-zinc-200 hover:border-red-200 hover:text-red-500'}`}
                                            >
                                                <Avatar username={u.username} name={u.name} url={u.avatar} size="sm" className="w-5 h-5" />
                                                <span>{u.name || u.username}</span>
                                                <X size={12} className="opacity-50" />
                                            </motion.button>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Search Results */}
                        {debouncedSearchQuery.length < 2 ? (
                            <div className="text-center py-10 opacity-50 text-xs font-medium">Введите имя для поиска</div>
                        ) : loading ? (
                            <div className="flex justify-center py-10"><Loader className="animate-spin text-lime-400" /></div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center py-10 opacity-50 text-xs font-medium">Пользователи не найдены</div>
                        ) : (
                            <div className="space-y-1">
                                {searchResults.map(user => {
                                    const isSelected = mode === 'group' && selectedIds.has(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => handleUserSelect(user)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left cursor-pointer border border-transparent
                                                ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}
                                                ${isSelected ? (isDarkMode ? 'bg-lime-400/10 border-lime-400/30' : 'bg-lime-400/20 border-lime-400/50') : ''}`}
                                        >
                                            <Avatar username={user.username} name={user.name} url={user.avatar} size="md" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate">{user.name || user.username}</div>
                                                <div className={`text-xs truncate mt-0.5 ${user.isOnline ? 'text-lime-500 font-medium' : 'text-zinc-500'}`}>
                                                    {user.isOnline ? 'Онлайн' : user.lastOnlineAt ? formatTimeAgo(user.lastOnlineAt) : 'Не в сети'}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="w-5 h-5 rounded-full bg-lime-400 text-black flex items-center justify-center mr-2 shadow-sm">
                                                    <X size={12} strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* FOOTER */}
          <div className={`p-5 border-t flex items-center justify-between gap-4 shrink-0 ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
             <div className="text-xs font-medium text-zinc-500">
                {mode === 'group' && `Выбрано: ${selectedIds.size}`}
                {mode === 'channel' && `Создание канала`}
             </div>
             
             {mode !== 'direct' && (
                 <button
                    onClick={mode === 'group' ? handleCreateGroup : handleCreateChannel}
                    disabled={uploadingAvatar || (mode === 'group' ? (selectedIds.size < 2 || !title) : !title)}
                    className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer
                        ${uploadingAvatar || (mode === 'group' ? (selectedIds.size < 2 || !title) : !title)
                            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none'
                            : 'bg-lime-400 text-black hover:bg-lime-500 shadow-[0_0_15px_rgba(163,230,53,0.4)] active:scale-95'
                        }
                    `}
                 >
                    {uploadingAvatar ? <><Loader size={16} className="animate-spin"/> Загрузка...</> : <>Создать <ArrowRight size={16} /></>}
                 </button>
             )}
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}