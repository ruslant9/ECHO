'use client';

import { useState, useEffect, useMemo } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Trash2, Bell, Heart, MessageSquare, Repeat, Users, Loader } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import NotificationCard from '@/components/NotificationCard';
import { useNotification } from '@/context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';
import ConfirmationModal from '@/components/ConfirmationModal';

const GET_NOTIFICATIONS = gql`
  query GetNotifications {
    myNotifications {
      id
      type
      message
      isRead
      createdAt
      postId
      commentId
      vibeId
      vibeCommentId
      imageUrl
      initiator {
        id
        username
        name
        avatar
      }
    }
  }
`;

const DELETE_NOTIFICATION = gql`mutation DeleteNotification($id: Int!) { deleteNotification(id: $id) }`;
const CLEAR_ALL = gql`mutation ClearAll { clearAllNotifications }`;

type FilterType = 'all' | 'friends' | 'likes' | 'comments';

export default function NotificationsPage() {
  const { isDarkMode } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const { markNotificationAsRead } = useNotification(); 

  const [confirmDeleteState, setConfirmDeleteState] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null });
  const [prevIndex, setPrevIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, { 
    pollInterval: 10000,
    fetchPolicy: 'network-only'
  });
  
  const [deleteNotif] = useMutation(DELETE_NOTIFICATION, { onCompleted: () => refetch() });
  const [clearAll] = useMutation(CLEAR_ALL, { onCompleted: () => refetch() });

  const notifications = (data?.myNotifications || []).filter((n: any) => 
    n.type !== 'NEW_MESSAGE' && 
    n.type !== 'MESSAGE_REACTION' && 
    n.type !== 'POST_PUBLISHED'
  );

  const filteredNotifications = notifications.filter((n: any) => {
    switch (filter) {
        case 'friends':
            return n.type === 'FRIEND_REQUEST' || n.type === 'FRIEND_ACCEPT';
        case 'likes':
            return n.type === 'POST_LIKE' || n.type === 'COMMENT_LIKE' || n.type === 'VIBE_LIKE';
        case 'comments':
            return n.type === 'NEW_COMMENT' || n.type === 'REPOST' || n.type === 'NEW_VIBE_COMMENT' || n.type === 'VIBE_REPOST';
        case 'all':
        default:
            return true;
    }
  });

  const handleDelete = (id: number) => {
      setConfirmDeleteState({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteState.id !== null) {
      await deleteNotif({ variables: { id: confirmDeleteState.id } });
    }
    setConfirmDeleteState({ isOpen: false, id: null });
  };

  const filterButtons = useMemo<{ id: FilterType; label: string; icon: any }[]>(() => [
    { id: 'all', label: 'Все', icon: Bell },
    { id: 'friends', label: 'Друзья', icon: Users },
    { id: 'likes', label: 'Лайки', icon: Heart },
    { id: 'comments', label: 'Комментарии и репосты', icon: MessageSquare },
  ], []);

  const currentIndex = filterButtons.findIndex(btn => btn.id === filter);
  
  useEffect(() => {
    if (currentIndex > prevIndex) setDirection('right');
    else if (currentIndex < prevIndex) setDirection('left');
    setPrevIndex(currentIndex);
  }, [currentIndex, prevIndex]);

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': isDarkMode ? '#a3e635' : '#0052f5',
    '--c-bg': isDarkMode ? '#1b1b1d' : '#E8E8E9',
    '--glass-reflex-dark': isDarkMode ? 2 : 1,
    '--glass-reflex-light': isDarkMode ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;

  if (loading && !data) {
    return (
      <div className={`min-h-[calc(100vh-64px)] flex items-center justify-center transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
        <div className="flex flex-col items-center gap-4 opacity-50">
           <Loader className="animate-spin text-lime-500" size={40} />
           <p className="text-sm font-medium">Загрузка уведомлений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-full p-6 md:p-8 font-sans transition-colors relative z-10 ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      <div className="max-w-3xl mx-auto mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
         <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
                Уведомления
                {notifications.filter((n: any) => !n.isRead).length > 0 && (
                   <span className="text-sm bg-lime-400 text-black px-2 py-0.5 rounded-full align-middle">
                      {notifications.filter((n: any) => !n.isRead).length}
                   </span>
                )}
            </h1>
            <p className="text-zinc-500">История вашей активности</p>
         </div>
         
        <ConfirmationModal 
          isOpen={confirmDeleteState.isOpen}
          onClose={() => setConfirmDeleteState({ isOpen: false, id: null })}
          onConfirm={handleConfirmDelete}
          title="Удалить уведомление?"
          message="Это действие необратимо."
        />

         {notifications.length > 0 && (
             <button onClick={() => clearAll()} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${isDarkMode ? 'bg-zinc-900 hover:bg-red-900/20 text-zinc-400 hover:text-red-400' : 'bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-500'}`}>
                <Trash2 size={16} /> Очистить все
             </button>
         )}
      </div>

      <div className="max-w-3xl mx-auto mb-6">
         <style dangerouslySetInnerHTML={{ __html: `
          .notif-liquid-switcher::-webkit-scrollbar { display: none; }
          .notif-liquid-switcher { -ms-overflow-style: none; scrollbar-width: none; }
          
          .notif-liquid-switcher {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 4px;
            height: 60px;
            box-sizing: border-box;
            padding: 6px;
            border-radius: 99em;
            background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
            backdrop-filter: blur(8px) url(#notif-switcher-filter) saturate(var(--saturation));
            -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
            box-shadow: 
              inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
              inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent), 
              inset -2px -2px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 80%), transparent), 
              inset -3px -8px 1px -6px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 60%), transparent), 
              inset -0.3px -1px 4px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 12%), transparent), 
              inset -1.5px 2.5px 0px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
              inset 0px 3px 4px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
              inset 2px -6.5px 1px -4px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 10%), transparent), 
              0px 1px 5px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 10%), transparent), 
              0px 6px 16px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 8%), transparent);
            transition: background-color 400ms cubic-bezier(1, 0.0, 0.4, 1), box-shadow 400ms cubic-bezier(1, 0.0, 0.4, 1);
            overflow-x: auto;
          }

          .notif-liquid-option {
            color: var(--c-content);
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 0 20px;
            border-radius: 99em;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: color 160ms;
          }

          .notif-liquid-option:hover { color: var(--c-action); }
          .notif-liquid-option[data-active="true"] { color: var(--c-content); cursor: default; }

          .notif-liquid-icon {
            margin-right: 8px;
            transition: scale 200ms cubic-bezier(0.5, 0, 0, 1);
          }

          .notif-liquid-option:hover .notif-liquid-icon { scale: 1.2; }
          .notif-liquid-option[data-active="true"] .notif-liquid-icon { scale: 1; }

          .notif-liquid-blob {
            border-radius: 99em;
            background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
            box-shadow: 
              inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
              inset 2px 1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent), 
              inset -1.5px -1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 80%), transparent), 
              inset -2px -6px 1px -5px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 60%), transparent), 
              inset -1px 2px 3px -1px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
              inset 0px -4px 1px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 10%), transparent), 
              0px 3px 6px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 8%), transparent);
          }
        `}} />

        <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
          <svg>
            <filter id="notif-switcher-filter" primitiveUnits="objectBoundingBox">
              <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
              <feDisplacementMap 
                id="disp" 
                in="blur" 
                in2="map" 
                scale="0.5" 
                xChannelSelector="R" 
                yChannelSelector="G"
              />
            </filter>
          </svg>
        </div>

        <div 
          className="notif-liquid-switcher" 
          style={liquidGlassStyles} 
          data-active-index={currentIndex} 
          data-direction={direction}
        >
          {filterButtons.map(btn => {
            const isActive = filter === btn.id;
            return (
              <button 
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className="notif-liquid-option relative cursor-pointer"
                data-active={isActive}
              >
                {isActive && (
                  <motion.div
                    layoutId="notif-active-blob"
                    className="notif-liquid-blob absolute inset-0 z-0"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex items-center justify-center whitespace-nowrap">
                  <btn.icon size={16} className="notif-liquid-icon" />
                  {btn.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
          {filteredNotifications.length > 0 ? (
             filteredNotifications.map((n: any) => (
                 <NotificationCard key={n.id} notification={n} onDelete={handleDelete} />
             ))
          ) : (
             <div className="text-center py-20 opacity-50 flex flex-col items-center">
                 <Bell size={48} className="mb-4 text-zinc-600" />
                 <p>В этой категории уведомлений пока нет</p>
             </div>
          )}
      </div>
    </div>
  );
}