'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { Message } from '@/types/messages';
import Avatar from '@/components/Avatar';
import { toHex, APPLE_EMOJI_BASE_URL } from '@/lib/emoji-data';

interface MessageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  conversationId: number;
  onJumpToMessage: (messageId: number) => void;
  isDarkMode: boolean;
  myId: number;
}

export default function MessageSearchModal({
  isOpen,
  onClose,
  messages,
  conversationId,
  onJumpToMessage,
  isDarkMode,
  myId,
}: MessageSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalElement(document.getElementById('portals'));
  }, []);

  const normalize = (str: string) => str.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const normalizedQuery = normalize(query);
    return messages
      .filter(msg => msg.type !== 'SYSTEM' && normalize(msg.content).includes(normalizedQuery))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onJumpToMessage(results[selectedIndex].id);
        onClose();
      }
    }
  };

  const renderTextWithEmojis = (text: string) => {
    const emojiRegex = /(\p{Emoji_Presentation})/gu;
    const parts = text.split(emojiRegex);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.match(emojiRegex)) {
        const hex = toHex(part);
        if (hex) {
          return (
            <img
              key={i}
              src={`${APPLE_EMOJI_BASE_URL}${hex}.png`}
              alt={part}
              className="inline-block w-5 h-5 align-text-bottom"
            />
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!isOpen || !portalElement) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-24"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-2xl rounded-[28px] overflow-hidden shadow-2xl border flex flex-col max-h-[70vh]
            ${isDarkMode ? 'bg-zinc-900/90 border-white/10' : 'bg-white/90 border-zinc-200'}`}
        >
          {/* Заголовок */}
          <div className={`flex items-center justify-between p-5 border-b ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Search size={20} className="text-lime-400" />
              Поиск в чате
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-zinc-100'}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Поле ввода */}
          <div className="p-5">
            <div className={`relative flex items-center px-4 py-3 rounded-xl border ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
              <Search size={18} className="text-zinc-500 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Введите текст для поиска..."
                className="bg-transparent w-full outline-none text-sm"
              />
              {results.length > 0 && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isDarkMode ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
                  {results.length}
                </span>
              )}
            </div>
          </div>

          {/* Результаты */}
          <div className="flex-1 overflow-y-auto px-3 pb-5 custom-scrollbar">
            {results.length === 0 && query.trim() !== '' ? (
              <div className="text-center py-10 opacity-60 text-sm">Ничего не найдено</div>
            ) : (
              <div className="space-y-1">
                {results.map((msg, idx) => {
                  const isMe = msg.senderId === myId;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => {
                        onJumpToMessage(msg.id);
                        onClose();
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all border
                        ${idx === selectedIndex
                          ? (isDarkMode ? 'bg-lime-400/20 border-lime-400/50' : 'bg-lime-400/10 border-lime-400')
                          : (isDarkMode ? 'hover:bg-white/5 border-transparent' : 'hover:bg-black/5 border-transparent')
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar
                          username={msg.sender.username}
                          name={msg.sender.name}
                          url={msg.sender.avatar}
                          size="sm"
                        />
                        <span className={`text-sm font-bold ${isMe ? (isDarkMode ? 'text-lime-400' : 'text-lime-600') : ''}`}>
                          {msg.sender.name || msg.sender.username}
                        </span>
                        <span className="text-xs text-zinc-500 ml-auto">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-all pl-11">
                        {renderTextWithEmojis(msg.content)}
                      </p>
                      {msg.images && msg.images.length > 0 && (
                        <div className="mt-2 flex gap-1 pl-11">
                          <span className="text-xs text-zinc-500">📷 Фото</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Подсказка по навигации */}
          {results.length > 0 && (
            <div className={`px-5 py-3 border-t flex items-center gap-4 text-xs ${isDarkMode ? 'border-white/10 text-zinc-500' : 'border-zinc-200 text-zinc-400'}`}>
              <div className="flex items-center gap-1">
                <ArrowUp size={14} /> <ArrowDown size={14} /> – навигация
              </div>
              <div className="flex items-center gap-1">
                <kbd className={`px-2 py-1 rounded ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>Enter</kbd> – перейти
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    portalElement
  );
}