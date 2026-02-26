'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pin, 
  VolumeX, 
  Bell, 
  BellOff, 
  MoreVertical, 
  Trash2, 
  Mail, 
  MailOpen, 
  Archive, 
  ArchiveRestore, 
  Heart, 
  LogOut, 
  Megaphone, 
  Bookmark, 
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import { formatTimeAgo } from '@/lib/time-ago';
import { Conversation } from '@/types/messages';
import { gql, useMutation } from '@apollo/client';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toHex, APPLE_EMOJI_BASE_URL } from '@/lib/emoji-data';
import { getAvatarUrl } from '@/lib/avatar-url';

const GET_SIDEBAR_COUNTS_FOR_REFETCH = gql`
  query GetSidebarCounts {
    incomingRequests { id }
    myNotifications { id isRead }
    unreadConversationsCount 
  }
`;

const TOGGLE_PIN = gql`mutation TogglePinConversation($conversationId: Int!) { togglePinConversation(conversationId: $conversationId) }`;
const TOGGLE_MUTE = gql`mutation ToggleMuteConversation($conversationId: Int!) { toggleMuteConversation(conversationId: $conversationId) }`;
const MARK_UNREAD = gql`mutation MarkConversationAsUnread($conversationId: Int!) { markConversationAsUnread(conversationId: $conversationId) }`;
const MARK_READ = gql`mutation MarkMessagesRead($conversationId: Int!) { markMessagesRead(conversationId: $conversationId) }`;
const TOGGLE_ARCHIVE = gql`mutation ToggleArchiveConversation($conversationId: Int!) { toggleArchiveConversation(conversationId: $conversationId) }`;

interface ConversationItemProps {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
  isDarkMode: boolean;
  onUpdate: () => void;
  isTyping: boolean;
  typingUserName?: string;
  hasUnreadReaction?: boolean;
  onLeaveClick?: (conv: Conversation) => void;
  myId: number;
  onDelete: (conversationId: number, type: 'ME' | 'ALL') => void;
  isPinnedList?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMove?: (direction: 'up' | 'down') => void;
}

const renderTextWithAppleEmojis = (text: string) => {
  if (!text) return null;
  const emojiRegex = /(\p{Emoji_Presentation})/gu;
  const parts = text.split(emojiRegex);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.match(emojiRegex)) {
      const hex = toHex(part);
      if (hex && !/^[a-z0-9_]+$/i.test(part)) {
        return (
          <img
            key={`emoji-${index}`}
            src={`${APPLE_EMOJI_BASE_URL}${hex}.png`}
            alt={part}
            className="inline-block w-4 h-4 mx-px align-text-bottom"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const span = document.createElement('span');
                span.innerText = part;
                img.parentNode?.insertBefore(span, img);
            }}
          />
        );
      }
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
};

const TypingIndicator = ({ userName }: { userName?: string }) => {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const label = userName ? `${userName} печатает` : 'печатает';
  return (
    <span className="text-lime-500 font-medium flex items-center min-w-0">
      <span className="truncate">{label}</span>
      <span className="inline-block w-3 text-left shrink-0">{dots}</span>
    </span>
  );
};

