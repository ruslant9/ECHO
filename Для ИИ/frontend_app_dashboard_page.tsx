// frontend/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Edit3, Clock } from 'lucide-react';
import { gql, useQuery, useMutation } from '@apollo/client';
import Cookies from 'js-cookie';

import { useTheme } from '@/context/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import EditProfileModal from '@/components/EditProfileModal';
import EditImagesModal from '@/components/EditImagesModal';
import CreatePostModal from '@/components/CreatePostModal';
import EditPostModal from '@/components/EditPostModal';
import UsersListModal from '@/components/UsersListModal';
import PostCard from '@/components/PostCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import Toast from '@/components/Toast';

// Импорт вынесенных модулей профиля
import ProfileBanner from '@/components/profile/ProfileBanner';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import ProfileTabs from '@/components/profile/ProfileTabs';
import VibesGrid from '@/components/profile/VibesGrid';
import LikedContent from '@/components/profile/LikedContent';

// --- GRAPHQL ЗАПРОСЫ ---

const GET_MY_PROFILE_AND_POSTS = gql`
  query GetMyProfileAndPosts {
    me {
      id
      username
      name
      email
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

      vibes {
        id
        videoUrl
        viewsCount
        likesCount
        commentsCount
        repostsCount
        createdAt
        isPrivate
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
  }
`;

const GET_LIKED_CONTENT = gql`
  query GetLikedContent {
    me {
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

const GET_MY_SCHEDULED_POSTS = gql`
  query GetMyScheduledPosts {
    myScheduledPosts {
      id
      content
      images
      createdAt
      scheduledAt
      isPublished
      commentsDisabled
      isPinned
      likesCount
      commentsCount
      repostsCount
      isLikedByUser
      author { id username name avatar }
      poll { id question endDate isAnonymous allowMultipleVotes allowRevote options { id text votesCount } }
    }
  }
`;

const DELETE_VIBE = gql`
  mutation DeleteVibe($vibeId: Int!) {
    deleteVibe(vibeId: $vibeId)
  }
