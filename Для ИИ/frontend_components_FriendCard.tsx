// frontend/components/FriendCard.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { UserMinus, MessageCircle, Check, X, UserPlus, LogOut } from 'lucide-react';
import { formatTimeAgo } from '@/lib/time-ago';

interface FriendCardProps {
  user: any;
  type: 'friend' | 'request' | 'search' | 'outgoing';
  isDarkMode: boolean;
  onAction: (action: string, id: number) => void;
  isTop?: boolean;
  isHighlighted?: boolean;
}

export default function FriendCard({ user, type, isDarkMode, onAction, isTop, isHighlighted }: FriendCardProps) {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(user.lastOnlineAt));
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(user.lastOnlineAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [user.lastOnlineAt]);

  const statusText = user.isOnline
    ? 'Онлайн'
    : user.lastOnlineAt
      ? `Был(а) ${timeAgo}`
      : 'Оффлайн';

  const profileHref = user?.id ? `/dashboard/user/${user.id}` : null;

  const highlightClasses = isHighlighted 
    ? (isDarkMode ? 'ring-2 ring-lime-400 bg-lime-900/20' : 'ring-2 ring-lime-400 bg-lime-50')
    : '';

  // --- СТИЛИ КНОПОК ДЛЯ ЧИТАЕМОСТИ ---
  const btnBase = `
    flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300
    backdrop-blur-md border shadow-sm active:scale-95 cursor-pointer whitespace-nowrap flex-1
  `;

  // Салатовая кнопка: Темный текст для контраста
  const limeGlass = `${btnBase} bg-lime-400 text-zinc-900 border-lime-300 hover:bg-lime-500 shadow-lime-500/20`;
  
  // Нейтральная кнопка: Четкий серый текст
  const neutralGlass = `${btnBase} ${isDarkMode 
    ? 'bg-white/10 border-white/10 text-white hover:bg-white/20' 
    : 'bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200'}`;
    
  // Красная кнопка: Четкий красный/белый
  const dangerGlass = `${btnBase} bg-red-500 text-white border-red-400 hover:bg-red-600 shadow-red-500/10`;

  return (
    <div 
        ref={cardRef}
        className={`p-4 rounded-[24px] border transition-all duration-500 flex items-start gap-4 relative
        ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}
        w-full ${highlightClasses}`}
    >
      {isTop && (
          <div className="absolute -top-1 -right-1 bg-lime-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">TOP</div>
      )}

      {/* Аватар */}
      <div className="shrink-0">
        {profileHref ? (
          <Link href={profileHref} className="cursor-pointer block">
            <Avatar username={user.username} name={user.name} url={user.avatar} size="md" />
          </Link>
        ) : (
          <Avatar username={user.username} name={user.name} url={user.avatar} size="md" />
        )}
      </div>

      {/* Контент */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        <div className="mb-3">
          {profileHref ? (
            <Link href={profileHref} className="block cursor-pointer group/link">
                <h3 className={`font-bold text-base leading-tight truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                  {user.name || user.username}
                </h3>
                <p className={`text-xs mt-1 font-medium ${user.isOnline ? 'text-lime-500' : 'text-zinc-400'}`}>
                   {statusText}
                </p>
            </Link>
          ) : (
            <div>
                <h3 className={`font-bold text-base leading-tight truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                  {user.name || user.username}
                </h3>
                <p className={`text-xs mt-1 font-medium ${user.isOnline ? 'text-lime-500' : 'text-zinc-400'}`}>
                   {statusText}
                </p>
            </div>
          )}
        </div>
        
        {/* Кнопки в ряд */}
        <div className="flex gap-2 w-full mt-auto">
            {type === 'friend' && (
                <>
                  <button onClick={() => {}} className={neutralGlass}><MessageCircle size={14} /> Чат</button>
                  <button onClick={() => onAction('remove', user.id)} className={dangerGlass}><UserMinus size={14} /></button>
                </>
            )}

            {type === 'request' && (
                <>
                   <button onClick={() => onAction('accept', user.requestId)} className={limeGlass}><Check size={14} /> Принять</button>
                   <button onClick={() => onAction('reject', user.requestId)} className={neutralGlass}><X size={14} /></button>
                </>
            )}
            
            {type === 'search' && (
                <button onClick={() => onAction('add', user.id)} className={limeGlass}>
                    <UserPlus size={16} /> Добавить в друзья
                </button>
            )}

            {type === 'outgoing' && (
                <button onClick={() => onAction('cancel', user.requestId)} className={dangerGlass}>
                    <LogOut size={16} /> Отменить заявку
                </button>
            )}
        </div>
      </div>
    </div>
  );
}