'use client';

import { useRef, useId } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import Link from 'next/link';
import Avatar from './Avatar';
import FriendshipButton from './FriendshipButton';
import { useTheme } from '@/context/ThemeContext';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

interface UserCarouselProps {
  users: any[];
  onUpdate: () => void;
  currentUserId: number;
}

export default function UserCarousel({ users, onUpdate, currentUserId }: UserCarouselProps) {
  const { isDarkMode } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const filterId = `carousel-filter-${uniqueId}`;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 300;
      current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  if (!users || users.length === 0) return null;

  // --- ОБНОВЛЕННЫЕ СТИЛИ ---

  // Стиль для карточек пользователей (как в PostCard)
  const liquidCardStyle = {
    position: 'relative',
    borderRadius: '24px',
    border: 'none',
    backgroundColor: isDarkMode ? 'color-mix(in srgb, #bbbbbc 8%, transparent)' : 'color-mix(in srgb, #bbbbbc 12%, transparent)',
    backdropFilter: `blur(12px) saturate(150%)`,
    WebkitBackdropFilter: `blur(12px) saturate(150%)`,
    boxShadow: `
      inset 0 0 0 1px color-mix(in srgb, ${isDarkMode ? '#fff' : '#fff'} ${isDarkMode ? '15%' : '40%'}, transparent),
      inset 2px 2px 0px 0px color-mix(in srgb, ${isDarkMode ? '#fff' : '#fff'} ${isDarkMode ? '10%' : '30%'}, transparent),
      0px 4px 20px 0px color-mix(in srgb, #000 ${isDarkMode ? '30%' : '10%'}, transparent)
    `,
  } as React.CSSProperties;
  
  // Стиль для кнопок-стрелок
  const liquidArrowStyle = {
    backgroundColor: 'color-mix(in srgb, var(--c-glass) 12%, transparent)',
    backdropFilter: 'blur(12px) saturate(var(--saturation))',
    WebkitBackdropFilter: 'blur(12px) saturate(var(--saturation))',
    boxShadow: `
      inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
      0px 4px 16px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 15%), transparent)
    `,
    border: 'none'
  } as React.CSSProperties;
  
  // CSS переменные для стрелок
  const liquidGlassVars = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--glass-reflex-dark': isDarkMode ? 2 : 1,
    '--glass-reflex-light': isDarkMode ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;
  
  // -------------------------

  return (
    <div className={`mb-6 py-4 border-y ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
      <div className="flex justify-between items-center mb-3 px-2">
        <h3 className="font-bold text-sm text-zinc-500 uppercase tracking-wider">Возможно вы знакомы</h3>
        <div className="flex gap-2" style={liquidGlassVars}>
            <button 
                onClick={() => scroll('left')} 
                style={liquidArrowStyle}
                className={`p-2 rounded-full cursor-pointer transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'}`}
            >
                <ChevronLeft size={18}/>
            </button>
            <button 
                onClick={() => scroll('right')} 
                style={liquidArrowStyle}
                className={`p-2 rounded-full cursor-pointer transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'}`}
            >
                <ChevronRight size={18}/>
            </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-2 snap-x"
      >
        {users.map((user) => (
          <div
            key={user.id}
            style={liquidCardStyle}
            className="min-w-[200px] w-[200px] p-4 flex flex-col items-center gap-3 snap-center transition-colors"
          >
            <Link href={`/dashboard/user/${user.id}`}>
               <Avatar username={user.username} name={user.name} url={user.avatar} size="lg" />
            </Link>
            <div className="text-center w-full">
                <Link
                    href={`/dashboard/user/${user.id}`}
                    className="font-bold text-sm block hover:underline"
                >
                    {user.name || user.username}
                </Link>
                <p className="text-xs text-zinc-500">@{user.username}</p>
            </div>

            <div className="w-full mt-auto">
                {user.id !== currentUserId ? (
                    <FriendshipButton
                        status={user.friendshipStatus}
                        targetUserId={user.id}
                        sentRequestId={user.sentFriendRequestId}
                        receivedRequestId={user.receivedFriendRequestId}
                        onUpdate={onUpdate}
                        className="py-2 text-xs"
                        iconSize={16}
                    />
                ) : (
                    <button disabled className={`w-full py-2 text-xs rounded-full font-bold flex items-center justify-center gap-2 cursor-not-allowed
                        ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                        <User size={16} /> Вы
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}