// frontend/components/messages/GroupConversationEditor.tsx

'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Globe, Lock, Copy, Plus, UserMinus, Search, Trash2, Camera, Crown } from 'lucide-react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import Toast from '@/components/Toast';
import Avatar from '@/components/Avatar';
import Tooltip from '@/components/Tooltip';
import Link from 'next/link';
import { formatTimeAgo } from '@/lib/time-ago';
import Cookies from 'js-cookie';
import ConfirmationModal from '@/components/ConfirmationModal';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';
import CustomSelect from '@/components/CustomSelect';

const UPDATE_GROUP = gql`
  mutation UpdateGroup($conversationId: Int!, $title: String, $avatar: String, $slug: String) {
    updateGroupConversation(conversationId: $conversationId, title: $title, avatar: $avatar, slug: $slug)
  }
`;

const CREATE_INVITE = gql`
  mutation CreateInvite($conversationId: Int!, $usageLimit: Int, $expiresInMinutes: Int) {
    createInviteLink(conversationId: $conversationId, usageLimit: $usageLimit, expiresInMinutes: $expiresInMinutes)
  }
`;

const GET_CONVERSATION_PARTICIPANTS = gql`
  query GetConversationParticipants($conversationId: Int!) {
    conversationParticipants(conversationId: $conversationId) {
      id
      username
      name
      avatar
      role
      isOnline
      lastOnlineAt
    }
  }
`;

const KICK_PARTICIPANT = gql`
  mutation KickParticipant($conversationId: Int!, $userId: Int!) {
    kickFromConversation(conversationId: $conversationId, userId: $userId)
  }
`;

const SEARCH_USERS = gql`
  query SearchUsersForInvite($query: String!) {
    searchUsers(query: $query) {
      id
      username
      name
      avatar
    }
  }
`;

const ADD_PARTICIPANT = gql`
  mutation AddParticipantToConversation($conversationId: Int!, $userId: Int!) {
    addParticipantToConversation(conversationId: $conversationId, userId: $userId)
  }
`;

const GET_INVITES = gql`
  query GetConversationInvites($conversationId: Int!) {
    getConversationInvites(conversationId: $conversationId) {
      id
      code
      expiresAt
      usageLimit
      usedCount
      createdAt
    }
  }
`;

const REVOKE_INVITE = gql`
  mutation RevokeInvite($inviteId: Int!) {
    revokeInviteLink(inviteId: $inviteId)
  }
`;


interface EditorProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  currentTitle?: string | null;
  currentAvatar?: string | null;
  currentSlug?: string | null;
  myRole?: 'ADMIN' | 'MEMBER' | 'MODERATOR'; 
  type?: 'GROUP' | 'CHANNEL' | 'DIRECT'; 
  onUpdate: () => void;
}