`;

export default function Dashboard() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  
  // Состояния вкладок
  const [activeTab, setActiveTab] = useState<'posts' | 'vibes' | 'scheduled' | 'likes'>('posts');
  const [usersListType, setUsersListType] = useState<'friends' | 'subscriptions' | 'followers' | null>(null);
  
  // Состояния модалок
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditImagesModalOpen, setIsEditImagesModalOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  
  const [postToEdit, setPostToEdit] = useState<any>(null);
  const [vibeToDelete, setVibeToDelete] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Редирект, если нет токена
  useEffect(() => {
    if (!Cookies.get('token')) {
      router.push('/');
    }
  }, [router]);

  // Запросы
  const { data, loading, error, refetch } = useQuery(GET_MY_PROFILE_AND_POSTS, { 
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error("Auth error:", err.message);
      Cookies.remove('token');
      Cookies.remove('user');
      router.push('/');
    }
  });

  const { data: likedContentData, refetch: refetchLikedContent } = useQuery(GET_LIKED_CONTENT, { 
    skip: activeTab !== 'likes', 
    fetchPolicy: 'network-only' 
  });

  const { data: scheduledData, refetch: refetchScheduled } = useQuery(GET_MY_SCHEDULED_POSTS, { 
    skip: activeTab !== 'scheduled', 
    fetchPolicy: 'network-only' 
  });

  // Мутации
  const [deleteVibeMutation] = useMutation(DELETE_VIBE, {
    onCompleted: () => {
      setToast({ message: 'Вайб успешно удален', type: 'success' });
      setVibeToDelete(null);
      refetch(); 
    },
    onError: (err) => {
      setToast({ message: err.message || 'Ошибка при удалении', type: 'error' });
      setVibeToDelete(null);
    }
  });

  const refetchAll = () => {
    refetch();
    refetchLikedContent();
    refetchScheduled();
  };

  const openEditPostModal = (post: any) => {
    setPostToEdit(post);
    setIsEditPostModalOpen(true);
  };

  // Данные
  const user = data?.me;
  const posts = user?.posts || [];
  const scheduledPosts = scheduledData?.myScheduledPosts || [];

  if (loading || !user) return <LoadingScreen />;
  if (error) return <div className="p-10 text-center text-red-500">Ошибка загрузки профиля</div>;

  const profileTabs = [
    { id: 'posts', label: 'Публикации', count: user?.postsCount || 0 },
    { id: 'vibes', label: 'Вайбы', count: user?.vibes?.length || 0 }, 
    { id: 'scheduled', label: 'Отложенные', count: scheduledPosts.length },
    { id: 'likes', label: 'Понравилось' },
  ];

  const editButton = (
    <button 
      onClick={() => setIsEditProfileModalOpen(true)} 
      className={`cursor-pointer w-full py-2.5 rounded-full font-bold text-sm transition-all border 
        ${isDarkMode ? 'border-zinc-600 hover:bg-zinc-800 text-white' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-900'}`}
    >
      Редактировать профиль
    </button>
  );

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      {/* Тосты и Модалки */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} user={user} isDarkMode={isDarkMode} onSuccess={refetchAll} />
      <EditImagesModal isOpen={isEditImagesModalOpen} onClose={() => setIsEditImagesModalOpen(false)} user={user} isDarkMode={isDarkMode} onSuccess={refetchAll} />
      <CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => setIsCreatePostModalOpen(false)} onSuccess={refetchAll} user={user} />
      <EditPostModal isOpen={isEditPostModalOpen} onClose={() => setIsEditPostModalOpen(false)} onSuccess={refetchAll} post={postToEdit} />
      
      {usersListType && user && <UsersListModal isOpen={!!usersListType} onClose={() => setUsersListType(null)} userId={user.id} type={usersListType} />}
      
      <ConfirmationModal 
        isOpen={vibeToDelete !== null} 
        onClose={() => setVibeToDelete(null)} 
        onConfirm={() => vibeToDelete && deleteVibeMutation({ variables: { vibeId: vibeToDelete } })} 
        title="Удалить вайб?" 
        message="Видео и все комментарии к нему будут безвозвратно удалены." 
      />

      {/* Верхний баннер и аватар */}
      <ProfileBanner 
        user={user} 
        isMyProfile={true} 
        onEditBannerClick={() => setIsEditImagesModalOpen(true)} 
      />

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Левая панель с инфо */}
          <ProfileSidebar 
            user={user} 
            onOpenUsersList={setUsersListType} 
            actionButtons={editButton} 
          />

          {/* Правая панель с контентом */}
          <div className="flex-1 lg:mt-4">
            
            <div className="flex justify-between items-center mb-6">
                <ProfileTabs tabs={profileTabs} activeTab={activeTab} onChange={setActiveTab} prefixId="my-profile" />
                
                <button
                    onClick={() => setIsCreatePostModalOpen(true)}
                    className="cursor-pointer px-6 py-3 bg-lime-400 text-black rounded-full font-bold hover:bg-lime-500 transition-colors flex items-center gap-2 shadow-lg shadow-lime-500/20"
                >
                    <Plus size={20} /> Создать
                </button>
            </div>

            {/* Вкладка: Публикации */}
            {activeTab === 'posts' && (
              posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post: any) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      currentUserId={user.id} 
                      onEdit={() => openEditPostModal(post)}
                      onUpdate={refetchAll}
                    />
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-12 text-center opacity-70">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                    <div className={`mb-6 p-4 rounded-full ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                      <Edit3 size={32} className="text-zinc-500"/>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Здесь пока тихо</h3>
                    <p className="text-zinc-500 mb-8 leading-relaxed">
                      Когда вы опубликуете пост, он появится здесь. Это отличное место для ваших мыслей!
                    </p>
                  </div>
                </motion.div>
              )
            )}

            {/* Вкладка: Вайбы */}
            {activeTab === 'vibes' && (
              <VibesGrid 
                vibes={user.vibes} 
                isMyProfile={true} 
                onDeleteVibe={setVibeToDelete} 
                emptyMessage="Вы еще не загрузили ни одного вайба."
              />
            )}

            {/* Вкладка: Отложенные */}
            {activeTab === 'scheduled' && (
              scheduledPosts.length > 0 ? (
                <div className="space-y-4">
                  {scheduledPosts.map((post: any) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      currentUserId={user.id} 
                      onEdit={() => {}} 
                      onUpdate={refetchAll} 
                      isScheduledView={true} 
                    />
                  ))}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-12 text-center opacity-70">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                    <div className={`mb-6 p-4 rounded-full ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                      <Clock size={32} className="text-zinc-500"/>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Нет отложенных постов</h3>
                    <p className="text-zinc-500 mb-8 leading-relaxed">
                        Когда вы запланируете пост, он появится здесь.
                    </p>
                  </div>
                </motion.div>
              )
            )}

            {/* Вкладка: Понравилось */}
            {activeTab === 'likes' && (
               <LikedContent 
                   likedPosts={likedContentData?.me?.likedPosts || []}
                   likedVibes={likedContentData?.me?.likedVibes || []}
                   likedComments={likedContentData?.me?.likedComments || []}
                   currentUserId={user.id}
                   onUpdate={refetchAll}
                />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}