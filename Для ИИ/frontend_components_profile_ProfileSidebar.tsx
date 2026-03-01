'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { MapPin, Link as LinkIcon, Calendar } from 'lucide-react';
import Avatar from '@/components/Avatar';
import ImageViewer from '@/components/ImageViewer';
import { getAvatarUrl } from '@/lib/avatar-url';

interface ProfileSidebarProps {
  user: any;
  statusText?: string;
  onOpenUsersList: (type: 'friends' | 'subscriptions' | 'followers') => void;
  actionButtons?: React.ReactNode;
}

export default function ProfileSidebar({ user, statusText, onOpenUsersList, actionButtons }: ProfileSidebarProps) {
  const { isDarkMode } = useTheme();
  const [isAvatarViewerOpen, setIsAvatarViewerOpen] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  return (
    // Отрицательный margin тянет колонку наверх
    <div className="lg:w-1/3 xl:w-1/4 relative -mt-16 lg:-mt-20 z-10 mb-8 lg:mb-0">
      
      {/* Просмотрщик аватара */}
      {user?.avatar && (
        <ImageViewer 
          isOpen={isAvatarViewerOpen}
          onClose={() => setIsAvatarViewerOpen(false)}
          images={[getAvatarUrl(user.avatar) || '']}
          initialIndex={0}
        />
      )}

      {/* Аватарка */}
      <div 
        className="mb-4 relative inline-block cursor-pointer group" 
        onClick={() => user?.avatar && setIsAvatarViewerOpen(true)}
      >
        <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
          <Avatar username={user?.username} name={user?.name} url={user?.avatar} size="2xl" className="w-32 h-32 md:w-40 md:h-40 text-6xl" />
        </div>
        <div className="absolute inset-1.5 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors" />
      </div>

      {/* Информация пользователя */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold leading-tight">{user?.name || user?.username}</h1>
        {statusText && (
            <p className={`text-sm font-medium mt-2 mb-1 ${user?.isOnline && !user?.amIBlocked ? 'text-lime-500' : 'text-zinc-500'}`}>{statusText}</p>
        )}
        <p className={`text-base ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>@{user?.username?.toLowerCase()}</p>
      </div>

      {!(user?.amIBlocked || user?.isBlockedByMe) && (
        <>
          {user?.bio && <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">{user.bio}</p>}
          <div className={`flex flex-col gap-2 mb-6 text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {user?.location && <div className="flex items-center gap-2"><MapPin size={16} /><span>{user.location}</span></div>}
            {user?.website && (
               <div className="flex items-center gap-2">
                 <LinkIcon size={16} /> 
                 <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline truncate">
                   {user.website.replace(/^(https?:\/\/)?(www\.)?/, '')}
                 </a>
               </div>
            )}
            {user?.createdAt && <div className="flex items-center gap-2"><Calendar size={16} /><span>Регистрация: {formatDate(user.createdAt)}</span></div>}
          </div>

          <div className="flex gap-4 mb-6 text-sm">
            <button onClick={() => onOpenUsersList('subscriptions')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity">
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.subscriptionsCount ?? 0}</span>
              <span className="text-zinc-500">Подписки</span>
            </button>
            <button onClick={() => onOpenUsersList('followers')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity">
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.followersCount ?? 0}</span>
              <span className="text-zinc-500">Подписчики</span>
            </button>
            <button onClick={() => onOpenUsersList('friends')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity">
              <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.friendsCount ?? 0}</span>
              <span className="text-zinc-500">Друзья</span>
            </button>
          </div>
        </>
      )}

      {/* Кнопки действий */}
      <div className="space-y-3">
        {actionButtons}
      </div>
    </div>
  );
}