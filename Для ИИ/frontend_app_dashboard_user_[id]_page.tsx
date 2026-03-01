// frontend/app/dashboard/user/[id]/page.tsx
'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, UserMinus, ShieldAlert, Edit3 } from 'lucide-react';
import { gql, useQuery, useMutation } from '@apollo/client';

import { useTheme } from '@/context/ThemeContext';
import { useSocket } from '@/context/SocketContext';
import { formatTimeAgo } from '@/lib/time-ago';

import LoadingScreen from '@/components/LoadingScreen';
import PostCard from '@/components/PostCard';
import UsersListModal from '@/components/UsersListModal';
import FriendshipButton from '@/components/FriendshipButton';
import ConfirmationModal from '@/components/ConfirmationModal';
import MessageUserModal from '@/components/MessageUserModal';

// Импорт вынесенных модулей профиля
import ProfileBanner from '@/components/profile/ProfileBanner';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import ProfileTabs from '@/components/profile/ProfileTabs';
import VibesGrid from '@/components/profile/VibesGrid';
import LikedContent from '@/components/profile/LikedContent';

// --- GRAPHQL ЗАПРОСЫ ---

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
        likesCount
        commentsCount
        repostsCount
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

const GET_USER_LIKED_CONTENT = gql`
  query GetUserLikedContent($id: Int!) {
    user(id: $id) {
      id
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

const BLOCK_USER = gql`mutation BlockUser($targetId: Int!) { blockUser(targetId: $targetId) }`;
const UNBLOCK_USER = gql`mutation UnblockUser($targetId: Int!) { unblockUser(targetId: $targetId) }`;

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { isDarkMode } = useTheme();
  const { socket } = useSocket();
  const router = useRouter();
  
  // Состояния
  const [activeTab, setActiveTab] = useState<'posts' | 'vibes' | 'likes'>('posts');
  const [usersListType, setUsersListType] = useState<'friends' | 'subscriptions' | 'followers' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [showBlockConfirm, setShowBlockConfirm] = useState(false); 
  const [isMessageUserModalOpen, setIsMessageUserModalOpen] = useState(false);

  // Извлечение ID
  const { id } = use(params);
  const userId = Number(id);

  // Запросы
  const { data, loading, error, refetch: refetchProfile } = useQuery(GET_USER_PROFILE, {
    variables: { id: userId },
    skip: !Number.isFinite(userId),
    fetchPolicy: 'cache-and-network',
  });

  const { data: likedContentData, refetch: refetchLikedContent } = useQuery(GET_USER_LIKED_CONTENT, {
    variables: { id: userId },
    skip: activeTab !== 'likes' || !Number.isFinite(userId),
    fetchPolicy: 'network-only',
  });

  // Мутации
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
  const isBlocked = user?.amIBlocked || user?.isBlockedByMe;

  // Если зашли на свой профиль через URL, кидаем на /dashboard
  useEffect(() => {
    if (user && currentUser && user.id === currentUser.id) {
      router.push('/dashboard');
    }
  }, [user, currentUser, router]);

  // Обработка блокировки
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

  // Сокеты
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

  // Статус "Был в сети"
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

  // Рендер состояний загрузки
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

  const profileTabs = [
    { id: 'posts', label: 'Публикации', count: user?.postsCount || 0 },
    { id: 'vibes', label: 'Вайбы', count: user?.vibes?.length || 0 }, 
    { id: 'likes', label: 'Понравилось', count: (likedContentData?.user?.likedPosts?.length || 0) + (likedContentData?.user?.likedComments?.length || 0) + (likedContentData?.user?.likedVibes?.length || 0) },
  ];

  // Кнопки действий для боковой панели
  const actionButtons = currentUser && user.id !== currentUser.id && (
    <>
        {!isBlocked && (
            <>
                <FriendshipButton 
                    status={user.friendshipStatus} 
                    targetUserId={user.id} 
                    sentRequestId={user.sentFriendRequestId} 
                    receivedRequestId={user.receivedFriendRequestId} 
                    onUpdate={refetchProfile} 
                />
                <button
                    onClick={() => router.push(`/dashboard/messages?userId=${user.id}`)}
                    className={`cursor-pointer w-full py-2.5 px-4 rounded-full font-bold text-sm transition-all border flex items-center justify-center gap-2 ${isDarkMode ? 'bg-blue-900/20 border-blue-500/50 text-blue-400 hover:bg-blue-900/30' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'}`}
                >
                    <MessageSquare size={16} /> Написать сообщение
                </button>
            </>
        )}
        <button
            onClick={handleBlockAction}
            className={`cursor-pointer w-full py-2.5 px-4 rounded-full font-bold text-sm transition-all border flex items-center justify-center gap-2
                ${user.isBlockedByMe 
                    ? (isDarkMode ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200')
                    : (isDarkMode ? 'bg-red-900/10 border-red-900/20 text-red-400 hover:bg-red-900/20' : 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100')}`}
        >
            {user.isBlockedByMe ? 'Разблокировать' : <><UserMinus size={16} /> Заблокировать</>}
        </button>
    </>
  );

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      {/* Верхний баннер и аватар */}
      <ProfileBanner user={user} isMyProfile={false} />

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Левая панель */}
          <ProfileSidebar 
            user={user} 
            statusText={statusText} 
            onOpenUsersList={setUsersListType} 
            actionButtons={actionButtons} 
          />

          {/* Правая панель с контентом */}
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
                        <ProfileTabs tabs={profileTabs} activeTab={activeTab} onChange={setActiveTab} prefixId="user-profile" />
                    </div>

                    {/* Вкладка: Публикации */}
                    {activeTab === 'posts' && (
                        user.posts?.length > 0 ? (
                            <div className="space-y-4">
                                {user.posts.map((post: any) => (
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

                    {/* Вкладка: Вайбы */}
                    {activeTab === 'vibes' && (
                        <VibesGrid 
                          vibes={user.vibes} 
                          emptyMessage="Пользователь еще не загружал вайбы."
                        />
                    )}

                    {/* Вкладка: Понравилось */}
                    {activeTab === 'likes' && (
                        <LikedContent 
                           likedPosts={likedContentData?.user?.likedPosts || []}
                           likedVibes={likedContentData?.user?.likedVibes || []}
                           likedComments={likedContentData?.user?.likedComments || []}
                           currentUserId={currentUser?.id || 0}
                           onUpdate={refetchLikedContent}
                        />
                    )}
                </>
            )}
          </div>
        </div>
      </div>

      {/* Модалки для чужого профиля */}
      <ConfirmationModal 
        isOpen={showBlockConfirm} 
        onClose={() => setShowBlockConfirm(false)} 
        onConfirm={confirmBlock} 
        title="Заблокировать?" 
        message="Пользователь не сможет вам писать, а вы не будете видеть его контент." 
      />
      {usersListType && <UsersListModal isOpen={!!usersListType} onClose={() => setUsersListType(null)} userId={user.id} type={usersListType} />}
      {isMessageUserModalOpen && <MessageUserModal isOpen={isMessageUserModalOpen} onClose={() => setIsMessageUserModalOpen(false)} currentUserId={currentUser?.id || 0} />}

    </div>
  );
}