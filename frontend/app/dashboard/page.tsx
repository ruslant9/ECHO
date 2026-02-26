'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImageIcon, Link as LinkIcon, Calendar, MapPin, Edit3, Plus, 
  Heart, MessageCircle, FileText, Clock, Loader, Clapperboard, Play, Trash2, Repeat, Lock
} from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import Avatar from '@/components/Avatar';
import EditProfileModal from '@/components/EditProfileModal';
import EditImagesModal from '@/components/EditImagesModal';
import CreatePostModal from '@/components/CreatePostModal';
import EditPostModal from '@/components/EditPostModal';
import UsersListModal from '@/components/UsersListModal';
import PostCard from '@/components/PostCard';
import CommentCard from '@/components/CommentCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import Cookies from 'js-cookie';
import Toast from '@/components/Toast';
import { getAvatarUrl } from '@/lib/avatar-url'; 
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';
import { formatViewsCount } from '@/lib/format-number';

const DELETE_VIBE = gql`
  mutation DeleteVibe($vibeId: Int!) {
    deleteVibe(vibeId: $vibeId)
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

const UPDATE_PROFILE = gql`
  mutation UpdateProfileForBanner($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      banner
    }
  }
`;

interface PostData {
  id: number;
  content?: string;
  images?: string[];
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  commentsDisabled: boolean;
  repostsCount: number;
  isPinned: boolean;
  isLikedByUser: boolean;
  scheduledAt?: string;
  isPublished?: boolean;
  originalPost?: any;
  author: { id: number; username: string; name?: string; avatar?: string; };
  poll?: any;
}

interface VibeData {
  id: number;
  videoUrl: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
  isPrivate: boolean;
}

interface CommentData {
  id: number;
  content: string;
  createdAt: string;
  likesCount: number;
  dislikesCount: number;
  score: number;
  userVote?: 'LIKE' | 'DISLIKE';
  author: { id: number; username: string; name?: string; avatar?: string; };
  post: { id: number; content?: string; images?: string[]; };
}

interface UserProfile {
  id: number;
  username: string;
  name?: string;
  email: string;
  bio?: string;
  location?: string;
  gender?: string;
  website?: string;
  avatar?: string;
  banner?: string;
  createdAt: string;
  postsCount: number;
  friendsCount: number;
  subscriptionsCount: number;
  followersCount: number;
  posts: PostData[];
  vibes: VibeData[];
}

export default function Dashboard() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'posts' | 'vibes' | 'likes' | 'scheduled'>('posts');
  const [likedTab, setLikedTab] = useState<'posts' | 'vibes' | 'comments'>('posts');

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditImagesModalOpen, setIsEditImagesModalOpen] = useState(false);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<PostData | null>(null);

  const [usersListType, setUsersListType] = useState<'friends' | 'subscriptions' | 'followers' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const openEditPostModal = (post: PostData) => {
    setPostToEdit(post);
    setIsEditPostModalOpen(true);
  };

  const [vibeToDelete, setVibeToDelete] = useState<number | null>(null);
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

  useEffect(() => {
    if (!Cookies.get('token')) {
      router.push('/');
    }
  }, [router]);

  const { data, loading, error, refetch } = useQuery<{ me: UserProfile }>(GET_MY_PROFILE_AND_POSTS, {
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error("Auth error:", err.message);
      Cookies.remove('token');
      Cookies.remove('user');
      router.push('/');
    }
  });

  const { data: likedContentData, refetch: refetchLikedContent } = useQuery<{ me: { likedPosts: PostData[]; likedComments: CommentData[]; likedVibes: VibeData[] } }>(GET_LIKED_CONTENT, {
    skip: activeTab !== 'likes',
    fetchPolicy: 'network-only',
  });

  const { data: scheduledData, refetch: refetchScheduled } = useQuery(GET_MY_SCHEDULED_POSTS, {
    skip: activeTab !== 'scheduled',
    fetchPolicy: 'network-only',
  });

  const [updateProfile] = useMutation(UPDATE_PROFILE, {
    onCompleted: () => {
        setToast({ message: 'Обложка обновлена!', type: 'success' });
        refetch();
    },
    onError: (error) => {
        setToast({ message: error.message, type: 'error' });
        setIsUploading(false);
    }
  });

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      setToast({ message: 'Выберите изображение (JPG, PNG, GIF, WebP).', type: 'error' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Размер файла не должен превышать 5 МБ.', type: 'error' });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    const token = Cookies.get('token');

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}/upload/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Ошибка загрузки изображения.');
        }

        const data = await response.json();
        const { url } = data;

        await updateProfile({ variables: { input: { banner: url } } });

    } catch (error: any) {
        setToast({ message: error.message || 'Не удалось загрузить обложку.', type: 'error' });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const refetchAll = () => {
    refetch();
    refetchLikedContent();
    refetchScheduled();
  };

  const user = data?.me;
  const posts = user?.posts || [];
  const likedPosts = likedContentData?.me?.likedPosts || [];
  const likedComments = likedContentData?.me?.likedComments || [];
  const likedVibes = likedContentData?.me?.likedVibes || [];
  const scheduledPosts = scheduledData?.myScheduledPosts || [];

  const bannerUrl = getAvatarUrl(user?.banner);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  const profileTabs = [
    { id: 'posts', label: 'Публикации', icon: Edit3, count: user?.postsCount || 0 },
    { id: 'vibes', label: 'Вайбы', icon: Clapperboard, count: user?.vibes?.length || 0 }, 
    { id: 'scheduled', label: 'Отложенные', icon: Clock, count: scheduledPosts.length },
    { id: 'likes', label: 'Понравилось', icon: Heart, count: likedPosts.length + likedComments.length + likedVibes.length },
  ];

  const likedTabsList = [
    { id: 'posts', label: 'Посты', icon: FileText, count: likedPosts.length },
    { id: 'vibes', label: 'Вайбы', icon: Clapperboard, count: likedVibes.length },
    { id: 'comments', label: 'Комментарии', icon: MessageCircle, count: likedComments.length },
  ];

  const liquidButtonShadow = {
    backgroundColor: 'color-mix(in srgb, var(--c-glass) 12%, transparent)',
    backdropFilter: 'blur(12px) saturate(var(--saturation))',
    WebkitBackdropFilter: 'blur(12px) saturate(var(--saturation))',
    boxShadow: `
      inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
      inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent), 
      inset -2px -2px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 80%), transparent), 
      inset -3px -8px 1px -6px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 60%), transparent), 
      inset -0.3px -1px 4px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 12%), transparent), 
      inset -1.5px 2.5px 0px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
      0px 4px 16px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 15%), transparent)
    `,
    border: 'none'
  } as React.CSSProperties;

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

  if (loading || !user) return <LoadingScreen />;
  if (error) return <div>Ошибка загрузки профиля...</div>;

  return (
    <div className={`min-h-full pt-0 transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
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
          backdrop-filter: blur(8px) url(#profile-switcher-filter-me) saturate(var(--saturation));
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
          backdrop-filter: blur(8px) url(#liked-switcher-filter) saturate(var(--saturation));
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

      <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
        <svg>
          <filter id="profile-switcher-filter-me" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
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
          <filter id="liked-switcher-filter" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <EditProfileModal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} user={user} isDarkMode={isDarkMode} onSuccess={refetch} />
      <EditImagesModal isOpen={isEditImagesModalOpen} onClose={() => setIsEditImagesModalOpen(false)} user={user} isDarkMode={isDarkMode} onSuccess={refetch} />
      <CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => setIsCreatePostModalOpen(false)} onSuccess={refetchAll} user={user} />
      <EditPostModal isOpen={isEditPostModalOpen} onClose={() => setIsEditPostModalOpen(false)} onSuccess={refetchAll} post={postToEdit} />
      {usersListType && user && <UsersListModal isOpen={!!usersListType} onClose={() => setUsersListType(null)} userId={user.id} type={usersListType} />}

      <div className="h-48 md:h-64 w-full px-4 pt-4">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleBannerUpload}
            accept="image/*"
            className="hidden"
        />

       {bannerUrl ? (
          <div className="relative w-full h-full group">
            <img src={bannerUrl} className="w-full h-full object-cover rounded-xl shadow-sm" alt="Banner" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />
            
           <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
              <button 
                onClick={() => setIsEditImagesModalOpen(true)} 
                style={{...liquidGlassStyles, ...liquidButtonShadow}}
                className="cursor-pointer flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold transition-all
                           text-white hover:scale-105 active:scale-95 group/btn"
              >
                <ImageIcon size={18} className="opacity-80 group-hover/btn:opacity-100 transition-opacity" /> 
                <span className="tracking-wide">Изменить</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`cursor-pointer disabled:cursor-not-allowed w-full h-full flex items-center justify-center border-2 border-dashed rounded-xl transition-colors
                ${isDarkMode 
                    ? 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50' 
                    : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'
                }`}
          >
            {isUploading ? (
              <Loader size={32} className="animate-spin text-lime-500" />
            ) : (
              <div className="text-center text-zinc-500 flex flex-col items-center gap-2">
                  <ImageIcon size={32} />
                  <span className="font-semibold text-sm">Загрузить обложку</span>
              </div>
            )}
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-10 sm:px-8 lg:px-1">
        <div className="flex flex-col lg:flex-row gap-8">

          <div className="lg:w-1/3 xl:w-1/4 relative -mt-16 lg:-mt-20 z-10 mb-8 lg:mb-0">
             <div className="mb-4 relative inline-block">
              <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
                <Avatar username={user?.username} name={user?.name} url={user?.avatar} size="2xl" className="w-32 h-32 md:w-40 md:h-40 text-6xl" />
              </div>
            </div>
            <div className="mb-4">
              <h1 className="text-2xl font-bold leading-tight">{user?.name || user?.username}</h1>
              <p className={`text-base ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>@{user?.username?.toLowerCase()}</p>
            </div>
            {user?.bio && (<p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">{user.bio}</p>)}
            <div className={`flex flex-col gap-2 mb-6 text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {user?.location && <div className="flex items-center gap-2"><MapPin size={16} /><span>{user.location}</span></div>}
              {user?.website && <div className="flex items-center gap-2"><LinkIcon size={16} /> <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline truncate">{user.website.replace(/^(https?:\/\/)?(www\.)?/, '')}</a></div>}
              {user?.createdAt && <div className="flex items-center gap-2"><Calendar size={16} /><span>Регистрация: {formatDate(user.createdAt)}</span></div>}
            </div>
            <div className="flex gap-4 mb-6 text-sm">
              <button onClick={() => setUsersListType('subscriptions')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity"><span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.subscriptionsCount ?? 0}</span><span className="text-zinc-500">Подписки</span></button>
              <button onClick={() => setUsersListType('followers')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity"><span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.followersCount ?? 0}</span><span className="text-zinc-500">Подписчики</span></button>
              <button onClick={() => setUsersListType('friends')} className="cursor-pointer flex gap-1 hover:opacity-70 transition-opacity"><span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{user?.friendsCount ?? 0}</span><span className="text-zinc-500">Друзья</span></button>
            </div>
            <button onClick={() => setIsEditProfileModalOpen(true)} className={`cursor-pointer w-full py-2.5 rounded-full font-bold text-sm transition-all border ${isDarkMode ? 'border-zinc-600 hover:bg-zinc-800 text-white' : 'border-zinc-300 hover:bg-zinc-100 text-zinc-900'}`}>Редактировать профиль</button>
          </div>

          <div className="flex-1 lg:mt-4">
            
            <div className="flex justify-between items-center mb-6">
                
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
                            layoutId="profile-active-blob"
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

                <button
                    onClick={() => setIsCreatePostModalOpen(true)}
                    className="cursor-pointer px-6 py-3 bg-lime-400 text-black rounded-full font-bold hover:bg-lime-500 transition-colors flex items-center gap-2 shadow-lg shadow-lime-500/20"
                >
                    <Plus size={20} /> Создать пост
                </button>
            </div>

            {activeTab === 'posts' && (
              posts.length > 0 ? (
                <div>
                  {posts.map(post => (
                    <PostCard 
                        key={post.id} 
                        post={post} 
                        currentUserId={user.id} 
                        onEdit={() => openEditPostModal(post as any)}
                        onUpdate={refetch}
                    />
                  ))}
                </div>
              ) : (
                <motion.div key="no-posts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-8 text-center">
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

            <ConfirmationModal
              isOpen={vibeToDelete !== null}
              onClose={() => setVibeToDelete(null)}
              onConfirm={() => {
                if (vibeToDelete) deleteVibeMutation({ variables: { vibeId: vibeToDelete } });
              }}
              title="Удалить вайб?"
              message="Видео и все комментарии к нему будут безвозвратно удалены."
            />

           {activeTab === 'vibes' && (
              <div className="animate-in fade-in duration-500">
                
                {user?.vibes && user.vibes.length > 0 && (
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <Play size={14} className="text-lime-500" /> Просмотры
                      </div>
                      <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum, v) => sum + v.viewsCount, 0))}</span>
                    </div>
                    <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <Heart size={14} className="text-red-500" /> Лайки
                      </div>
                      <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum, v) => sum + v.likesCount, 0))}</span>
                    </div>
                    <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <MessageCircle size={14} className="text-blue-500" /> Комменты
                      </div>
                      <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum, v) => sum + v.commentsCount, 0))}</span>
                    </div>
                    <div className={`p-4 rounded-[20px] border flex flex-col gap-1 transition-colors ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-zinc-50 border-black/5'}`}>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                        <Repeat size={14} className="text-green-500" /> Репосты
                      </div>
                      <span className="text-2xl">{formatViewsCount(user.vibes.reduce((sum, v) => sum + v.repostsCount, 0))}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {user?.vibes?.map((vibe: VibeData) => (
                    <div 
                      key={vibe.id} 
                      className="relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden group hover:ring-2 hover:ring-lime-400 transition-all"
                    >
                      <Link href={`/dashboard/vibes?vibeId=${vibe.id}`} className="block w-full h-full cursor-pointer">
                        <video 
                          src={vibe.videoUrl.startsWith('http') ? vibe.videoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${vibe.videoUrl}`} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                        />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md">
                          <Play size={12} fill="currentColor" />
                          {formatViewsCount(vibe.viewsCount)}
                        </div>
                        {vibe.isPrivate && (
                            <div className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded-full backdrop-blur-sm z-10" title="Приватное видео">
                                <Lock size={12} />
                            </div>
                        )}
                      </Link>

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setVibeToDelete(vibe.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:scale-110 transition-all z-10 cursor-pointer"
                        title="Удалить вайб"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!user?.vibes || user.vibes.length === 0) && (
                    <div className="col-span-3 py-20 text-center text-zinc-500">Нет загруженных вайбов</div>
                  )}
                </div>
              </div>
            )}


            {activeTab === 'scheduled' && (
              scheduledPosts.length > 0 ? (
                <div>
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
                <motion.div key="no-scheduled" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-8 text-center">
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
            
            {activeTab === 'likes' && (
                <div className="space-y-6 pb-10"> 
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
                                layoutId="liked-active-blob"
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
                                        key={`liked-post-${postData.id}`} 
                                        post={postData} 
                                        currentUserId={user.id} 
                                        onEdit={() => {}} 
                                        onUpdate={refetchLikedContent}
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
                                        key={`liked-comment-${commentData.id}`}
                                        comment={commentData}
                                        currentUserId={user.id}
                                        onUpdate={refetchLikedContent}
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
          </div>
        </div>
      </div>
    </div>
  );
}