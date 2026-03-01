'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // 1. Импортируем useRouter
import { motion } from 'framer-motion';
import { X, Send, Loader } from 'lucide-react';
import { gql, useMutation } from '@apollo/client';
import Avatar from './Avatar';
import { useTheme } from '@/context/ThemeContext';
import Toast from './Toast';

const SEND_QUICK_REPLY = gql`
  mutation SendQuickReply($targetUserId: Int!, $content: String!) {
    sendMessage(targetUserId: $targetUserId, content: $content) {
      id
    }
  }
`;

interface NewMessageToastProps {
  notification: any;
  onClose: () => void;
}

export default function NewMessageToast({ notification, onClose }: NewMessageToastProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter(); // 2. Инициализируем роутер
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [sendReply, { loading }] = useMutation(SEND_QUICK_REPLY);

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await sendReply({
        variables: {
          targetUserId: notification.initiator.id,
          content: replyText,
        },
      });
      setToast({ message: 'Ответ отправлен!', type: 'success' });
      setReplyText('');
      onClose();
    } catch (err: any) {
      setToast({ message: err.message || 'Ошибка отправки', type: 'error' });
    }
  };

  // 3. Создаем хендлер для навигации
  const isFromConversation = !!notification?.conversationId;

  const handleNavigate = () => {
    onClose();
    if (isFromConversation) {
      router.push(`/dashboard/messages?conversationId=${notification.conversationId}`);
    } else {
      router.push(`/dashboard/messages?userId=${notification.initiator.id}`);
    }
  };

  if (!notification || !notification.initiator) return null;

  const isGroup = isFromConversation && (notification.conversationTitle != null || notification.conversationAvatar != null);
  const headerTitle = isGroup ? (notification.conversationTitle || 'Беседа') : (notification.initiator.name || notification.initiator.username);
  const headerAvatarUrl = isGroup ? (notification.conversationAvatar ?? undefined) : notification.initiator.avatar;
  const headerUsername = isGroup ? (notification.conversationTitle || '') : notification.initiator.username;

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <motion.div
        layout
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        className={`fixed bottom-5 right-5 z-50 w-full max-w-sm cursor-pointer overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-lg border
          ${isDarkMode 
             ? 'bg-zinc-900/90 border-zinc-800' 
             : 'bg-white/90 border-zinc-200'
          }
        `}
      >
        {/* В шапке: для беседы — аватар и имя беседы, для личного чата — отправитель */}
        <div onClick={handleNavigate} className="flex items-start gap-4">
          <Avatar 
            username={headerUsername} 
            name={headerTitle}
            url={headerAvatarUrl} 
            size="md" 
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
              <span className="font-bold truncate block">{headerTitle}</span>
              {notification.message}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isFromConversation ? 'Нажмите, чтобы открыть беседу' : 'Нажмите, чтобы посмотреть диалог'}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }} // Добавляем stopPropagation, чтобы не сработал клик по всему блоку
            className={`self-start rounded-full p-1 text-zinc-500 transition-colors
              ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}
            `}
          >
            <X size={16} />
          </button>
        </div>

        {/* Форма быстрого ответа только для личных сообщений */}
        {!isFromConversation && (
        <form onSubmit={handleReply} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Написать ответ..."
            onClick={(e) => e.stopPropagation()} // Предотвращаем навигацию при клике на поле ввода
            className={`flex-1 w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors
              ${isDarkMode
                ? 'bg-zinc-800 border-zinc-700 focus:border-zinc-600 placeholder:text-zinc-500'
                : 'bg-white border-zinc-300 focus:border-zinc-400 placeholder:text-zinc-400'
               }`}
          />
          <button
            type="submit"
            disabled={!replyText.trim() || loading}
            onClick={(e) => e.stopPropagation()} // Предотвращаем навигацию при клике на кнопку
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors shrink-0
              ${!replyText.trim() || loading
                ? 'bg-transparent text-zinc-400 cursor-not-allowed'
                : 'bg-lime-400 text-black hover:bg-lime-500'
              }`}
          >
            {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        )}
      </motion.div>
    </>
  );
}