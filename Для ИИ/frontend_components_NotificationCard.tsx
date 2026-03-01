'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, Check, Trash2, Bell, Heart, MessageSquare, Repeat, X } from 'lucide-react';
import Avatar from './Avatar';
import { useTheme } from '@/context/ThemeContext';
import { useNotification } from '@/context/NotificationContext';
import Link from 'next/link';
import Tooltip from './Tooltip';

interface NotificationCardProps {
  notification: {
    id: number;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    postId?: number;
    commentId?: number;
    imageUrl?: string;
    vibeId?: number;
    vibeCommentId?: number;
    initiator?: {
      id: number;
      username: string;
      name?: string;
      avatar?: string;
    };
  };
  onDelete: (id: number) => void;
}

const getCleanedMessage = (message: string, hasImage: boolean) => {
  if (hasImage) {
    let cleaned = message.replace(/: "\[\d+ изображени[ейяь]*\]"$/, '');
    cleaned = cleaned.replace(/: "\[Без контента\]"$/, '');
    return cleaned.trim();
  }
  return message;
};

const toHex = (str: string) => {
  return Array.from(str)
    .map(c => c.codePointAt(0)?.toString(16))
    .join('-')
    .toLowerCase();
};

const APPLE_EMOJI_BASE_URL = '/emojis/';

export default function NotificationCard({ notification, onDelete }: NotificationCardProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [isNew, setIsNew] = useState(!notification.isRead);
  const { markNotificationAsRead } = useNotification();

  useEffect(() => {
    if (!notification.isRead) {
      const timer = setTimeout(() => {
        setIsNew(false);
        markNotificationAsRead(notification.id);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
        setIsNew(false);
    }
  }, [notification.isRead, notification.id, markNotificationAsRead]);
  
  const handleClick = () => {
    const { type, initiator, postId, commentId, vibeId, vibeCommentId } = notification;
    
    markNotificationAsRead(notification.id);

    if (vibeId) {
      const queryParams = vibeCommentId ? `&commentId=${vibeCommentId}` : '';
      router.push(`/dashboard/vibes?vibeId=${vibeId}${queryParams}`);
      return;
    }
    
    if (postId) {
      const queryParams = commentId ? `?commentId=${commentId}` : '';
      router.push(`/dashboard/post/${postId}${queryParams}`);
      return;
    }
    
    if (type === 'FRIEND_ACCEPT' && initiator?.id) {
        router.push(`/dashboard/user/${initiator.id}`);
        return;
    }

    if (type === 'FRIEND_REQUEST') {
        router.push(`/dashboard/friends?tab=requests&highlight=${initiator?.id}`);
        return;
    }
    
    router.push('/dashboard/notifications');
  };
  
  const getIcon = () => {
    switch (notification.type) {
      case 'FRIEND_REQUEST': return <UserPlus size={16} className="text-blue-500" />;
      case 'FRIEND_ACCEPT': return <Check size={16} className="text-green-500" />;
      case 'POST_LIKE':
      case 'COMMENT_LIKE': 
      case 'VIBE_LIKE': return <Heart size={16} className="text-red-500 fill-current" />;
      case 'NEW_COMMENT': 
      case 'NEW_VIBE_COMMENT': return <MessageSquare size={16} className="text-blue-400" />;
      case 'REPOST': 
      case 'VIBE_REPOST': return <Repeat size={16} className="text-green-400" />;
      default: return <Bell size={16} className="text-zinc-500" />;
    }
  };

  const hasImagePreview = !!notification.imageUrl && ['POST_LIKE', 'REPOST', 'NEW_COMMENT'].includes(notification.type);

  const renderTextWithAppleEmojis = (text: string) => {
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
                const imgElement = e.target as HTMLImageElement;
                imgElement.style.display = 'none';
                const span = document.createElement('span');
                span.textContent = part;
                if (imgElement.parentNode) {
                    imgElement.parentNode.insertBefore(span, imgElement);
                }
              }}
            />
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      onClick={handleClick}
      className={`relative p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group cursor-pointer pr-12 overflow-hidden
        ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white hover:bg-zinc-50'}
        ${isNew 
           ? (isDarkMode ? 'border-lime-400/50 bg-lime-900/10' : 'border-lime-400 bg-lime-50') 
           : (isDarkMode ? 'border-zinc-800' : 'border-zinc-200')
        }
      `}
    >
      {isNew && (
        <span className="absolute top-4 right-4 flex h-3 w-3 pointer-events-none z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-500"></span>
        </span>
      )}

      <div className="shrink-0 relative">
          <Avatar 
            username={notification.initiator?.username} 
            name={notification.initiator?.name} 
            url={notification.initiator?.avatar} 
            size="md" 
          />
          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-100'} shadow-sm flex items-center justify-center`}>
             {getIcon()}
          </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
           <Link 
              href={`/dashboard/user/${notification.initiator?.id}`} 
              onClick={(e) => e.stopPropagation()}
              className="font-bold hover:underline"
            >
              {notification.initiator?.name || notification.initiator?.username}
            </Link>
           {' '}
           {renderTextWithAppleEmojis(getCleanedMessage(notification.message, hasImagePreview))}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
           {new Date(notification.createdAt).toLocaleString('ru-RU')}
        </p>
      </div>

      {hasImagePreview && (
        <div className="shrink-0 ml-2">
            <img 
                src={notification.imageUrl!} 
                alt="Post preview" 
                className={`w-12 h-12 object-cover rounded-lg border ${isDarkMode ? 'border-zinc-700' : 'border-zinc-200'}`}
            />
        </div>
      )}

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <Tooltip content="Удалить" position="left">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
            className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all cursor-pointer
                ${isDarkMode ? 'hover:bg-red-900/30 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
          >
            <Trash2 size={18} />
          </button>
        </Tooltip>
      </div>
    </motion.div>
  );
}