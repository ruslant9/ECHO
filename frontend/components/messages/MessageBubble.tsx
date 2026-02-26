'use client';

import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Reply, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Copy, 
  Check, 
  CheckCheck, 
  UserMinus, 
  SmilePlus, 
  ShieldAlert, 
  RotateCcw, 
  Pin, 
  PinOff, 
  CornerUpRight, 
  Pencil, 
  X, 
  Eye, 
  Clock 
} from 'lucide-react'; 
import { Message } from '@/types/messages';
import { toHex, APPLE_EMOJI_BASE_URL } from '@/lib/emoji-data'; 
import { useTheme } from '@/context/ThemeContext'; 
import { useEmojiPicker } from '@/context/EmojiContext';
import { gql, useMutation } from '@apollo/client';
import Avatar from '../Avatar';
import EmojiExplosion from '../EmojiExplosion';
import Tooltip from '../Tooltip'; 
import Link from 'next/link';
import { formatViewsCount } from '@/lib/format-number';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

const TOGGLE_REACTION = gql`
  mutation ToggleReaction($messageId: Int!, $emoji: String!) {
    toggleMessageReaction(messageId: $messageId, emoji: $emoji) {
      id
      reactions {
        id
        emoji
        userId
        user { id username name avatar }
      }
    }
  }
`;

const getImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3400';
  return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

type ReadByEntry = { user: { id: number; name?: string; username: string }; readAt: string };

