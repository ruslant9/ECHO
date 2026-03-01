// frontend/components/messages/ChatHeader.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MoreVertical, Settings, LogOut, Users, BarChart2, Trash2, UserMinus, Search, Bookmark, CalendarDays } from 'lucide-react';
import { gql, useQuery } from '@apollo/client';
import Avatar from '@/components/Avatar';
import Tooltip from '@/components/Tooltip';
import { formatTimeAgo } from '@/lib/time-ago';
import { Conversation, Message } from '@/types/messages';
import { motion, AnimatePresence } from 'framer-motion';
import MessageCalendarModal from './MessageCalendarModal';
import MessageSearchModal from './MessageSearchModal'; // <-- НОВЫЙ ИМПОРТ

const GET_CONVERSATION_PARTICIPANTS_FOR_HEADER = gql`
  query GetConversationParticipantsForHeader($conversationId: Int!) {
    conversationParticipants(conversationId: $conversationId) {
      id
      isOnline
    }
  }
`;

interface ChatHeaderProps {
  participant: Conversation['participant'];
  conversation?: Conversation | null;
  typingUsers: Set<number>;
  typingDisplay?: string; 
  isDarkMode: boolean;
  onBack?: () => void;
  onDeleteForAll?: () => void;
  onDeleteForMe?: () => void;
  onBlockUser?: () => void;
  onOpenStats?: () => void;
  onOpenEditor?: () => void;
  onLeaveConversation?: () => void;
  onShowParticipants?: () => void;
  myId?: number;
  onJumpToDate?: (date: string) => void;
  // 👇 новые пропсы для поиска
  messages: Message[];
  onJumpToMessage: (id: number) => void;
}

