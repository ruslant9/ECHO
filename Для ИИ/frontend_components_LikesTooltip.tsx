'use client';

import { useState, useRef, useEffect } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import Avatar from './Avatar';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { Loader } from 'lucide-react';

const GET_POST_LIKES = gql`
  query GetPostLikes($postId: Int!) {
    getPostLikes(postId: $postId) { id, username, name, avatar }
  }
`;

const GET_COMMENT_LIKES = gql`
  query GetCommentLikes($commentId: Int!) {
    getCommentLikes(commentId: $commentId) { id, username, name, avatar }
  }
`;

interface LikesTooltipProps {
  children: React.ReactNode;
  id: number;
  type: 'post' | 'comment';
  count: number;
}

export default function LikesTooltip({ children, id, type, count }: LikesTooltipProps) {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const [getPostLikes, { data: postData, loading: postLoading }] = useLazyQuery(GET_POST_LIKES, { fetchPolicy: 'network-only' });
  const [getCommentLikes, { data: commentData, loading: commentLoading }] = useLazyQuery(GET_COMMENT_LIKES, { fetchPolicy: 'network-only' });

  const users = type === 'post' ? postData?.getPostLikes : commentData?.getCommentLikes;
  const loading = type === 'post' ? postLoading : commentLoading;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      // ИСПРАВЛЕНИЕ: Игнорируем скролл, если он происходит внутри самого списка
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('.tooltip-scroll-container')) {
        return; 
      }

      if (isOpen) setIsOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (count === 0) return;
    
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setCoords({
              top: rect.top - 8,
              left: rect.left + rect.width / 2
          });
      }
      setIsOpen(true);
      if (type === 'post') getPostLikes({ variables: { postId: id } });
      else getCommentLikes({ variables: { commentId: id } });
    }, 1000); 
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const handleTooltipMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const handleTooltipMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const tooltipContent = (
      <AnimatePresence>
        {isOpen && (
          <div style={{
              position: 'fixed', 
              top: coords.top,
              left: coords.left,
              transform: 'translate(-50%, -100%)',
              zIndex: 99999,
              pointerEvents: 'none'
          }}>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{ pointerEvents: 'auto' }}
              onMouseEnter={handleTooltipMouseEnter} 
              onMouseLeave={handleTooltipMouseLeave} 
              className={`min-w-[160px] max-w-[200px] rounded-2xl shadow-2xl backdrop-blur-xl border p-1 pr-1.5
                ${isDarkMode 
                  ? 'bg-zinc-900/95 border-zinc-700 text-zinc-100' 
                  : 'bg-white/95 border-zinc-200 text-zinc-900'
                }`}
            >
              <div className="absolute top-full left-0 right-0 h-4 bg-transparent" />

              <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r
                 ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`} 
              />

              <div className="relative z-10 p-2">
                <div className="text-[10px] font-bold uppercase opacity-50 mb-2 px-1">
                  Понравилось
                </div>

                {loading ? (
                  <div className="flex justify-center p-2">
                    <Loader size={16} className="animate-spin opacity-50" />
                  </div>
                ) : (
                  // Добавлен класс tooltip-scroll-container
                  <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-2 tooltip-scroll-container">
                    {users?.map((user: any) => (
                      <Link 
                        key={user.id} 
                        href={`/dashboard/user/${user.id}`}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-2 p-1.5 rounded-lg transition-colors
                          ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
                      >
                        <Avatar username={user.username} name={user.name} url={user.avatar} size="sm" className="w-6 h-6 text-[10px]" />
                        <span className="text-xs font-medium truncate max-w-[120px]">{user.name || user.username}</span>
                      </Link>
                    ))}
                    
                    {count > (users?.length || 0) && (
                       <div className="text-xs text-center opacity-50 py-1">
                          и ещё {count - (users?.length || 0)}
                       </div>
                    )}
                    
                    {users?.length === 0 && !loading && (
                       <div className="text-xs text-center opacity-50 py-1">Список пуст</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );

  return (
    <div 
      ref={triggerRef}
      className="relative inline-flex items-center" 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {mounted && createPortal(tooltipContent, document.body)}
    </div>
  );
}