export default function ConversationItem({
  conv,
  isActive,
  onClick,
  isDarkMode,
  onUpdate,
  isTyping,
  typingUserName,
  hasUnreadReaction = false,
  onLeaveClick,
  myId,
  onDelete,
  isPinnedList,
  isFirst,
  isLast,
  onMove
}: ConversationItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; type: 'ME' | 'ALL' | null }>({ isOpen: false, type: null });
  
  const [togglePin] = useMutation(TOGGLE_PIN, { optimisticResponse: { togglePinConversation: true }, update(cache) { cache.modify({ id: cache.identify({ __typename: 'Conversation', id: conv.id }), fields: { isPinned(existing) { return !existing; } } }); } });
  const [toggleMute] = useMutation(TOGGLE_MUTE, { optimisticResponse: { toggleMuteConversation: true }, update(cache) { cache.modify({ id: cache.identify({ __typename: 'Conversation', id: conv.id }), fields: { mutedUntil(existingValue) { const now = new Date(); const isCurrentlyMuted = existingValue && new Date(existingValue) > now; return isCurrentlyMuted ? null : new Date(now.setFullYear(now.getFullYear() + 100)).toISOString(); } }, }); } });
  const [markUnread] = useMutation(MARK_UNREAD, { optimisticResponse: { markConversationAsUnread: true }, refetchQueries: [GET_SIDEBAR_COUNTS_FOR_REFETCH], update(cache) { cache.modify({ id: cache.identify({ __typename: 'Conversation', id: conv.id }), fields: { isManuallyUnread() { return true; } } }); } });
  const [markRead] = useMutation(MARK_READ, { optimisticResponse: { markMessagesRead: true }, refetchQueries: [GET_SIDEBAR_COUNTS_FOR_REFETCH], update(cache) { cache.modify({ id: cache.identify({ __typename: 'Conversation', id: conv.id }), fields: { isManuallyUnread() { return false; }, unreadCount() { return 0; } } }); } });
  const [toggleArchive] = useMutation(TOGGLE_ARCHIVE, {
    optimisticResponse: { toggleArchiveConversation: true },
    onCompleted: () => {
        onUpdate(); 
    },
    update(cache) {
        cache.modify({
            id: cache.identify({ __typename: 'Conversation', id: conv.id }),
            fields: {
                isArchived(existingValue) { return !existingValue; },
                isManuallyUnread() { return false; }
            },
        });
    },
    onError: (err) => console.error("Archive error", err)
  });

  const lastMessageTime = conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt) : new Date(conv.updatedAt);
  const timeDisplay = formatTimeAgo(lastMessageTime);

  const isMuted = conv.mutedUntil && new Date(conv.mutedUntil) > new Date();
  const hasReaction = hasUnreadReaction;
  const hasRealUnread = conv.unreadCount > 0;
  const isManualUnread = conv.isManuallyUnread;
  const isMarkedAsActive = hasRealUnread || isManualUnread || hasReaction;

  const handlePinClick = (e: React.MouseEvent) => { e.stopPropagation(); togglePin({ variables: { conversationId: conv.id } }); setIsMenuOpen(false); };
  const handleMuteClick = (e: React.MouseEvent) => { e.stopPropagation(); toggleMute({ variables: { conversationId: conv.id } }); setIsMenuOpen(false); };
  const handleUnreadToggleClick = (e: React.MouseEvent) => { e.stopPropagation(); if (isMarkedAsActive) { markRead({ variables: { conversationId: conv.id } }); } else { markUnread({ variables: { conversationId: conv.id } }); } setIsMenuOpen(false); };
  const handleArchiveClick = (e: React.MouseEvent) => { e.stopPropagation(); toggleArchive({ variables: { conversationId: conv.id } }); setIsMenuOpen(false); };
  
  const handleDeleteClick = (e: React.MouseEvent, type: 'ME' | 'ALL') => {
      e.stopPropagation();
      setIsMenuOpen(false);
      setConfirmState({ isOpen: true, type });
  };
  
  const handleConfirmDelete = () => {
      if (confirmState.type) {
          onDelete(conv.id, confirmState.type);
      }
      setConfirmState({ isOpen: false, type: null });
  };

  const buttonBase =
    'w-full text-left px-3 py-3 text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer rounded-xl';
  const menuButtonClass = `${buttonBase} ${
    isDarkMode ? 'hover:bg-white/10 text-zinc-100' : 'hover:bg-black/5 text-zinc-800'
  }`;
  const deleteButtonClass = `${buttonBase} text-red-500 ${
    isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-500/10'
  }`;

  const messageContent = conv.lastMessage?.content || '';
  const hasImages = !!(conv.lastMessage as any)?.images?.length;
  const firstImage = hasImages ? getAvatarUrl((conv.lastMessage as any).images[0]) : null;
  const hasLastMessage = !!conv.lastMessage;

  const isChannel = conv.type === 'CHANNEL';
  const entityName = isChannel ? 'канал' : 'беседу';
  const entityFromName = isChannel ? 'канала' : 'беседы';
  const isAdmin = conv.myRole === 'ADMIN';
  const isFavorites = !conv.isGroup && conv.participant?.id === myId;
  const title = isFavorites ? 'Избранное' : (conv.title || conv.participant?.name || conv.participant?.username || 'Беседа');

  const AvatarComponent = () => {
    if (isFavorites) {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-orange-500/20 text-orange-500' : 'bg-orange-100 text-orange-600'}`}>
                <Bookmark size={20} className="fill-current" />
            </div>
        )
    }
    return (
        <Avatar
            username={conv.isGroup ? (conv.title || 'Беседа') : (conv.participant?.username || '?')}
            name={conv.isGroup ? (conv.title || 'Беседа') : (conv.participant?.name || undefined)}
            url={conv.avatar || conv.participant?.avatar || null}
            size="md"
        />
    )
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
      animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      transition={{ duration: 0.2 }}
      style={{ zIndex: isMenuOpen || confirmState.isOpen ? 20 : 0 }}
      className="relative"
    >
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={confirmState.type === 'ALL' ? "Удалить у всех?" : (isFavorites ? "Очистить историю?" : "Удалить у себя?")}
        message={isFavorites ? "Все сообщения будут удалены безвозвратно." : "Действие нельзя отменить."}
      />
      
      <motion.div
        whileHover={isMenuOpen ? {} : { scale: 1.01 }}
        onClick={onClick}
        className={`group relative mx-2 flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition-colors duration-200 border select-none
          ${isActive ? (isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white shadow-sm border-zinc-200') : (isDarkMode ? 'bg-black border-zinc-800 hover:bg-zinc-900' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm')}
        `}
      >
        {isPinnedList && !conv.isArchived && (
          <div className="flex flex-col gap-1 pr-1 shrink-0 opacity-100 transition-opacity">
            <button
              disabled={isFirst}
              onClick={(e) => {
                e.stopPropagation();
                onMove?.('up');
              }}
              className={`p-0.5 rounded-md hover:bg-lime-400 hover:text-black transition-colors ${isFirst ? 'opacity-10 cursor-not-allowed' : 'text-zinc-500 cursor-pointer'}`}
            >
              <ChevronUp size={16} strokeWidth={3} />
            </button>
            <button
              disabled={isLast}
              onClick={(e) => {
                e.stopPropagation();
                onMove?.('down');
              }}
              className={`p-0.5 rounded-md hover:bg-lime-400 hover:text-black transition-colors ${isLast ? 'opacity-10 cursor-not-allowed' : 'text-zinc-500 cursor-pointer'}`}
            >
              <ChevronDown size={16} strokeWidth={3} />
            </button>
          </div>
        )}

        {conv.isPinned && !conv.isArchived && (<Pin size={16} className="fill-current text-yellow-500 rotate-45 shrink-0" />)}

        <div className="relative shrink-0">
          <AvatarComponent />

          {conv.type === 'CHANNEL' && (
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-500 text-white border-2 border-white dark:border-black shadow">
              <Megaphone size={10} />
            </div>
          )}

          {!isFavorites && !conv.isGroup && conv.participant?.isOnline && (<div className="absolute bottom-0 right-0 w-3 h-3 bg-lime-500 rounded-full border border-white dark:border-black" />)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className={`truncate text-sm font-bold flex-1 mr-2 ${isMarkedAsActive ? (isDarkMode ? 'text-white' : 'text-black') : ''}`}>{title}</h3>
            <div className="flex items-center gap-2 shrink-0 relative z-100">
               {isMuted && <VolumeX size={12} className="mb-0.5 text-red-500" />}
               <span className="text-[10px] text-zinc-500 mb-1">{timeDisplay}</span>

               <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className={`p-1 rounded-full transition-colors cursor-pointer ${isMenuOpen ? (isDarkMode ? 'bg-zinc-700' : 'bg-zinc-200') : (isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100')}`}><MoreVertical size={14} className="text-zinc-500" /></button>

                  <AnimatePresence>
                      {isMenuOpen && (<>
                          <div className="fixed inset-0 z-99" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />

                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className={`absolute right-0 top-6 z-100 w-64 p-1.5 rounded-[24px] shadow-2xl border backdrop-blur-2xl ${
                                isDarkMode
                                  ? 'bg-zinc-900/85 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]'
                                  : 'bg-white/85 border-zinc-200 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'
                              }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                              {conv.isGroup && conv.hasLeft ? (
                                <button onClick={(e) => { handleDeleteClick(e, 'ME'); }} className={deleteButtonClass}>
                                    <Trash2 size={18} />Удалить у себя
                                </button>
                              ) : (
                                <>
                                  {!conv.isArchived && (
                                    <button onClick={handlePinClick} className={menuButtonClass}>
                                        <Pin size={18} />{conv.isPinned ? 'Открепить' : 'Закрепить'}
                                    </button>
                                  )}

                                  <button onClick={handleMuteClick} className={menuButtonClass}>
                                      {isMuted ? <Bell size={18} /> : <BellOff size={18} />}
                                      {isMuted ? 'Включить звук' : 'Без звука'}
                                  </button>

                                  <button onClick={handleUnreadToggleClick} className={menuButtonClass}>
                                      {isMarkedAsActive ? <MailOpen size={18} /> : <Mail size={18} />}
                                      {isMarkedAsActive ? 'Отметить прочитанным' : 'Отметить непрочитанным'}
                                  </button>

                                  <button onClick={handleArchiveClick} className={menuButtonClass}>
                                      {conv.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                                      {conv.isArchived ? 'Вернуть из архива' : 'Архивировать'}
                                  </button>

                                  <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />

                                  {conv.isGroup && onLeaveClick && (
                                    <button onClick={() => { if(onLeaveClick) onLeaveClick(conv); setIsMenuOpen(false); }} className={menuButtonClass}>
                                        <LogOut size={18} />Выйти из {entityFromName}
                                    </button>
                                  )}
                                  
                                  {((conv.isGroup && isAdmin) || (!conv.isGroup && !isFavorites)) && (
                                    <button onClick={(e) => { handleDeleteClick(e, 'ALL'); }} className={deleteButtonClass}>
                                        <Trash2 size={18} />
                                        {conv.isGroup ? `Удалить ${entityName} для всех` : 'Удалить у всех'}
                                    </button>
                                  )}

                                  <button onClick={(e) => { handleDeleteClick(e, 'ME'); }} className={deleteButtonClass}>
                                      <Trash2 size={18} />{isFavorites ? 'Очистить историю' : 'Удалить у себя'}
                                  </button>
                                </>)}
                          </motion.div>
                      </>)}
                  </AnimatePresence>
               </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
              <div className={`text-xs flex items-center gap-1.5 min-w-0 flex-1 ${isMarkedAsActive ? (isDarkMode ? 'text-zinc-300 font-medium' : 'text-zinc-700 font-medium') : 'text-zinc-500'}`}>
                {isTyping ? (
                    <TypingIndicator userName={typingUserName} />
                ) : hasLastMessage ? (
                    <>
                        {firstImage && <img src={firstImage} alt="preview" className="w-4 h-4 rounded object-cover shrink-0" />}
                        <span className="truncate">
                            {messageContent ? (
                                renderTextWithAppleEmojis(messageContent)
                            ) : hasImages ? (
                                <span className="italic opacity-80">Фотография</span>
                            ) : (
                                <span className="italic opacity-50">Сообщение удалено</span>
                            )}
                        </span>
                    </>
                ) : (
                    <span className="truncate italic opacity-50">
                        {isFavorites ? 'Сохраните сюда сообщения' : 'Нет сообщений'}
                    </span>
                )}
             </div>
             <div className="shrink-0 flex items-center justify-end min-w-5">
                {hasReaction ? (<div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-100 shadow-sm animate-bounce"><Heart size={10} className="text-red-500 fill-red-500" /></div>)
                : hasRealUnread ? (<span className={`flex h-5 min-w-5 px-1 items-center justify-center rounded-full text-[10px] font-bold ${isMuted ? (isDarkMode ? 'bg-zinc-600 text-zinc-300' : 'bg-zinc-300 text-zinc-700') : 'bg-lime-400 text-black'}`}>{conv.unreadCount}</span>)
                : isManualUnread ? (<div className="flex h-5 w-5 items-center justify-center"><div className={`h-2.5 w-2.5 rounded-full ${isMuted ? (isDarkMode ? 'bg-zinc-600' : 'bg-zinc-400') : 'bg-lime-400'}`} /></div>)
                : null}
             </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}