export default function ChatHeader({ 
  participant, 
  conversation,
  typingUsers,
  typingDisplay,
  isDarkMode, 
  onBack,
  onDeleteForAll,
  onDeleteForMe,
  onBlockUser,
  onOpenStats,
  onOpenEditor,
  onLeaveConversation,
  onShowParticipants,
  myId,
  onJumpToDate,
  messages, // новый проп
  onJumpToMessage, // новый проп
}: ChatHeaderProps) {
  const isGroup = conversation?.isGroup || false;
  const isChannel = conversation?.type === 'CHANNEL';
  const isAdmin = conversation?.myRole === 'ADMIN';
  const hasLeft = !!(conversation as any)?.hasLeft;
  
  const canViewParticipants = isGroup && (!isChannel || isAdmin);
  const isFavorites = !isGroup && participant?.id === myId;

  const displayName = isFavorites 
      ? 'Избранное' 
      : (isGroup ? (conversation?.title || (isChannel ? 'Канал' : 'Беседа')) : (participant?.name || participant?.username || 'Пользователь'));
  
  const displayAvatar = isGroup ? (conversation?.avatar || null) : (participant?.avatar || null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [participantsTooltipVisible, setParticipantsTooltipVisible] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // новое состояние для поиска
  const menuRef = useRef<HTMLDivElement | null>(null);

  const { data: participantsData } = useQuery(GET_CONVERSATION_PARTICIPANTS_FOR_HEADER, {
    variables: { conversationId: conversation?.id },
    skip: !isGroup || !conversation?.id || hasLeft,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore', 
  });

  const participants = hasLeft ? [] : (participantsData?.conversationParticipants || []);
  const participantsCount = isGroup
    ? ((conversation as any)?.participantsCount ?? participants.length)
    : 0;
  const onlineCount = participants.filter((p: any) => p.isOnline).length;

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen]);

   const buttonBase =
    'w-full text-left px-3 py-3 text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer rounded-xl';
    
  const menuButtonClass = `${buttonBase} ${
    isDarkMode ? 'hover:bg-white/10 text-zinc-100' : 'hover:bg-black/5 text-zinc-800'
  }`;
  
  const dangerButtonClass = `${buttonBase} text-red-500 ${
    isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-500/10'
  }`;

  const entityName = isChannel ? 'канал' : 'беседу';
  const entityStatsName = isChannel ? 'канала' : 'беседы';
  const entityFromName = isChannel ? 'канала' : 'беседы';

  const renderAvatar = () => {
      if (isFavorites) {
          return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-orange-500/20 text-orange-500' : 'bg-orange-100 text-orange-600'}`}>
                <Bookmark size={20} className="fill-current" />
            </div>
          );
      }
      return (
        <Avatar 
          username={isGroup ? (conversation?.title || (isChannel ? 'Канал' : 'Беседа')) : (participant?.username || '?')} 
          name={isGroup ? (conversation?.title || (isChannel ? 'Канал' : 'Беседа')) : (participant?.name || undefined)} 
          url={displayAvatar || undefined} 
          size="md" 
        />
      );
  };

  return (
    <div
      className={`relative z-40 h-16 px-4 border-b flex items-center justify-between shrink-0 backdrop-blur-md ${
        isDarkMode ? 'bg-black/80 border-zinc-800' : 'bg-white/80 border-zinc-200'
      }`}
    >
      <div className="flex items-center gap-3">
       {onBack && (
        <button 
            onClick={onBack} 
            className="p-2 -ml-3 mr-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
        >
            <ChevronLeft size={24} />
        </button>
      )}

        {isFavorites ? (
             <div className="flex items-center gap-3">
                {renderAvatar()}
                <div>
                    <h2 className="font-bold text-sm">Избранное</h2>
                    <p className="text-xs text-zinc-500">Личное пространство</p>
                </div>
             </div>
        ) : isGroup ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {renderAvatar()}
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm truncate">{displayName}</h2>
                {isChannel && <span className="text-[10px] bg-blue-500/20 text-blue-500 px-1.5 rounded font-bold">CHANNEL</span>}
            {isAdmin && !hasLeft && (
              <Tooltip content={`Редактор ${entityStatsName}`} position="bottom"> 
                <button
                  onClick={() => onOpenEditor?.()}
                  className={`relative z-10 w-7 h-7 flex items-center justify-center rounded-full transition-colors shrink-0 cursor-pointer ${
                    isDarkMode ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  <Settings size={14} className="pointer-events-none" />
                </button>
              </Tooltip>
            )}

              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                <div
                  className="relative inline-flex items-center gap-1"
                  onMouseEnter={() => setParticipantsTooltipVisible(true)}
                  onMouseLeave={() => setParticipantsTooltipVisible(false)}
                >
                  {onShowParticipants && canViewParticipants ? (
                   <button
                      type="button"
                      onClick={onShowParticipants}
                      className={`flex items-center gap-1 rounded px-1 -mx-1 transition-colors cursor-pointer ${
                        isDarkMode ? 'hover:bg-zinc-800 hover:text-zinc-300' : 'hover:bg-zinc-100 hover:text-zinc-700'
                      }`}
                    >
                      <Users size={12} />
                      {participantsCount} {participantsCount === 1 ? 'участник' : participantsCount < 5 ? 'участника' : 'участников'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 cursor-default">
                      <Users size={12} />
                      {participantsCount} {participantsCount === 1 ? 'участник' : participantsCount < 5 ? 'участника' : 'участников'}
                    </span>
                  )}
                  {participantsTooltipVisible && (
                    <div className={`absolute left-0 top-full mt-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg border z-50 ${
                      isDarkMode ? 'bg-zinc-900 text-white border-zinc-700' : 'bg-white text-zinc-900 border-zinc-200'
                    }`}>
                      {hasLeft ? `Вы вышли из ${entityFromName}. Список недоступен.` : (!canViewParticipants && isChannel ? 'Список участников скрыт' : 'Список участников')}
                    </div>
                  )}
                </div>
                {!isChannel && typingDisplay ? (
                  <span className="text-lime-500 animate-pulse">{typingDisplay}</span>
                ) : !isChannel && onlineCount > 0 ? (
                  <span className="flex items-center gap-1 text-lime-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span>
                    {onlineCount} {onlineCount === 1 ? 'в сети' : 'в сети'}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          participant && (
            <Link href={`/dashboard/user/${participant.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {renderAvatar()}
              <div>
                <h2 className="font-bold text-sm">{displayName}</h2>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  {typingDisplay
                    ? <span className="text-lime-500 animate-pulse">{typingDisplay}</span>
                    : typingUsers.has(participant.id)
                    ? <span className="text-lime-500 animate-pulse">печатает...</span>
                    : participant.isOnline
                      ? <span className="text-lime-500">в сети</span>
                      : (participant.lastOnlineAt ? `был(а) ${formatTimeAgo(participant.lastOnlineAt)}` : 'Был(а) в сети давно')}
                </p>
              </div>
            </Link>
          )
        )}
      </div>
      <div className="relative flex gap-1 text-zinc-500 z-40" ref={menuRef}>
       <button
          onClick={() => setIsMenuOpen((v) => !v)}
          className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-200'}`}
        >
          <MoreVertical size={20} />
        </button>

       <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`absolute right-0 top-12 z-50 w-64 p-1.5 rounded-[24px] shadow-2xl border backdrop-blur-2xl ${
                isDarkMode 
                  ? 'bg-zinc-900/85 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' 
                  : 'bg-white/85 border-zinc-200 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'
              }`}
            >
              {isFavorites ? (
                 <>
                   <button
                        className={menuButtonClass}
                        onClick={() => {
                            setIsMenuOpen(false);
                            setIsCalendarOpen(true);
                        }}
                      >
                        <CalendarDays size={18} />
                        Календарь сообщений
                    </button>
                    {/* Поиск для Избранного */}
                    <button
                      className={menuButtonClass}
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsSearchOpen(true);
                      }}
                    >
                      <Search size={18} />
                      Поиск в чате
                    </button>
                    <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                    <button
                      className={dangerButtonClass}
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeleteForMe?.();
                      }}
                    >
                      <Trash2 size={18} />
                      Очистить историю
                    </button>
                 </>
              ) : isGroup ? (
                <>
                  {!hasLeft && (
                    <button
                      className={menuButtonClass}
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenStats?.();
                      }}
                    >
                      <BarChart2 size={18} />
                      Статистика {entityStatsName}
                    </button>
                  )}
                  {!hasLeft && (
                     <button
                        className={menuButtonClass}
                        onClick={() => {
                           setIsMenuOpen(false);
                           setIsCalendarOpen(true);
                        }}
                     >
                        <CalendarDays size={18} />
                        Календарь сообщений
                     </button>
                  )}
                  {/* Поиск для групп */}
                  {!hasLeft && (
                     <button
                        className={menuButtonClass}
                        onClick={() => {
                           setIsMenuOpen(false);
                           setIsSearchOpen(true);
                        }}
                     >
                        <Search size={18} />
                        Поиск в чате
                     </button>
                  )}
                  {!hasLeft && <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />}
                  {hasLeft ? (
                    <button
                      className={dangerButtonClass}
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeleteForMe?.();
                      }}
                    >
                      <Trash2 size={18} />
                      Удалить только у себя
                    </button>
                  ) : (
                    <>
                      {isAdmin && (
                        <button
                          className={dangerButtonClass}
                          onClick={() => {
                            setIsMenuOpen(false);
                            onDeleteForAll?.();
                          }}
                        >
                          <Trash2 size={18} />
                          Удалить {entityName} для всех
                        </button>
                      )}
                      <button
                        className={dangerButtonClass}
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLeaveConversation?.();
                        }}
                      >
                        <LogOut size={18} />
                        Выйти из {entityFromName}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    className={menuButtonClass}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenStats?.();
                    }}
                  >
                    <BarChart2 size={18} />
                    Статистика диалога
                  </button>
                  <button
                    className={menuButtonClass}
                    onClick={() => {
                        setIsMenuOpen(false);
                        setIsCalendarOpen(true);
                    }}
                  >
                    <CalendarDays size={18} />
                    Календарь сообщений
                  </button>
                  {/* Поиск для личных сообщений */}
                  <button
                    className={menuButtonClass}
                    onClick={() => {
                        setIsMenuOpen(false);
                        setIsSearchOpen(true);
                    }}
                  >
                    <Search size={18} />
                    Поиск в чате
                  </button>
                  <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                  <button
                    className={dangerButtonClass}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onBlockUser?.();
                    }}
                  >
                    <UserMinus size={18} />
                    Заблокировать пользователя
                  </button>
                  
                  <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                  
                  <button
                    className={dangerButtonClass}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteForAll?.();
                    }}
                  >
                    <Trash2 size={18} />
                    Удалить у всех
                  </button>
                  <button
                    className={dangerButtonClass}
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteForMe?.();
                    }}
                  >
                    <Trash2 size={18} />
                    Удалить только у меня
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {conversation && (
        <MessageCalendarModal 
            isOpen={isCalendarOpen} 
            onClose={() => setIsCalendarOpen(false)} 
            conversationId={conversation.id}
            onDateSelect={(date) => {
                if (onJumpToDate) onJumpToDate(date);
            }}
        />
      )}

      {/* Модалка поиска */}
      {conversation && (
        <MessageSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          messages={messages}
          conversationId={conversation.id}
          onJumpToMessage={onJumpToMessage}
          isDarkMode={isDarkMode}
          myId={myId || 0}
        />
      )}
    </div>
  );
}