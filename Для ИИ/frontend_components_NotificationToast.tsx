'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, UserPlus, Check, Heart, MessageSquare, Repeat, Bell } from 'lucide-react';
import Avatar from './Avatar';
import { useTheme } from '@/context/ThemeContext';
import { useNotification } from '@/context/NotificationContext';

interface NotificationToastProps {
  notification: any; // В notification контексте тип usually 'any', но мы ожидаем новые поля
  onClose: () => void;
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

export default function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { markNotificationAsRead } = useNotification();

  useEffect(() => {
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'FRIEND_REQUEST': return <UserPlus size={16} className="text-blue-400" />;
      case 'FRIEND_ACCEPT': return <Check size={16} className="text-green-400" />;
      case 'POST_LIKE': 
      case 'COMMENT_LIKE': 
      case 'VIBE_LIKE': return <Heart size={16} className="text-red-400 fill-current" />; // <---
      case 'NEW_COMMENT': 
      case 'NEW_VIBE_COMMENT': return <MessageSquare size={16} className="text-blue-400" />; // <---
      case 'REPOST': 
      case 'VIBE_REPOST': return <Repeat size={16} className="text-green-400" />; // <---
      default: return <Bell size={16} className="text-zinc-500" />;
    }
  };

  const handleClick = () => {
    const { type, initiator, postId, commentId, vibeId, vibeCommentId } = notification;
    
    markNotificationAsRead(notification.id);
    
    onClose();

    // Логика перехода для Вайбов
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

  const hasImagePreview = notification.imageUrl && ['POST_LIKE', 'REPOST', 'NEW_COMMENT'].includes(notification.type);

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
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      onClick={handleClick}
      className={`fixed bottom-5 right-5 z-50 w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-lg border
        ${isDarkMode 
           ? 'bg-zinc-900/80 border-zinc-800' 
           : 'bg-white/80 border-zinc-200'
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar 
            username={notification.initiator?.username || notification.initiator?.email.split('@')[0]}
            name={notification.initiator?.name} 
            url={notification.initiator?.avatar} 
            size="md" 
          />
          <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${isDarkMode ? 'bg-zinc-800' : 'bg-white'}`}>
            {getIcon()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
          <span className="font-bold truncate block">
            {notification.initiator?.name || notification.initiator?.username || notification.initiator?.email}
          </span> 
          {' '}
          {renderTextWithAppleEmojis(getCleanedMessage(notification.message, hasImagePreview))}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Нажмите, чтобы посмотреть</p>
      </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`self-start rounded-full p-1 text-zinc-500 ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}