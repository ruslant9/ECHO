'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import { useSocket } from '@/context/SocketContext';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import CommentCard from '@/components/CommentCard';
import UsersListModal from '@/components/UsersListModal';
import FriendshipButton from '@/components/FriendshipButton';
import MessageUserModal from '@/components/MessageUserModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import Link from 'next/link';
import { 
  Link as LinkIcon, 
  Calendar, 
  MapPin, 
  Edit3, 
  FileText, 
  Heart, 
  MessageCircle, 
  MessageSquare, 
  UserMinus, 
  ShieldAlert,
  Clapperboard, 
  Play,
  Repeat       
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatTimeAgo } from '@/lib/time-ago';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants'; // <--- Импорт константы
import { formatViewsCount } from '@/lib/format-number';

const GET_USER_LIKED_CONTENT = gql`
  query GetUserLikedContent($id: Int!) {
    user(id: $id) {
      id
      # --- ДОБАВЛЕНО: Лайкнутые вайбы ---
      likedVibes {
        id
        videoUrl
        viewsCount
        createdAt
      }
      likedPosts {
        id
        content
        images
        createdAt
        likesCount
        commentsCount
        repostsCount
        isLikedByUser
        commentsDisabled
        isPinned
        vibe { id videoUrl author { id username name avatar } }
        originalPost {
          id
          content
          images
          createdAt
          vibe { id videoUrl author { id username name avatar } }
          author { id username name avatar }
          poll { id question endDate isAnonymous allowMultipleVotes allowRevote options { id text votesCount } }
        }
        author { id username name avatar }
        poll { id question endDate isAnonymous allowMultipleVotes allowRevote options { id text votesCount } }
      }
      likedComments {
        id
        content
        createdAt
        likesCount
        dislikesCount
        score
        userVote
        author { id username name avatar }
        post { id content images }
      }
    }
  }
`;

const GET_USER_PROFILE = gql`
  query GetUserProfile($id: Int!) {
    user(id: $id) {
      id
      username
      name
      bio
      location
      gender
      website
      avatar
      banner
      createdAt
      
      postsCount
      friendsCount
      subscriptionsCount
      followersCount

      isOnline
      lastOnlineAt

      friendshipStatus
      sentFriendRequestId
      receivedFriendRequestId

      amIBlocked
      isBlockedByMe

      vibes {
        id
        videoUrl
        viewsCount
        likesCount      # <-- ДОБАВИТЬ
        commentsCount   # <-- ДОБАВИТЬ
        repostsCount    # <-- ДОБАВИТЬ
        createdAt
      }

      posts {
        id
        content
        images
        createdAt
        likesCount
        commentsCount
        repostsCount
        isLikedByUser
        commentsDisabled
        isPinned
        vibe { id videoUrl author { id username name avatar } }
        originalPost {
          id
          content
          images
          createdAt
          vibe { id videoUrl author { id username name avatar } }
          author { id username name avatar }
          poll { id question endDate isAnonymous allowMultipleVotes allowRevote options { id text votesCount } }
        }
        author { id username name avatar }
        poll { id question endDate isAnonymous allowMultipleVotes allowRevote options { id text votesCount } }
      }
    }
    me {
      id
    }
  }
`;

const BLOCK_USER = gql`mutation BlockUser($targetId: Int!) { blockUser(targetId: $targetId) }`;
const UNBLOCK_USER = gql`mutation UnblockUser($targetId: Int!) { unblockUser(targetId: $targetId) }`;

interface PostData { id: number; content?: string; images?: string[]; createdAt: string; likesCount: number; commentsCount: number; commentsDisabled: boolean; repostsCount: number; isPinned: boolean; isLikedByUser: boolean; originalPost?: any; author: { id: number; username: string; name?: string; avatar?: string; }; poll?: any; vibe?: { id: number; videoUrl: string }; }
interface VibeData { 
  id: number; 
  videoUrl: string; 
  viewsCount: number; 
  likesCount: number;     // <-- ДОБАВИТЬ
  commentsCount: number;  // <-- ДОБАВИТЬ
  repostsCount: number;   // <-- ДОБАВИТЬ
  createdAt: string; 
}