function formatReadAt(readAt: string): string {
  const d = new Date(readAt);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now.getTime() - 864e5).toDateString();
  if (d.toDateString() === yesterday) {
    return `вчера ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ReadByPanel({
  message,
  isDarkMode,
  onClose,
  anchorRect,
}: {
  message: Message;
  isDarkMode: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const readers = (message.readBy || []) as ReadByEntry[];
  const sorted = [...readers].sort((a, b) => new Date(a.readAt).getTime() - new Date(b.readAt).getTime());

  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        left: anchorRect.left + anchorRect.width / 2,
        bottom: typeof window !== 'undefined' ? window.innerHeight - anchorRect.top + 10 : undefined,
        transform: 'translateX(-50%)',
        zIndex: 101,
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 101,
      };

  return createPortal(
    <>
      <div className="fixed inset-0 z-100" aria-hidden onClick={onClose} />
      <div
        className={`w-full max-w-xs rounded-xl border shadow-xl ${
          isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'
        }`}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between border-b px-3 py-2 ${isDarkMode ? 'border-zinc-700' : 'border-zinc-100'}`}>
          <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>Кто прочитал</span>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-1 transition-all duration-300 hover:rotate-90 hover:bg-red-500 hover:text-white cursor-pointer ${
              isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <X size={16} /> 
          </button>
        </div>
        <ul className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
          {sorted.map((r) => (
            <li
              key={`${r.user.id}-${r.readAt}`}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
            >
              <Link
                href={`/dashboard/user/${r.user.id}`}
                className={`truncate font-medium hover:underline cursor-pointer ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}
              >
                {r.user?.name || r.user?.username || 'Пользователь'}
              </Link>
              
              <span className={`shrink-0 text-xs ${isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>{formatReadAt(r.readAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>,
    document.body
  );
}

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  myId: number;
  isDarkMode: boolean;
  grouping: { isNextSame: boolean; isPrevSame: boolean; };
  onReply: () => void;
  onEdit: () => void;
  onDelete: (type: 'ME' | 'ALL') => void;
  onCopy: () => void;
  isLastMessage: boolean;
  isLastReadMessage?: boolean;
  onReplyClick: (id: number) => void;
  isHighlighted: boolean;
  playReactionAnimation: boolean;
  isMessagingDisabled: boolean;
  onRetry: (message: Message) => void;
  onDeleteLocal: (messageId: number) => void;
  onPin: () => void;
  onForward: () => void;
  onReactionToggled?: (messageId: number) => void;
  onImageClick: (index: number) => void;
  isChannel?: boolean;
  channelTitle?: string; // <--- НОВЫЙ ПРОП
}

export default function MessageBubble({ 
    message, 
    isMe, 
    myId,
    isDarkMode, 
    grouping, 
    onReply, 
    onEdit,
    onDelete,
    onCopy,
    isLastMessage,
    isLastReadMessage = false,
    onReplyClick,
    isHighlighted,
    playReactionAnimation,
    isMessagingDisabled,
    onRetry,
    onDeleteLocal,
    onPin,
    onForward,
    onImageClick,
    onReactionToggled,
    isChannel = false,
    channelTitle = "Канал" // <--- ТИТУЛ ПО УМОЛЧАНИЮ
}: MessageBubbleProps) {
  const { isNextSame } = grouping;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('top');
  const { togglePicker, closePicker } = useEmojiPicker();
  const reactionButtonRef = useRef<HTMLButtonElement>(null);
  const errorMenuRef = useRef<HTMLDivElement>(null);
  const [isErrorMenuOpen, setIsErrorMenuOpen] = useState(false);
  const threeDotsButtonRef = useRef<HTMLButtonElement>(null);

  const [menuCoords, setMenuCoords] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [localReactionEmoji, setLocalReactionEmoji] = useState<string | null>(null);
  const [showReadByPanel, setShowReadByPanel] = useState(false);
  const [readByPanelAnchor, setReadByPanelAnchor] = useState<DOMRect | null>(null);
  const readTriggerRef = useRef<HTMLDivElement>(null);

  const isSending = message.status === 'sending';
  const isFailed = message.status === 'failed';
  const isEdited = !!(message as any).editedAt;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [toggleReaction] = useMutation(TOGGLE_REACTION, {
    update(cache, { data }) {
      const newMessage = data?.toggleMessageReaction;
      if (newMessage) {
        cache.modify({
          id: cache.identify({ __typename: 'Message', id: message.id }),
          fields: { reactions() { return newMessage.reactions; } },
        });
      }
    },
    onError: (error) => {
      if (error.message.includes('Forbidden') || error.message.includes('не можете')) {
         return; 
      }
      console.error("Ошибка при изменении реакции:", error);
    }
  });

  useLayoutEffect(() => {
    if (isMenuOpen && threeDotsButtonRef.current) {
      const rect = threeDotsButtonRef.current.getBoundingClientRect();
      const dropdownHeight = 320;
      const OFFSET = 8;
      const MENU_WIDTH = 220;

      const openUpward = rect.bottom + dropdownHeight > window.innerHeight;
      setMenuPlacement(openUpward ? 'top' : 'bottom');
      
      const calculatedTop = openUpward 
         ? rect.top + window.scrollY - OFFSET 
         : rect.bottom + window.scrollY + OFFSET;

      const left = isMe
        ? rect.right + window.scrollX - MENU_WIDTH
        : rect.left + window.scrollX;

      setMenuCoords({ top: calculatedTop, left });
    }
  }, [isMenuOpen, isMe]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen && threeDotsButtonRef.current && !threeDotsButtonRef.current.contains(event.target as Node)) {
          const menuPortal = document.getElementById('message-menu-portal');
          if (menuPortal && !menuPortal.contains(event.target as Node)) {
              setIsMenuOpen(false);
          }
      }
      if (isErrorMenuOpen && errorMenuRef.current && !errorMenuRef.current.contains(event.target as Node)) {
        setIsErrorMenuOpen(false);
      }
    };
    if (isMenuOpen || isErrorMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isErrorMenuOpen]);
  
  const handleReactionClick = (emoji: string) => {
    const myCurrentReaction = message.reactions?.find(r => r.userId === myId) || null;

    toggleReaction({ variables: { messageId: message.id, emoji } });
    closePicker();

    const isRemovingSame =
      myCurrentReaction && myCurrentReaction.emoji === emoji;

    if (!isRemovingSame) {
      onReactionToggled?.(message.id);
      setLocalReactionEmoji(emoji);
      setTimeout(() => setLocalReactionEmoji(null), 650);
    }
  };

  if (message.type === 'SYSTEM') {
    if (isChannel) {
      return null;
    }
    
    return (
        <div className="w-full flex justify-center my-3">
            <div className={`text-xs px-3 py-1 rounded-full flex items-center gap-2 select-none shadow-lg
                ${isDarkMode ? 'bg-green-600 text-green-100 shadow-green-900/40' : 'bg-green-500 text-white shadow-green-500/35'}`}>
                <Pin size={12} />
                <span>{message.content}</span>
                <button onClick={() => onDelete('ME')} className="hover:text-red-200 opacity-90 hover:opacity-100 ml-1 transition-colors cursor-pointer" title="Удалить уведомление"><Trash2 size={12}/></button>
            </div>
        </div>
    );
  }

  const uniqueEmojis = [...new Set(message.reactions?.map(r => r.emoji) || [])];
  const hasReactions = uniqueEmojis.length > 0;

  const roundedClass = isMe 
      ? `rounded-l-3xl rounded-tr-3xl ${!isNextSame ? 'rounded-br-md' : 'rounded-br-3xl'}`
      : `rounded-r-3xl rounded-tl-3xl ${!isNextSame ? 'rounded-bl-md' : 'rounded-bl-3xl'}`;

  // --- ЛОГИКА ЦВЕТОВ ---
  const glassBaseBg = isMe
    ? (isDarkMode ? 'rgba(37, 99, 235, 0.5)' : 'rgba(187, 247, 208, 0.75)') 
    : (isDarkMode ? 'rgba(39, 39, 42, 0.6)' : 'rgba(255, 255, 255, 0.85)');

  const textColorClass = isMe
    ? (isDarkMode ? 'text-white' : 'text-black')
    : (isDarkMode ? 'text-zinc-100' : 'text-zinc-900');

  const liquidGlassStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: glassBaseBg,
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
    boxShadow: isDarkMode 
        ? '0 12px 40px -8px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.1)' 
        : '0 12px 40px -8px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.4)',
    overflow: 'hidden'
  };

  const highlightClass = isHighlighted 
      ? 'ring-4 ring-rose-400/50' 
      : ''; 

  const renderTextWithEmojis = (text: string) => {
    if (!text) return null;
    const emojiRegex = /(\p{Emoji_Presentation})/gu; 
    const parts = text.split(emojiRegex);

    return parts.map((part, index) => {
      if (!part) return null; 
      if (part.match(emojiRegex)) {
        const hex = toHex(part);
        if (hex && !/^[a-z0-9_]+$/i.test(part)) { 
          return <img key={index} src={`${APPLE_EMOJI_BASE_URL}${hex}.png`} alt={part} className="inline-block w-6 h-6 mx-0.5 align-text-bottom select-none pointer-events-none" />;
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const menuButtonClass = `w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
    isDarkMode ? 'hover:bg-white/10 text-zinc-100' : 'hover:bg-black/5 text-zinc-800'
  }`;
  
  const dangerButtonClass = `w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 transition-colors text-red-500 cursor-pointer ${
    isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-500/10'
  }`;

  const MenuPortal = (
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          id="message-menu-portal"
          initial={{ opacity: 0, scale: 0.95, y: menuPlacement === 'top' ? 10 : -10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: menuPlacement === 'top' ? 10 : -10 }} 
          transition={{ duration: 0.15, ease: "easeOut" }} 
          style={{
            position: 'absolute',
            top: menuPlacement === 'bottom' ? menuCoords.top : undefined,
            bottom: menuPlacement === 'top' ? (window.innerHeight - menuCoords.top) : undefined,
            left: menuCoords.left,
          }}
          className={`z-50 w-64 p-2 rounded-[28px] shadow-2xl border backdrop-blur-2xl 
              ${menuPlacement === 'top' ? 'origin-bottom' : 'origin-top'}
              ${isDarkMode 
                ? 'bg-zinc-900/85 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' 
                : 'bg-white/85 border-zinc-200 shadow-[0_20px_40px_rgba(0,0,0,0.1)]'
              }
          `} 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-0.5">
            <button onClick={() => { setIsMenuOpen(false); onReply(); }} className={menuButtonClass} disabled={isMessagingDisabled}>
                <Reply size={18} /> Ответить
            </button>
            <button onClick={() => { setIsMenuOpen(false); onCopy(); }} className={menuButtonClass}>
                <Copy size={18} /> Копировать
            </button>
            <button onClick={() => { setIsMenuOpen(false); onForward(); }} className={menuButtonClass}>
                <CornerUpRight size={18} /> Переслать
            </button>
            
            <button 
                onClick={() => { setIsMenuOpen(false); onPin(); }} 
                className={`${menuButtonClass} ${!message.isPinned ? 'text-blue-500 dark:text-blue-400' : ''}`}
                disabled={isMessagingDisabled}
            >
                {message.isPinned ? <PinOff size={18} /> : <Pin size={18} />} 
                {message.isPinned ? 'Открепить' : 'Закрепить'}
            </button>
            
            {isMe && ( <>
                <button onClick={() => { setIsMenuOpen(false); onEdit(); }} className={menuButtonClass} disabled={isMessagingDisabled}>
                    <Edit2 size={18} /> Редактировать
                </button>
                <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                <button onClick={() => { setIsMenuOpen(false); onDelete('ME'); }} className={menuButtonClass}>
                    <UserMinus size={18} /> Удалить у себя
                </button>
                <button onClick={() => { setIsMenuOpen(false); onDelete('ALL'); }} className={dangerButtonClass}>
                    <Trash2 size={18} /> Удалить у всех
                </button>
            </> )}
            {!isMe && ( <>
                <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-black/5'}`} />
                <button onClick={() => { setIsMenuOpen(false); onDelete('ME'); }} className={menuButtonClass}>
                    <UserMinus size={18} /> Удалить у себя
                </button>
            </> )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const ActionButtons = (
    <div className={`relative flex items-center gap-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity z-10 px-1 shrink-0 ${isMenuOpen ? 'opacity-100' : ''}`}>
        {!isMenuOpen && (
            <>
             <Tooltip content="Реакция">
                 <button 
                    ref={reactionButtonRef}
                    onClick={(e) => { e.stopPropagation(); togglePicker(reactionButtonRef, handleReactionClick); }} 
                    className={`p-2 rounded-full transition-colors cursor-pointer ${isMessagingDisabled ? 'opacity-50 cursor-not-allowed' : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-black')}`} 
                    disabled={isMessagingDisabled}
                >
                    <SmilePlus size={16} />
                </button>
             </Tooltip>
             <Tooltip content="Ответить">
                 <button 
                    onClick={onReply} 
                    className={`p-2 rounded-full transition-colors cursor-pointer ${isMessagingDisabled ? 'opacity-50 cursor-not-allowed' : (isDarkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-black')}`} 
                    disabled={isMessagingDisabled}
                 >
                    <Reply size={16} />
                 </button>
             </Tooltip>
            </>
        )}
        <div className="relative">
            <button 
                ref={threeDotsButtonRef} 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} 
                className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? (isMenuOpen ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white') : (isMenuOpen ? 'bg-zinc-200 text-black' : 'bg-zinc-100 text-zinc-500 hover:text-black')}`}
            >
                <MoreVertical size={16} />
            </button>
            {isMounted && createPortal(MenuPortal, document.body)}
        </div>
    </div>
  );

const BubbleContent = (
    <div className="relative">
        {/* Иконка закрепа вынесена из блока с overflow: hidden */}
        {message.isPinned && (
            <div className="absolute -top-2 -right-2 bg-lime-400 text-black p-1.5 rounded-full shadow-md z-30">
                <Pin size={12} className="fill-current" />
            </div>
        )}

        <div 
            style={liquidGlassStyle}
            className={`relative ${roundedClass} ${highlightClass} min-w-16 max-w-full flex flex-col`}
        >
            {/* Текстура шума */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay"
                style={{ backgroundImage: `url(${LIQUID_GLASS_NOISE_B64})`, backgroundSize: '100px 100px' }}
            />

            {/* ШАПКА КАНАЛА */}
            {isChannel && (
                <div className={`px-5 pt-4 -mb-1 relative z-10 text-[13px] font-black uppercase tracking-widest opacity-60 ${textColorClass}`}>
                    {channelTitle}
                </div>
            )}

            {message.forwardedFrom && (
                <div className="mb-1 ml-5 mt-4 mr-5 relative z-10">
                    <Link 
                        href={`/dashboard/user/${message.forwardedFrom.id}`} 
                        onClick={(e) => e.stopPropagation()} 
                        className={`text-[14px] font-bold flex items-center gap-2 hover:underline cursor-pointer
                            ${isMe ? (isDarkMode ? 'text-white/90' : 'text-black/80') : 'text-lime-600 dark:text-lime-400'}
                        `}
                    >
                        <CornerUpRight size={14} />
                        <span>Переслано от {message.forwardedFrom.name || message.forwardedFrom.username}</span>
                    </Link>
                </div>
            )}

            {message.replyTo && (
                <div 
                    onClick={(e) => { e.stopPropagation(); onReplyClick(message.replyTo!.id); }} 
                    className={`w-full py-3 pl-4 pr-5 border-l-4 ${isMe ? 'border-white/40' : 'border-lime-400'} relative z-10 overflow-hidden cursor-pointer select-none flex flex-col justify-center transition-opacity active:opacity-70 rounded-t-xl ${isMe ? 'bg-black/20' : (isDarkMode ? 'bg-black/30' : 'bg-zinc-100/50')}`}
                >
                    <div className="pl-1 flex flex-col">
                        <span className={`text-[14px] font-bold truncate mb-1 ${isMe ? (isDarkMode ? 'text-white/90' : 'text-black/90') : 'text-lime-600 dark:text-lime-400'}`}>{message.replyTo.sender.username}</span>
                        <p className={`text-[14px] truncate wrap-break-words opacity-80 ${isMe ? (isDarkMode ? 'text-white/80' : 'text-black/80') : (isDarkMode ? 'text-zinc-200' : 'text-zinc-600')}`}>{renderTextWithEmojis(message.replyTo.content)}</p>
                    </div>
                </div>
            )}
            
            <div className={`px-6 pb-4 relative z-10 ${message.replyTo || isChannel ? 'pt-3' : 'pt-5'}`}>
               {message.images && message.images.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-3">
                  {message.images.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={getImageUrl(imgUrl)}
                      alt="attachment"
                      className="max-h-96 rounded-[24px] object-cover border border-white/10 cursor-pointer hover:opacity-90 transition-opacity shadow-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageClick(idx);
                      }}
                    />
                  ))}
                </div>
              )}

                {message.content.trim().length > 0 && (
                  <p className={`whitespace-pre-wrap break-all text-[16px] leading-[1.5] relative z-10 ${textColorClass}`}>
                    {renderTextWithEmojis(message.content)}
                  </p>
                )}

                <div
                  className={`mt-3 flex items-center ${
                    hasReactions ? 'justify-between' : 'justify-end'
                  } gap-4 select-none`}
                >
                  {hasReactions && (
                    <div className="flex flex-wrap items-center gap-2">
                      {uniqueEmojis.map((emoji) => {
                        const reactionsForEmoji = message.reactions.filter(r => r.emoji === emoji);
                        const count = reactionsForEmoji.length;
                        const lastReactingUser = reactionsForEmoji[reactionsForEmoji.length - 1]?.user;
                        const isMyReaction = reactionsForEmoji.some(r => r.userId === myId);
                        const hex = toHex(emoji);

                        return (
                          <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); handleReactionClick(emoji); }}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full shadow-lg border transition-all hover:scale-110 cursor-pointer
                              ${isMyReaction
                                ? (isDarkMode ? 'bg-lime-400 border-lime-500 text-black' : 'bg-lime-500 border-lime-600 text-white')
                                : (isDarkMode ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-white border-zinc-200 text-zinc-900')
                              }`}
                            disabled={isMessagingDisabled}
                          >
                            {lastReactingUser && (
                              <Avatar
                                url={lastReactingUser.avatar}
                                username={lastReactingUser.username}
                                name={lastReactingUser.name}
                                size="sm"
                                className="w-5 h-5 text-[10px]"
                              />
                            )}

                            {hex ? (
                              <img
                                src={`${APPLE_EMOJI_BASE_URL}${hex}.png`}
                                alt={emoji}
                                className="w-5 h-5 object-contain pointer-events-none select-none"
                              />
                            ) : (
                              <span className="text-sm">{emoji}</span>
                            )}

                            {count > 1 && (
                              <span className={`font-black text-[12px] ${isMyReaction ? (isDarkMode ? 'text-black' : 'text-white') : 'text-zinc-400'}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className={`flex items-center gap-2 ${textColorClass} opacity-90`}>
                    {isEdited && (
                      <span className="text-[12px] italic flex items-center mr-1" title="Изменено">
                        <Pencil size={12} className="mr-1" /> изм.
                      </span>
                    )}
                    
                    {isFailed ? (
                      <div className="relative" ref={errorMenuRef}>
                        <Tooltip content="Сообщение не доставлено" position="left">
                          <button
                            onClick={(e) => { e.stopPropagation(); setIsErrorMenuOpen(!isErrorMenuOpen); }}
                            className="bg-white rounded-full p-0.5 text-red-500 hover:scale-110 transition-transform shadow-sm cursor-pointer"
                          >
                            <ShieldAlert size={18} className="fill-current" />
                          </button>
                        </Tooltip>
                        <AnimatePresence>
                          {isErrorMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.1 }}
                              className={`absolute z-50 w-32 rounded-xl shadow-2xl border overflow-hidden
                                ${isMe ? 'right-0' : 'left-0'} bottom-full mb-2 origin-bottom
                                ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}
                              `}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { setIsErrorMenuOpen(false); onRetry(message); }}
                                className={`${menuButtonClass} cursor-pointer`}
                              >
                                <RotateCcw size={14} /> Повторить
                              </button>
                              <button
                                onClick={() => { setIsErrorMenuOpen(false); onDeleteLocal(message.id); }}
                                className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors text-red-500 cursor-pointer ${isDarkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                              >
                                <Trash2 size={14} /> Удалить
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isChannel && (
                            <div className={`flex items-center gap-1.5 font-black text-[14px] px-2.5 py-1 rounded-full ${isMe ? 'bg-black/15' : 'bg-black/5'}`}>
                                <Eye size={17} strokeWidth={3} />
                                <span>{formatViewsCount(message.viewsCount ?? 0)}</span>
                            </div>
                        )}

                        <span className="text-[14px] font-black tracking-tight">
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        {!isChannel && isMe && !isSending && (
                          <div className="scale-125">
                            {message.isRead ? <CheckCheck size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3} />}
                          </div>
                        )}

                        {isSending && <Clock size={15} className="animate-pulse" />}
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {playReactionAnimation && message.reactions.length > 0 && (
              <EmojiExplosion emoji={message.reactions[message.reactions.length - 1].emoji} />
            )}

            {localReactionEmoji && (
              <div className="absolute inset-0 pointer-events-none">
                <EmojiExplosion emoji={localReactionEmoji} />
              </div>
            )}
        </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} ${hasReactions ? 'mb-10' : 'mb-4'}`}>
        <div className={`flex flex-col max-w-[75%] sm:max-w-[70%] xl:max-w-[60%] ${isMe ? 'items-end' : 'items-start'}`}>
            <div className={`group/bubble relative flex items-center gap-4 max-w-full ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
    {isMe ? (<>{ActionButtons}{BubbleContent}</>) : (<>{ActionButtons}{BubbleContent}</>)}
</div>
            
            {!isChannel && isLastReadMessage && isMe && (message.readBy?.length ?? 0) > 0 && (
              <>
                <div
                  ref={readTriggerRef}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (message.readBy?.length && readTriggerRef.current) {
                      setReadByPanelAnchor(readTriggerRef.current.getBoundingClientRect());
                      setShowReadByPanel(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && message.readBy?.length && readTriggerRef.current) {
                      setReadByPanelAnchor(readTriggerRef.current.getBoundingClientRect());
                      setShowReadByPanel(true);
                    }
                  }}
                  className={`text-right text-[12px] font-black mt-2 mr-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 transition-colors ${message.readBy?.length ? 'cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-400' : 'cursor-default text-zinc-500'}`}
                >
                  Просмотрено
                </div>
                {showReadByPanel && message.readBy?.length && (
                  <ReadByPanel
                    message={message}
                    isDarkMode={isDarkMode}
                    onClose={() => { setShowReadByPanel(false); setReadByPanelAnchor(null); }}
                    anchorRect={readByPanelAnchor}
                  />
                )}
              </>
            )}
        </div>
    </motion.div>
  );
}