export default function GroupConversationEditor({
  isOpen,
  onClose,
  conversationId,
  currentTitle,
  currentAvatar,
  currentSlug,
  myRole = 'MEMBER',
  type = 'GROUP', 
  onUpdate,
}: EditorProps) {
  const { isDarkMode } = useTheme();
  
  const [title, setTitle] = useState(currentTitle || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentAvatar || null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isPublic, setIsPublic] = useState(!!currentSlug);
  const [slug, setSlug] = useState(currentSlug || '');
  
  const [inviteLimit, setInviteLimit] = useState<string>(''); 
  const [inviteExpire, setInviteExpire] = useState<string>('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [kickConfirmOpen, setKickConfirmOpen] = useState(false);
  const [participantToKick, setParticipantToKick] = useState<number | null>(null);

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [updateGroup] = useMutation(UPDATE_GROUP);
  const [createInvite] = useMutation(CREATE_INVITE);
  const [kickParticipant] = useMutation(KICK_PARTICIPANT);
  const [addParticipant] = useMutation(ADD_PARTICIPANT);

  const { data: participantsData, refetch: refetchParticipants } = useQuery(GET_CONVERSATION_PARTICIPANTS, {
    variables: { conversationId },
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });

  const { data: invitesData, refetch: refetchInvites } = useQuery(GET_INVITES, {
    variables: { conversationId },
    skip: !isOpen || type !== 'CHANNEL' || myRole !== 'ADMIN',
    fetchPolicy: 'network-only',
  });

  const [revokeInvite] = useMutation(REVOKE_INVITE, {
    onCompleted: () => {
      refetchInvites();
      setToast({ message: 'Ссылка удалена', type: 'success' });
    }
  });

  const { data: searchUsersData } = useQuery(SEARCH_USERS, {
    variables: { query: inviteSearchQuery },
    skip: !isOpen || inviteSearchQuery.trim().length < 2,
    fetchPolicy: 'network-only',
  });

  const isChannel = type === 'CHANNEL';
  const entityName = isChannel ? 'канала' : 'беседы';

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle || '');
      setAvatarPreview(currentAvatar || null);
      setAvatarFile(null);
      setAvatarRemoved(false);
      setIsPublic(!!currentSlug);
      setSlug(currentSlug || '');
      setGeneratedLink(null);
    }
  }, [isOpen, currentTitle, currentAvatar, currentSlug]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      alert('Пожалуйста, выберите изображение (JPG, PNG, GIF или WebP)'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5MB'); return;
    }
    setAvatarFile(file);
    setAvatarRemoved(false);
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
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      return data.url;
    } catch (error) {
      return null;
    }
  };

  const handleSave = async () => {
    setUploadingAvatar(true);
    let avatarUrl: string | null = currentAvatar || null;

    if (avatarRemoved) {
      avatarUrl = null;
    } else if (avatarFile) {
      const uploadedUrl = await uploadAvatar(avatarFile);
      if (uploadedUrl) avatarUrl = uploadedUrl;
      else {
          setToast({ message: 'Не удалось загрузить аватар', type: 'error' });
          setUploadingAvatar(false);
          return;
      }
    }

    try {
      await updateGroup({
        variables: {
          conversationId,
          title: title.trim() || null,
          avatar: avatarUrl,
          slug: isPublic && isChannel ? slug.trim() : null 
        },
      });
      onUpdate();
      onClose();
    } catch (e: any) {
        setToast({ message: e.message, type: 'error' });
    } finally {
        setUploadingAvatar(false);
    }
  };

  const handleGenerateLink = async () => {
      try {
          const { data } = await createInvite({
              variables: {
                  conversationId,
                  usageLimit: inviteLimit ? parseInt(inviteLimit) : null,
                  expiresInMinutes: inviteExpire ? parseInt(inviteExpire) : null
              }
          });
          const code = data.createInviteLink;
          const link = `${window.location.origin}/invite/${code}`;
          setGeneratedLink(link);
          refetchInvites();
      } catch (e: any) {
          setToast({ message: 'Ошибка создания ссылки', type: 'error' });
      }
  };

  const copyLink = async (linkToCopy?: string) => {
      const textToCopy = linkToCopy || generatedLink;
      if (!textToCopy) return;

      try {
          if (navigator?.clipboard?.writeText) {
              await navigator.clipboard.writeText(textToCopy);
              setToast({ message: 'Скопировано', type: 'success' });
          } else {
              const textArea = document.createElement("textarea");
              textArea.value = textToCopy;
              textArea.style.position = "fixed";
              textArea.style.left = "-999999px";
              textArea.style.top = "-999999px";
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              try {
                  const successful = document.execCommand('copy');
                  if (successful) {
                      setToast({ message: 'Скопировано', type: 'success' });
                  } else {
                      setToast({ message: 'Не удалось скопировать', type: 'error' });
                  }
              } catch (err) {
                  setToast({ message: 'Ошибка копирования', type: 'error' });
              } finally {
                  textArea.remove();
              }
          }
      } catch (err) {
          console.error('Failed to copy: ', err);
          setToast({ message: 'Ошибка копирования', type: 'error' });
      }
  };

  const handleKickParticipantClick = (userId: number) => {
    setParticipantToKick(userId);
    setKickConfirmOpen(true);
  };

  const handleKickConfirm = async () => {
    if (!participantToKick) return;
    try {
      await kickParticipant({ variables: { conversationId, userId: participantToKick } });
      refetchParticipants();
      onUpdate();
      setKickConfirmOpen(false);
      setParticipantToKick(null);
    } catch (e: any) {
      setToast({ message: e.message || 'Не удалось исключить', type: 'error' });
    }
  };

  const handleAddParticipant = async (userId: number) => {
    try {
      await addParticipant({ variables: { conversationId, userId } });
      refetchParticipants();
      onUpdate();
      setInviteSearchQuery('');
    } catch (e: any) {
      const msg = e.graphQLErrors?.[0]?.message || e.message || 'Не удалось добавить';
      setToast({ message: msg, type: 'error' });
    }
  };

  const participants = participantsData?.conversationParticipants || [];
  const searchResults = searchUsersData?.searchUsers || [];
  const participantIds = new Set(participants.map((p: any) => p.id));
  const canAddUsers = searchResults.filter((u: any) => !participantIds.has(u.id));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {toast && <Toast key="editor-toast" message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <motion.div 
        key="editor-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl cursor-default" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
            key="editor-content"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-4xl rounded-[32px] overflow-hidden flex flex-col max-h-[85vh] relative cursor-default border shadow-xl
              ${isDarkMode 
                ? 'bg-zinc-900/80 border-zinc-700 text-zinc-100' 
                : 'bg-white/95 border-zinc-200 text-zinc-900'
              }`}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* HEADER */}
          <div className={`p-6 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white/90' : 'text-zinc-900'}`}>Редактор {entityName}</h2>
            <button onClick={onClose} className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'}`}>
                <X size={20}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            <div className="md:grid md:grid-cols-2 md:gap-8 space-y-8 md:space-y-0">
                
                {/* ЛЕВАЯ КОЛОНКА: ОСНОВНЫЕ НАСТРОЙКИ */}
                <div className="space-y-6">
                    {/* AVATAR & TITLE */}
                    <div className="flex items-start gap-4">
                        <div className="relative group shrink-0">
                            <div 
                                className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden relative cursor-pointer shadow-xl transition-all duration-300 group-hover:scale-105 border-4 ${isDarkMode ? 'border-zinc-800' : 'border-white'}`}
                                onClick={() => myRole === 'ADMIN' && fileInputRef.current?.click()}
                            >
                                {avatarPreview ? (
                                    <img src={getAvatarUrl(avatarPreview) || avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                                        <ImageIcon className="text-zinc-500 opacity-50" size={28} />
                                    </div>
                                )}
                                
                                {myRole === 'ADMIN' && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Camera size={20} className="text-white drop-shadow-md" />
                                    </div>
                                )}
                            </div>
                            
                            {myRole === 'ADMIN' && (
                                <>
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" id="editor-avatar-upload" />
                                    {avatarPreview && (
                                        <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); setAvatarRemoved(true); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 transition-transform cursor-pointer"><X size={12} /></button>
                                    )}
                                </>
                            )}
                        </div>
                        
                        <div className="flex-1 space-y-1 pt-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Название</label>
                            <input 
                                value={title} 
                                onChange={e => setTitle(e.target.value)} 
                                disabled={myRole !== 'ADMIN'}
                                placeholder={`Введите название`}
                                className={`w-full p-3 rounded-xl outline-none font-medium text-base transition-all border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:border-lime-500' : 'bg-zinc-100 border-zinc-200 text-zinc-900 focus:border-lime-500'}`}
                            />
                        </div>
                    </div>

                    {/* CHANNEL SETTINGS */}
                    {isChannel && myRole === 'ADMIN' && (
                        <div className={`p-1 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/30 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                            <div className={`flex gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-zinc-900/50' : 'bg-zinc-200/50'}`}>
                                <button onClick={() => setIsPublic(true)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${isPublic ? 'bg-lime-400 text-black shadow-lg shadow-lime-500/20' : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black')}`}>
                                    <Globe size={14} /> Публичный
                                </button>
                                <button onClick={() => setIsPublic(false)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${!isPublic ? 'bg-lime-400 text-black shadow-lg shadow-lime-500/20' : (isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black')}`}>
                                    <Lock size={14} /> Приватный
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {isPublic ? (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 pt-2">
                                        <label className="text-[10px] text-zinc-500 ml-1 mb-1 block uppercase font-bold">Ссылка</label>
                                        <div className={`flex items-center px-4 py-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-zinc-700 focus-within:border-lime-400' : 'bg-white border-zinc-300 focus-within:border-lime-500'}`}>
                                            <span className="text-zinc-500 mr-1 select-none">@</span>
                                            <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="channel_link" className="bg-transparent outline-none w-full text-sm" />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="p-4">
                                        
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <CustomSelect 
                                                    options={[{ value: "", label: "Срок: ∞" }, { value: "60", label: "1 час" }, { value: "1440", label: "1 день" }, { value: "10080", label: "1 неделя" }]}
                                                    value={inviteExpire} onChange={setInviteExpire} isDarkMode={isDarkMode} className="flex-1 text-xs"
                                                />
                                                <CustomSelect 
                                                    options={[{ value: "", label: "Лимит: ∞" }, { value: "1", label: "1 чел." }, { value: "10", label: "10 чел." }, { value: "100", label: "100 чел." }]}
                                                    value={inviteLimit} onChange={setInviteLimit} isDarkMode={isDarkMode} className="flex-1 text-xs"
                                                />
                                            </div>

                                            <button 
                                                onClick={handleGenerateLink} 
                                                className="w-full py-2.5 bg-lime-400 text-black font-bold text-xs rounded-xl hover:bg-lime-500 transition-colors shadow-sm cursor-pointer uppercase tracking-wide"
                                            >
                                                Создать ссылку
                                            </button>
                                        </div>

                                        {generatedLink && (
                                            <div onClick={() => copyLink(generatedLink)} className={`p-3 mt-4 rounded-xl flex items-center justify-between cursor-pointer group hover:ring-1 hover:ring-lime-400/50 transition-all ${isDarkMode ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-100 border border-zinc-200'}`}>
                                                <span className="text-xs text-lime-500 truncate mr-2 font-medium">{generatedLink}</span>
                                                <Copy size={14} className="text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                                            </div>
                                        )}

                                        {invitesData?.getConversationInvites?.length > 0 && (
                                            <div className={`mt-4 pt-3 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Активные ссылки</h4>
                                                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar -mr-4 pr-1">
                                                    {invitesData.getConversationInvites.map((inv: any) => (
                                                        <div key={inv.id} className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                <span 
                                                                    onClick={() => copyLink(`${window.location.origin}/invite/${inv.code}`)}
                                                                    className="text-xs font-bold text-lime-500 truncate cursor-pointer hover:underline mb-0.5"
                                                                >
                                                                    .../invite/{inv.code}
                                                                </span>
                                                                <div className="flex gap-2 text-[9px] text-zinc-500">
                                                                    <span>{inv.usedCount}{inv.usageLimit ? `/${inv.usageLimit}` : ''}</span>
                                                                    {inv.expiresAt && <span>до {new Date(inv.expiresAt).toLocaleDateString()}</span>}
                                                                </div>
                                                            </div>
                                                            <button onClick={() => revokeInvite({ variables: { inviteId: inv.id } })} className={`p-1.5 rounded-md cursor-pointer ml-2 ${isDarkMode ? 'text-zinc-500 hover:text-red-500' : 'text-zinc-400 hover:text-red-500'}`}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* ПРАВАЯ КОЛОНКА: УЧАСТНИКИ И ПОИСК */}
                <div className="flex flex-col h-full min-h-[300px]">
                     {myRole === 'ADMIN' && (
                        <div className="mb-4 space-y-2 shrink-0">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Добавить участника</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    value={inviteSearchQuery}
                                    onChange={(e) => setInviteSearchQuery(e.target.value)}
                                    placeholder="Поиск..."
                                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-sm border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600' : 'bg-zinc-100 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'}`}
                                />
                            </div>
                            
                            <AnimatePresence>
                                {inviteSearchQuery.trim().length >= 2 && canAddUsers.length > 0 && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1 mt-1 overflow-hidden">
                                        {canAddUsers.map((user: any) => (
                                            <div key={user.id} className={`p-2 rounded-lg flex items-center justify-between gap-2 ${isDarkMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-zinc-100'}`}>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Avatar username={user.username} name={user.name} url={user.avatar} size="sm" className="w-6 h-6" />
                                                    <span className={`text-xs font-medium truncate ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{user.name || user.username}</span>
                                                </div>
                                                <button onClick={() => handleAddParticipant(user.id)} className="p-1.5 bg-lime-400/10 hover:bg-lime-400 text-lime-400 hover:text-black rounded-md transition-all cursor-pointer">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-1 mb-2 shrink-0">
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Участники ({participants.length})</label>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        {participants.map((p: any) => (
                            <div key={p.id} className={`p-2 rounded-xl flex items-center justify-between group transition-all duration-300 ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
                                <Link href={`/dashboard/user/${p.id}`} className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                                    <div className="relative">
                                        <Avatar username={p.username} name={p.name} url={p.avatar} size="sm" />
                                        {p.isOnline && <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-lime-500 rounded-full border-2 ${isDarkMode ? 'border-zinc-900' : 'border-white'}`} />}
                                    </div>
                                    <div className="min-w-0 flex flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-sm font-bold truncate ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{p.name || p.username}</span>
                                            {p.role === 'ADMIN' && <Crown size={12} className="text-yellow-500 fill-yellow-500/20" />}
                                        </div>
                                        <span className="text-[10px] text-zinc-500 font-medium">
                                            {p.isOnline ? 'В сети' : p.lastOnlineAt ? formatTimeAgo(p.lastOnlineAt) : 'Не в сети'}
                                        </span>
                                    </div>
                                </Link>

                                {myRole === 'ADMIN' && p.role !== 'ADMIN' && (
                                    <Tooltip content="Исключить">
                                        <button onClick={() => handleKickParticipantClick(p.id)} className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer ${isDarkMode ? 'text-zinc-600 hover:text-red-500 hover:bg-red-500/10' : 'text-zinc-400 hover:text-red-500 hover:bg-red-100'}`}>
                                            <UserMinus size={16} />
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

          </div>

          <div className={`p-6 border-t flex items-center justify-end gap-3 shrink-0 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-zinc-200 bg-zinc-50/50'}`}>
             <button onClick={onClose} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-black bg-zinc-100 hover:bg-zinc-200'}`}>
                 Отмена
             </button>
             {myRole === 'ADMIN' && (
                 <button 
                    onClick={handleSave} 
                    disabled={uploadingAvatar} 
                    className={`px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-lime-500/20 transition-all active:scale-95 cursor-pointer
                        ${uploadingAvatar ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-lime-400 text-black hover:bg-lime-500'}`}
                 >
                     {uploadingAvatar ? 'Сохранение...' : 'Сохранить'}
                 </button>
             )}
          </div>

        </motion.div>
      </motion.div>

      <ConfirmationModal
        key="kick-confirm-modal"
        isOpen={kickConfirmOpen}
        onClose={() => { setKickConfirmOpen(false); setParticipantToKick(null); }}
        onConfirm={handleKickConfirm}
        title="Исключить участника?"
        message={`Вы уверены, что хотите исключить этого участника из ${entityName}?`}
      />
    </AnimatePresence>
  );
}