interface CommentData { id: number; content: string; createdAt: string; likesCount: number; dislikesCount: number; score: number; userVote?: 'LIKE' | 'DISLIKE'; author: { id: number; username: string; name?: string; avatar?: string; }; post: { id: number; content?: string; images?: string[]; }; }

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { isDarkMode } = useTheme();
  const { socket } = useSocket();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'vibes' | 'likes'>('posts');
  // Добавили 'vibes' в понравившееся
  const [likedTab, setLikedTab] = useState<'posts' | 'vibes' | 'comments'>('posts');

  const [usersListType, setUsersListType] = useState<'friends' | 'subscriptions' | 'followers' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [isMessageUserModalOpen, setIsMessageUserModalOpen] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false); 

  const { id } = use(params);
  const userId = Number(id);

  const { data, loading, error, refetch: refetchProfile } = useQuery(GET_USER_PROFILE, {
    variables: { id: userId },
    skip: !Number.isFinite(userId),
    fetchPolicy: 'cache-and-network',
  });

  const { data: likedContentData, refetch: refetchLikedContent } = useQuery<{ user: { likedPosts: PostData[]; likedComments: CommentData[]; likedVibes: VibeData[] } }>(GET_USER_LIKED_CONTENT, {
    variables: { id: userId },
    skip: activeTab !== 'likes' || !Number.isFinite(userId),
    fetchPolicy: 'network-only',
  });

  const [blockUser] = useMutation(BLOCK_USER, { onCompleted: () => { refetchProfile(); refetchLikedContent(); } });
  const [unblockUser] = useMutation(UNBLOCK_USER, { onCompleted: () => { refetchProfile(); refetchLikedContent(); } });

  const handleContentUpdate = async () => {
    await refetchProfile();
    if (activeTab === 'likes') {
       await refetchLikedContent();
    }
  };

  const user = data?.user;
  const currentUser = data?.me;
  const posts = user?.posts || [];
  const likedPosts = likedContentData?.user?.likedPosts || [];
  const likedComments = likedContentData?.user?.likedComments || [];
  const likedVibes = likedContentData?.user?.likedVibes || []; // Извлекли лайкнутые вайбы

  const isBlocked = user?.amIBlocked || user?.isBlockedByMe;

  const handleBlockAction = () => {
      if (user.isBlockedByMe) {
          unblockUser({ variables: { targetId: user.id } });
      } else {
          setShowBlockConfirm(true);
      }
  };

  const confirmBlock = () => {
      blockUser({ variables: { targetId: user.id } });
      setShowBlockConfirm(false);
  };

  useEffect(() => {
    if (user && currentUser && user.id === currentUser.id) {
      router.push('/dashboard');
    }
  }, [user, currentUser, router]);

  useEffect(() => {
    if (!socket || !userId) return;
    socket.emit('join_profile_room', { userId });
    
    const handleProfileUpdate = () => refetchProfile();
    const handleLikedContentUpdate = () => refetchLikedContent();
    const handleBlockUpdate = (data: { targetId: number }) => {
        if (data.targetId === userId) refetchProfile();
    };

    socket.on('profile_posts_updated', handleProfileUpdate);
    socket.on('friendship_update', handleProfileUpdate);
    socket.on('liked_content_updated', handleLikedContentUpdate);
    socket.on('profile_update_required', handleBlockUpdate); 

    return () => {
        socket.emit('leave_profile_room', { userId });
        socket.off('profile_posts_updated', handleProfileUpdate);
        socket.off('friendship_update', handleProfileUpdate);
        socket.off('liked_content_updated', handleLikedContentUpdate);
        socket.off('profile_update_required', handleBlockUpdate); 
    };
  }, [socket, userId, refetchProfile, refetchLikedContent]);

  useEffect(() => {
    if (!user) return;
    const updateStatus = () => {
      if (user.amIBlocked) { 
          setStatusText('Был(а) в сети давно');
      } else if (user.isOnline) {
        setStatusText('Онлайн');
      } else if (user.lastOnlineAt) {
        setStatusText(`Был(а) в сети ${formatTimeAgo(user.lastOnlineAt)}`);
      } else {
        setStatusText('Был(а) в сети давно');
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [user?.isOnline, user?.lastOnlineAt, user?.amIBlocked]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  const profileTabs = [
    { id: 'posts', label: 'Публикации', icon: FileText, count: user?.postsCount || 0 },
    { id: 'vibes', label: 'Вайбы', icon: Clapperboard, count: user?.vibes?.length || 0 }, 
    { id: 'likes', label: 'Понравилось', icon: Heart, count: likedPosts.length + likedComments.length + likedVibes.length },
  ];

  const likedTabsList = [
    { id: 'posts', label: 'Посты', icon: FileText, count: likedPosts.length },
    { id: 'vibes', label: 'Вайбы', icon: Clapperboard, count: likedVibes.length }, // Добавили вкладку
    { id: 'comments', label: 'Комментарии', icon: MessageCircle, count: likedComments.length },
  ];

  // Стили Жидкого стекла
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

  if (!Number.isFinite(userId) || (user && currentUser && user.id === currentUser.id)) {
    return <LoadingScreen />;
  }
  if (loading) return <LoadingScreen />;
  
  if (error || !user) {
    return (
      <div className={`min-h-screen p-10 flex flex-col items-center justify-center ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
        <h2 className="text-xl font-bold mb-2">Пользователь не найден</h2>
        <p className="text-zinc-500">Возможно, профиль был удален или ссылка неверна.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      {/* CSS-Стили для кнопок Liquid Glass */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Скрытие скроллбара, чтобы избежать его мелькания */
        .profile-liquid-switcher::-webkit-scrollbar, .liked-liquid-switcher::-webkit-scrollbar { display: none; }
        .profile-liquid-switcher, .liked-liquid-switcher { -ms-overflow-style: none; scrollbar-width: none; }

        .profile-liquid-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 52px;
          box-sizing: border-box;
          padding: 6px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#profile-switcher-filter-user) saturate(var(--saturation));
          -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent), 
            inset -2px -2px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 80%), transparent);
          overflow-x: auto; 
        }

        .profile-liquid-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 16px;
          border-radius: 99em;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms;
          white-space: nowrap;
        }

        .profile-liquid-option:hover { color: var(--c-action); }
        .profile-liquid-option[data-active="true"] { color: var(--c-content); cursor: default; }

        .profile-liquid-blob {
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent);
        }

        .liked-liquid-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 48px;
          box-sizing: border-box;
          padding: 4px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 10%, transparent);
          backdrop-filter: blur(8px) url(#liked-switcher-filter-user) saturate(var(--saturation));
          -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
          overflow-x: auto;
        }
        
        .liked-liquid-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 16px;
          border-radius: 99em;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms;
          white-space: nowrap;
        }
        .liked-liquid-option:hover { color: var(--c-action); }
        .liked-liquid-option[data-active="true"] { color: var(--c-content); cursor: default; }

        .liked-liquid-blob {
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent);
        }
      `}} />

      {/* SVG фильтры для искажения */}
      <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
        <svg>
          <filter id="profile-switcher-filter-user" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64} />
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap 
              id="disp1" 
              in="blur" 
              in2="map" 
              scale="0.5" 
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </svg>
        <svg>
          <filter id="liked-switcher-filter-user" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64} />
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap 
              id="disp2" 
              in="blur" 
              in2="map" 
              scale="0.5" 
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </svg>
      </div>

      <div className="h-48 md:h-64 w-full relative">
        {user.banner ? (
          <img src={user.banner} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className={`w-full h-full ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="lg:w-1/3 xl:w-1/4 relative -mt-16 lg:-mt-20 z-10 mb-8 lg:mb-0">
            <div className="mb-4 relative inline-block">
              <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
                <Avatar username={user.username} name={user.name} url={user.avatar} size="2xl" className="w-32 h-32 md:w-40 md:h-40 text-6xl" />
              </div>
            </div>
            <div className="mb-4">
              <h1 className="text-2xl font-bold leading-tight">{user.name || user.username}</h1>
              <p className={`text-sm font-medium mt-2 mb-1 ${user.isOnline && !user.amIBlocked ? 'text-lime-500' : 'text-zinc-500'}`}>{statusText}</p>
              <p className={`text-base ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>@{user.username.toLowerCase()}</p>
            </div>
            
            {!isBlocked && (
                <>
                    {user.bio && (<p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">{user.bio}</p>)}
                    <div className={`flex flex-col gap-2 mb-6 text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {user.location && <div className="flex items-center gap-2"><MapPin size={16} /><span>{user.location}</span></div>}
                    {user.website && <div className="flex items-center gap-2"><LinkIcon size={16} /> <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline truncate">{user.website.replace(/^(https?:\/\/)?(www\.)?/, '')}</a></div>}
                    {user.createdAt && <div className="flex items-center gap-2"><Calendar size={16} /><span>Регистрация: {formatDate(user.createdAt)}</span></div>}
                    </div>
                    <div className="flex gap-4 mb-6 text-sm">
                        <button onClick={() => setUsersListType('subscriptions')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity"><span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.subscriptionsCount ?? 0}</span><span className="text-zinc-500">Подписки</span></button>
                        <button onClick={() => setUsersListType('followers')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity"><span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.followersCount ?? 0}</span><span className="text-zinc-500">Подписчики</span></button>
                        <button onClick={() => setUsersListType('friends')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity"><span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user.friendsCount ?? 0}</span><span className="text-zinc-500">Друзья</span></button>
                    </div>
                </>
            )}

            <div className="mt-4 space-y-3">
              {currentUser && user.id !== currentUser.id && !isBlocked && (
                <>
                    <FriendshipButton status={user.friendshipStatus} targetUserId={user.id} sentRequestId={user.sentFriendRequestId} receivedRequestId={user.receivedFriendRequestId} onUpdate={refetchProfile} />
                    <button
                        onClick={() => router.push(`/dashboard/messages?userId=${user.id}`)}
                        className={`cursor-pointer w-full py-2.5 px-4 rounded-full font-bold text-sm transition-all border flex items-center justify-center gap-2
                            ${isDarkMode ? 'bg-blue-900/20 border-blue-500/50 text-blue-400 hover:bg-blue-900/30' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}
                        `}
                    >
                        <MessageSquare size={16} />
                        Написать сообщение
                    </button>
                </>
              )}
              
              {currentUser && user.id !== currentUser.id && (
                  <button
                    onClick={handleBlockAction}
                    className={`cursor-pointer w-full py-2.5 px-4 rounded-full font-bold text-sm transition-all border flex items-center justify-center gap-2
                        ${user.isBlockedByMe 
                            ? (isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200')
                            : (isDarkMode ? 'bg-red-900/10 border-red-900/20 text-red-400 hover:bg-red-900/20' : 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100')
                        }
                    `}
                  >
                      {user.isBlockedByMe ? (
                          <>Разблокировать</>
                      ) : (
                          <><UserMinus size={16} /> Заблокировать</>
                      )}
                  </button>
              )}
            </div>
          </div>

          <div className="flex-1 lg:mt-4">
            
            {isBlocked ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`flex flex-col items-center justify-center py-20 text-center rounded-3xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                    <div className={`p-4 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-400'}`}>
                        <ShieldAlert size={48} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Доступ ограничен</h3>
                    <p className="text-zinc-500 max-w-sm">
                        {user.isBlockedByMe 
                            ? "Вы заблокировали этого пользователя." 
                            : "Вы не можете просматривать профиль этого пользователя."}
                    </p>
                </motion.div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        {/* --- ИСПОЛЬЗУЕМ НОВЫЙ СТИЛЬ ВКЛАДОК --- */}
                        <div className="profile-liquid-switcher" style={liquidGlassStyles}>
                          {profileTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                              <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className="profile-liquid-option relative cursor-pointer"
                                data-active={isActive}
                              >
                                {isActive && (
                                  <motion.div
                                    layoutId="profile-active-blob-user"
                                    className="profile-liquid-blob absolute inset-0 z-0"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                  />
                                )}
                                
                                <div className="relative z-10 flex items-center justify-center gap-2">
                                  <span className="whitespace-nowrap">{tab.label}</span>
                                  {tab.count > 0 && (
                                     <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] bg-lime-400 text-black rounded-full font-bold shadow">
                                        {tab.count}
                                     </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                    </div>

                    {activeTab === 'posts' && (
                        posts.length > 0 ? (
                            <div>
                                {posts.map((post: any) => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post} 
                                        currentUserId={currentUser?.id || 0} 
                                        onEdit={() => {}} 
                                        onUpdate={handleContentUpdate}
                                    />
                                ))}
                            </div>
                        ) : (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-12 text-center opacity-70">
                                <div className={`inline-block p-4 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                                    <Edit3 size={32} className="text-zinc-400" />
                                </div>
                                <p>Пользователь пока ничего не опубликовал</p>
                            </motion.div>
                        )
                    )}

                    {/* --- ДОБАВЛЕН РЕНДЕРИНГ ВАЙБОВ --- */}
                    {activeTab === 'vibes' && (
                      <div className="animate-in fade-in duration-500">
                        
                        {/* Панель статистики */}
                        {user?.vibes && user.vibes.length > 0 && (
                          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                <Play size={14} className="text-lime-500" /> Просмотры
                              </div>
                              <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum: number, v: VibeData) => sum + v.viewsCount, 0))}</span>
                            </div>
                            <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                <Heart size={14} className="text-red-500" /> Лайки
                              </div>
                              <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum: number, v: VibeData) => sum + v.likesCount, 0))}</span>
                            </div>
                            <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                <MessageCircle size={14} className="text-blue-500" /> Комменты
                              </div>
                              <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum: number, v: VibeData) => sum + v.commentsCount, 0))}</span>
                            </div>
                            <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                <Repeat size={14} className="text-green-500" /> Репосты
                              </div>
                              <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum: number, v: VibeData) => sum + v.repostsCount, 0))}</span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-1 md:gap-4">
                          {user?.vibes?.map((vibe: any) => (
                            <Link 
                              key={vibe.id} 
                              href={`/dashboard/vibes?vibeId=${vibe.id}`} 
                              className="relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden group hover:ring-2 hover:ring-lime-400 transition-all cursor-pointer block"
                            >
                              <video 
                                src={vibe.videoUrl.startsWith('http') ? vibe.videoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${vibe.videoUrl}`} 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                              />
                              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
                                <Play size={12} fill="currentColor" />
                                {formatViewsCount(vibe.viewsCount)}
                              </div>
                            </Link>
                          ))}
                          {(!user?.vibes || user.vibes.length === 0) && (
                            <div className="col-span-3 py-20 text-center text-zinc-500">Пользователь еще не загружал вайбы</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {activeTab === 'likes' && (
                        <div className="space-y-6 pb-10"> 
                            {/* --- ВКЛАДКИ ДЛЯ ЛАЙКОВ ТАКЖЕ В СТИЛЕ LIQUID GLASS --- */}
                            <div className="liked-liquid-switcher mb-4" style={liquidGlassStyles}>
                              {likedTabsList.map((tab) => {
                                const isActive = likedTab === tab.id;
                                return (
                                  <button 
                                    key={tab.id}
                                    onClick={() => setLikedTab(tab.id as any)}
                                    className="liked-liquid-option relative cursor-pointer"
                                    data-active={isActive}
                                  >
                                    {isActive && (
                                      <motion.div
                                        layoutId="liked-active-blob-user"
                                        className="liked-liquid-blob absolute inset-0 z-0"
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                      />
                                    )}
                                    
                                    <div className="relative z-10 flex items-center justify-center gap-2">
                                      <tab.icon size={16} />
                                      <span className="whitespace-nowrap">{tab.label}</span>
                                      {tab.count > 0 && (
                                        <span className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] rounded-full font-bold shadow ${isActive ? 'bg-lime-400 text-black' : (isDarkMode ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-800')}`}>
                                            {tab.count}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {likedTab === 'posts' && (
                                <div className="space-y-4">
                                    {likedPosts.length > 0 ? (
                                        likedPosts.map((postData) => (
                                            <PostCard 
                                                key={`liked-post-user-${postData.id}`} 
                                                post={postData} 
                                                currentUserId={currentUser?.id || 0} 
                                                onEdit={() => {}}
                                                onUpdate={handleContentUpdate}
                                            />
                                        ))
                                    ) : (
                                        <div className="text-center py-12 opacity-50">
                                            <Heart size={48} className="mx-auto mb-4 text-zinc-600" />
                                            <p>Нет понравившихся публикаций</p>
                                        </div>
                                    )}
                                </div>
                            )}

                             {/* Отображение лайкнутых вайбов */}
                            {likedTab === 'vibes' && (
                                <div className="grid grid-cols-3 gap-1 md:gap-4 animate-in fade-in duration-500">
                                  {likedVibes.map((vibe: any) => (
                                    <Link 
                                      key={`liked-vibe-${vibe.id}`} 
                                      href={`/dashboard/vibes?vibeId=${vibe.id}`} 
                                      className="relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden group hover:ring-2 hover:ring-lime-400 transition-all cursor-pointer block"
                                    >
                                      <video 
                                        src={vibe.videoUrl.startsWith('http') ? vibe.videoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${vibe.videoUrl}`} 
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                                      />
                                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
                                        <Play size={12} fill="currentColor" />
                                        {formatViewsCount(vibe.viewsCount)}
                                      </div>
                                    </Link>
                                  ))}
                                  {likedVibes.length === 0 && (
                                    <div className="col-span-3 py-20 text-center opacity-50">
                                        <Clapperboard size={48} className="mx-auto mb-4 text-zinc-600" />
                                        <p>Нет понравившихся вайбов</p>
                                    </div>
                                  )}
                                </div>
                            )}

                            {likedTab === 'comments' && (
                                <div className="space-y-4">
                                    {likedComments.length > 0 ? (
                                        likedComments.map((commentData) => (
                                            <CommentCard
                                                key={`liked-comment-user-${commentData.id}`}
                                                comment={commentData}
                                                currentUserId={currentUser?.id || 0}
                                                onUpdate={handleContentUpdate}
                                                isDarkMode={isDarkMode}
                                            />
                                        ))
                                    ) : (
                                        <div className="text-center py-12 opacity-50">
                                            <MessageCircle size={48} className="mx-auto mb-4 text-zinc-600" />
                                            <p>Нет понравившихся комментариев</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
          </div>
        </div>
      </div>

      {/* МОДАЛКИ (оставлены без изменений) */}
      <ConfirmationModal 
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={confirmBlock}
        title="Заблокировать пользователя?"
        message="Этот пользователь не сможет писать вам сообщения, а вы не будете видеть его контент."
      />

      {usersListType && <UsersListModal isOpen={!!usersListType} onClose={() => setUsersListType(null)} userId={user.id} type={usersListType} />}
      {isMessageUserModalOpen && <MessageUserModal isOpen={isMessageUserModalOpen} onClose={() => setIsMessageUserModalOpen(false)} currentUserId={currentUser?.id || 0} />}

    </div>
  );
}