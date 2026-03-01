'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { gql, useQuery, useLazyQuery } from '@apollo/client';
import Cookies from 'js-cookie';
import { 
  Users, Sparkles, Bell, MessageCircle, 
  ChevronDown, LogOut, Settings, Shield, Clapperboard, Plus, Music, Play, Pause
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { getAvatarUrl } from '@/lib/avatar-url';
import Avatar from './Avatar';
import ThemeToggle from './ThemeToggle';
import Tooltip from './Tooltip';
import UploadVibeModal from './vibes/UploadVibeModal'; 
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

const GET_HEADER_DATA = gql`
  query GetHeaderData {
    me { id username name avatar isAdmin }
    incomingRequests { id }
    myNotifications { id isRead type }
    unreadConversationsCount 
  }
`;

const GET_RECENT_HISTORY_HEADER = gql`
  query GetRecentHistoryHeader {
    myRecentHistory {
      id 
      title 
      url 
      coverUrl 
      duration 
      isLiked
      artist { id name }
      featuredArtists { id name }
    }
  }
`;

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const { currentTrack, isPlaying, togglePlay, playTrack } = useMusicPlayer(); 
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUploadVibeOpen, setIsUploadVibeOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const isVibesPage = pathname === '/dashboard/vibes';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Основные данные хедера (уведомления, сообщения)
  const { data } = useQuery(GET_HEADER_DATA, { 
      pollInterval: 5000, 
      fetchPolicy: 'network-only' 
  });

  // Ленивый запрос истории прослушивания для кнопки запуска последнего трека
  const [fetchRecent] = useLazyQuery(GET_RECENT_HISTORY_HEADER, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
        if (data?.myRecentHistory?.length > 0) {
            // Воспроизводим первый трек из истории и передаем весь список как очередь
            playTrack(data.myRecentHistory[0], data.myRecentHistory);
        } else {
            // Если истории нет, отправляем пользователя в раздел музыки
            router.push('/dashboard/music');
        }
    }
  });

  const me = data?.me;
  const isAdmin = me?.isAdmin || false;
  const messagesCount = data?.unreadConversationsCount || 0;
  const requestsCount = data?.incomingRequests?.length || 0;
  const notificationsCount = data?.myNotifications?.filter((n: any) => 
    !n.isRead && n.type !== 'NEW_MESSAGE' && n.type !== 'MESSAGE_REACTION' && n.type !== 'POST_PUBLISHED'
  ).length || 0;

  const navItems = [
    { icon: Users, href: '/dashboard/friends', count: requestsCount, label: 'Друзья' },
    { icon: Music, href: '/dashboard/music', count: 0, label: 'Музыка' },
    { icon: Clapperboard, href: '/dashboard/vibes', count: 0, label: 'Вайбы' },
    { icon: Sparkles, href: '/dashboard/recommendations', count: 0, label: 'Рекомендации' },
    { icon: Bell, href: '/dashboard/notifications', count: notificationsCount, label: 'Уведомления' },
    { icon: MessageCircle, href: '/dashboard/messages', count: messagesCount, label: 'Сообщения' },
  ];

  const currentIndex = navItems.findIndex(item => pathname.startsWith(item.href));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/');
  };

  const isLightContent = (mounted && isDarkMode) || isVibesPage;
  
  const chevronBtnClass = isLightContent 
    ? 'bg-zinc-900 text-white hover:bg-zinc-700' 
    : 'bg-white text-zinc-500 hover:text-zinc-800 shadow-sm';

  const liquidGlassStyles = {
    '--c-glass': isLightContent ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isLightContent ? '#fff' : '#fff',
    '--c-dark': isLightContent ? '#000' : '#000',
    '--c-content': isLightContent ? '#e1e1e1' : '#224',
    '--c-action': isLightContent ? '#a3e635' : '#0052f5',
    '--c-bg': isLightContent ? '#1b1b1d' : '#E8E8E9',
    '--glass-reflex-dark': isLightContent ? 2 : 1,
    '--glass-reflex-light': isLightContent ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;

  const handleEmptyPlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentTrack) {
          togglePlay();
      } else {
          // Если плеер пуст, запрашиваем историю
          fetchRecent();
      }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .liquid-switcher {
          position: relative;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 472px;
          height: 60px;
          box-sizing: border-box;
          padding: 6px 12px 8px;
          margin: 0;
          border: none;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#switcher) saturate(var(--saturation));
          -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent);
          transition: background-color 400ms cubic-bezier(1, 0.0, 0.4, 1), box-shadow 400ms cubic-bezier(1, 0.0, 0.4, 1);
        }

        .liquid-player {
          position: relative;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 200px;
          max-width: 280px;
          height: 60px;
          box-sizing: border-box;
          padding: 6px 8px 6px 8px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#switcher) saturate(var(--saturation));
          -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent);
          transition: all 0.3s ease;
          cursor: default;
        }

        .liquid-switcher__option {
          color: var(--c-content);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0;
          width: 68px;
          height: 100%;
          box-sizing: border-box;
          border-radius: 99em;
          opacity: 1;
          transition: all 160ms;
          position: relative;
        }

        .liquid-switcher__option:hover {
          color: var(--c-action);
          cursor: pointer;
        }

        .liquid-switcher__option[data-active="true"] {
          color: var(--c-content);
          cursor: auto;
        }

        .liquid-switcher::after {
          content: '';
          position: absolute;
          left: 4px;
          top: 4px;
          display: block;
          width: 84px;
          height: calc(100% - 8px);
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          z-index: -1;
          transition: translate 400ms cubic-bezier(1, 0.0, 0.4, 1), background-color 400ms, box-shadow 400ms;
        }

        .liquid-switcher[data-active-index="-1"]::after { opacity: 0; transition: opacity 200ms; }
        .liquid-switcher[data-active-index="0"]::after { translate: 0 0; }
        .liquid-switcher[data-active-index="1"]::after { translate: 76px 0; }
        .liquid-switcher[data-active-index="2"]::after { translate: 152px 0; }
        .liquid-switcher[data-active-index="3"]::after { translate: 228px 0; }
        .liquid-switcher[data-active-index="4"]::after { translate: 304px 0; }
        .liquid-switcher[data-active-index="5"]::after { translate: 380px 0; } 
      `}} />

      <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
        <svg>
          <filter id="switcher" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </svg>
      </div>

     <header className={`fixed top-[26px] left-0 right-0 z-50 w-full transition-colors duration-300 pointer-events-none`}>
        <div className="w-full px-6 pr-12 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 pointer-events-auto h-full" />

          <div className="flex items-center gap-4 pointer-events-auto">
             
             <div className="hidden md:flex items-center">
                <div className="liquid-player" style={liquidGlassStyles}>
                  <div className="relative w-10 h-10 shrink-0">
                      <motion.div 
                        animate={{ rotate: isPlaying && currentTrack ? 360 : 0 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full rounded-full overflow-hidden shadow-sm border border-white/10"
                      >
                        {currentTrack?.coverUrl ? (
                            <img src={getAvatarUrl(currentTrack.coverUrl) || ''} className="w-full h-full object-cover" alt="cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <Music size={16} className="text-zinc-500" />
                            </div>
                        )}
                      </motion.div>
                      <div className="absolute inset-0 m-auto w-2 h-2 bg-black/50 backdrop-blur-sm rounded-full border border-white/20" />
                  </div>

                  <div className="flex flex-col justify-center min-w-0 flex-1">
                      {currentTrack ? (
                        <>
                          <span className={`text-xs font-bold truncate leading-tight ${isLightContent ? 'text-zinc-100' : 'text-zinc-800'}`}>
                              {currentTrack.title}
                          </span>
                          <span className={`text-[10px] truncate leading-tight ${isLightContent ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {currentTrack.artist.name}
                          </span>
                        </>
                      ) : (
                        <span className={`text-xs font-bold truncate leading-tight ${isLightContent ? 'text-zinc-100' : 'text-zinc-800'}`}>
                            Воспроизвести <br/> последний трек
                        </span>
                      )}
                  </div>

                  <button 
                      onClick={handleEmptyPlayClick}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0
                        ${isLightContent ? 'bg-white text-black' : 'bg-black text-white'}
                      `}
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                      {isPlaying ? (
                          <Pause size={14} fill="currentColor" />
                      ) : (
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                      )}
                  </button>
                </div>
             </div>

             <div className="hidden lg:flex">
                <div className="liquid-switcher" style={liquidGlassStyles} data-active-index={currentIndex}>
                  {navItems.map((item, index) => {
                    const isActive = currentIndex === index;
                    return (
                      <Tooltip key={index} content={item.label} position="bottom">
                        <label 
                          className="liquid-switcher__option" 
                          onClick={() => router.push(item.href)}
                          data-active={isActive}
                        >
                          <div className="relative">
                            <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} className="liquid-switcher__icon" />
                            {item.count > 0 && (
                                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm z-10">
                                  {item.count > 9 ? '9+' : item.count}
                                </span>
                              )}
                          </div>
                        </label>
                      </Tooltip>
                    );
                  })}
                </div>
             </div>

            {isVibesPage && (
              <Tooltip content="Загрузить вайб" position="bottom">
                <button 
                  onClick={() => setIsUploadVibeOpen(true)}
                  className="p-3 bg-lime-400 text-black rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                >
                  <Plus size={24} strokeWidth={3} />
                </button>
              </Tooltip>
            )}

             <div className="flex items-center gap-2 relative" ref={dropdownRef}>
               {me ? (
                 <>
                    <Link href="/dashboard" className="block transition-transform hover:scale-110 active:scale-95 duration-200">
                      <Avatar username={me.username} name={me.name} url={me.avatar} size="md" />
                    </Link>

                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-all ${chevronBtnClass}`}
                    >
                      <ChevronDown 
                        size={16} 
                        strokeWidth={2.5}
                        className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute top-full right-0 mt-3 w-72 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden border backdrop-blur-[30px] z-50
                            ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/95 border-zinc-200'}`}
                        >
                          <div className={`p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                            <p className={`font-bold truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{me.name || me.username}</p>
                            <p className={`text-xs truncate ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>@{me.username}</p>
                          </div>

                          <div className="p-3 flex flex-col gap-2">
                            <div className="mb-2">
                               <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ml-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Оформление</p>
                               <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
                            </div>
                            
                            <div className={`h-px w-full my-1 ${isDarkMode ? 'bg-white/10' : 'bg-zinc-200'}`} />

                            <Link href="/dashboard/settings" onClick={() => setIsDropdownOpen(false)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-colors ${isDarkMode ? 'text-zinc-200 hover:bg-white/10' : 'text-zinc-800 hover:bg-black/5'}`}>
                              <Settings size={18} /> Настройки
                            </Link>

                            {isAdmin && (
                              <Link href="/dashboard/admin" onClick={() => setIsDropdownOpen(false)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-colors text-blue-600 hover:bg-blue-50 dark:text-blue-500 dark:hover:bg-blue-500/10`}>
                                <Shield size={18} /> Админ-панель
                              </Link>
                            )}
                          </div>

                          <div className={`p-3 border-t ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                             <button onClick={handleLogout} className={`w-full cursor-pointer flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-colors text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10`}>
                              <LogOut size={18} /> Выйти
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </>
               ) : (
                 <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
               )}
             </div>
          </div>
        </div>
      </header>

      <UploadVibeModal isOpen={isUploadVibeOpen} onClose={() => setIsUploadVibeOpen(false)} onSuccess={() => {}} />
    </>
  );
}