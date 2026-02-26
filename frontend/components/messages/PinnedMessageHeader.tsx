'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, List, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Tooltip from '@/components/Tooltip';
import Avatar from '@/components/Avatar';
import { Message } from '@/types/messages';
import { getAvatarUrl } from '@/lib/avatar-url'; 

interface PinnedMessageHeaderProps {
  messages: Message[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onScrollTo: (id: number) => void;
  onUnpin: (id: number) => void;
}

function formatPinDate(createdAt: string) {
  const d = new Date(createdAt);
  const now = new Date();
  const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return `Сегодня, ${timeStr}`;
  const isYesterday = new Date(now.getTime() - 864e5).toDateString() === d.toDateString();
  if (isYesterday) return `Вчера, ${timeStr}`;
  const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  return `${dateStr}, ${timeStr}`;
}

export default function PinnedMessageHeader({ messages, currentIndex, onNext, onPrev, onScrollTo, onUnpin }: PinnedMessageHeaderProps) {
  const { isDarkMode } = useTheme();
  const [listOpen, setListOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideHeader = listRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideHeader && !insideDropdown) setListOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [listOpen]);

  if (messages.length === 0) return null;
  const message = messages[currentIndex];

  const sortedByDate = [...messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const buttonHover = isDarkMode ? 'hover:bg-zinc-800 hover:text-lime-400' : 'hover:bg-zinc-100 hover:text-lime-600';
  const buttonActive = 'active:scale-95 transition-colors';

  return (
    <div ref={listRef} className={`absolute top-16 left-0 right-0 z-40 px-4 py-2 backdrop-blur-md border-b transition-colors ${isDarkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-zinc-200'}`}>
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="relative flex items-center gap-2">
          <Tooltip content="Список закреплённых" position="bottom">
            <button
              onClick={() => setListOpen((v) => !v)}
              className={`p-1.5 rounded-lg ${buttonHover} ${buttonActive} cursor-pointer ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}
            >
              <List size={18} />
            </button>
          </Tooltip>
          {messages.length > 1 && (
            <div className="flex items-center gap-0.5 text-zinc-500">
              <button onClick={onPrev} className={`p-1 rounded-full ${buttonHover} ${buttonActive} cursor-pointer`}>
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs font-mono select-none min-w-8 text-center">{currentIndex + 1}/{messages.length}</span>
              <button onClick={onNext} className={`p-1 rounded-full ${buttonHover} ${buttonActive} cursor-pointer`}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          {listOpen && (
            <div
              ref={dropdownRef}
              className={`absolute top-full left-0 mt-3 w-96 min-w-[18rem] max-w-[calc(100vw-2rem)] rounded-xl border shadow-xl max-h-72 overflow-y-auto z-50 ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}
            >
              <div className="p-3 space-y-1">
                {sortedByDate.map((msg) => {
                  const sender = (msg as any).sender;
                  const hasMsgContent = msg.content && msg.content.trim().length > 0;
                  const hasMsgImages = (msg as any).images && (msg as any).images.length > 0;
                  const firstImage = hasMsgImages ? getAvatarUrl((msg as any).images[0]) : null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                    >
                      <Avatar
                        username={sender?.username ?? ''}
                        name={sender?.name}
                        url={sender?.avatar}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {sender?.name || sender?.username || '—'}
                        </p>
                        
                        <div className={`text-sm truncate flex items-center gap-2 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {firstImage && (
                            <img src={firstImage} alt="preview" className="w-5 h-5 rounded-md object-cover" />
                          )}
                          {hasMsgContent ? (
                            <span>{msg.content}</span>
                          ) : hasMsgImages ? (
                            <span className="italic opacity-70">Фотография</span>
                          ) : (
                            <span className="italic opacity-50">Сообщение недоступно</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 whitespace-nowrap">{formatPinDate(msg.createdAt)}</p>
                      </div>
                      <button
                        onClick={() => { onScrollTo(msg.id); setListOpen(false); }}
                        className={`shrink-0 text-xs font-medium px-2 py-1 rounded-md transition-colors cursor-pointer ${isDarkMode ? 'bg-lime-600 hover:bg-lime-500 text-white' : 'bg-lime-500 hover:bg-lime-400 text-white'}`}
                      >
                        Перейти
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setTimeout(() => onScrollTo(message.id), 50)}
          className={`flex-1 flex items-center gap-3 cursor-pointer overflow-hidden rounded-lg py-1.5 px-3 -mx-2 min-w-0 select-none shrink-0 transition-colors ${isDarkMode ? 'bg-lime-500/20 text-zinc-200 hover:bg-lime-500/25' : 'bg-lime-400/25 text-zinc-800 hover:bg-lime-400/35'}`}
        >
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-lime-500 mb-0.5">Закрепленное сообщение</h4>
            <div className="text-sm truncate flex items-center gap-2">
              {(message as any).images && (message as any).images.length > 0 && (
                <img src={getAvatarUrl((message as any).images[0])!} alt="preview" className="w-5 h-5 rounded-md object-cover" />
              )}
              {message.content ? (
                 <span>{message.content}</span>
              ) : (message as any).images && (message as any).images.length > 0 ? (
                 <span className="italic opacity-70">Фотография</span>
              ) : (
                 <span className="italic opacity-50">Сообщение недоступно</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => onUnpin(message.id)}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}