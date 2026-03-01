// frontend/app/dashboard/recommendations/page.tsx
'use client';

import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import PostCard from '@/components/PostCard';
import CommentCard from '@/components/CommentCard';
import UserCarousel from '@/components/UserCarousel';
import { Sparkles, Flame, MessageCircle, User, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

// --- ЗАПРОС ---
const GET_FEED = gql`
  query GetRecommendationFeed {
    recommendationFeed {
      type
      post {
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
      comment {
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
      users {
        id
        username
        name
        avatar
        friendshipStatus
        sentFriendRequestId
        receivedFriendRequestId
      }
    }
    me { id }
  }
`;

export default function RecommendationsPage() {
  const { isDarkMode } = useTheme();
  const { data, loading, error, refetch } = useQuery(GET_FEED, { fetchPolicy: 'network-only' });

  const feed = data?.recommendationFeed || [];
  const currentUserId = data?.me?.id;

  // Локальный лоадер вместо LoadingScreen
  if (loading) {
    return (
      <div className={`min-h-[calc(100vh-64px)] flex items-center justify-center transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
        <div className="flex flex-col items-center gap-4 opacity-50">
           <Loader className="animate-spin text-lime-500" size={40} />
           <p className="text-sm font-medium">Подбираем рекомендации...</p>
        </div>
      </div>
    );
  }
  
  if (error) return <div className="p-8 text-center text-red-500">Ошибка загрузки рекомендаций</div>;

  return (
    <div className={`min-h-screen p-6 md:p-8 transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
      
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-linear-to-tr from-yellow-400 to-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                <Sparkles size={24} />
            </div>
            <h1 className="text-3xl font-bold">Для вас</h1>
        </div>
        <p className="text-zinc-500">Подборка самого интересного контента на сегодня</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        {feed.map((item: any, index: number) => {
            
            // 1. TOP POST (Визуально выделен)
             if (item.type === 'TOP_POST' && item.post) {
                return (
                    <motion.div 
                        key={`top-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative group z-0"
                    >
                        {/* Бейджик */}
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', delay: 0.2 }}
                          className={`absolute -top-4 -left-2 z-20 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 shadow-lg bg-linear-to-r from-pink-500 to-rose-500 ring-2 ring-white dark:ring-black`}
                        >
                            <Flame size={12} className="fill-current animate-pulse" />
                            ГОРЯЧЕЕ
                        </motion.div>
                        
                        {/* Убрали обводку: теперь просто PostCard */}
                        <div className={`relative z-10 rounded-[24px]`}>
                             <PostCard 
                                 post={item.post} 
                                 currentUserId={currentUserId} 
                                 onEdit={() => {}} 
                                 onUpdate={refetch}
                             />
                        </div>
                    </motion.div>
                );
            }

            // 2 & 6. FRIEND POST / 5. STRANGER POST (Обычные посты)
            if ((item.type === 'FRIEND_POST' || item.type === 'STRANGER_POST') && item.post) {
                return (
                    <motion.div 
                        // ИСПРАВЛЕНИЕ КЛЮЧА: Добавлен item.post.id и index для уникальности
                        key={`post-${item.type}-${item.post.id}-${index}`} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                    >
                        {item.type === 'STRANGER_POST' && (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-xs text-zinc-500 mb-2 flex items-center gap-1 ml-2"
                            >
                                <Sparkles size={16} style={{ color: 'gold' }} /> Может быть интересно
                            </motion.div>
                        )}
                        <PostCard 
                            post={item.post} 
                            currentUserId={currentUserId} 
                            onEdit={() => {}} 
                            onUpdate={refetch}
                        />
                    </motion.div>
                );
            }

            // 3. POPULAR COMMENT
            if (item.type === 'POPULAR_COMMENT' && item.comment) {
                return (
                    <motion.div 
                        // ИСПРАВЛЕНИЕ КЛЮЧА: Добавлен item.comment.id и index для уникальности
                        key={`comment-${item.comment.id}-${index}`} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                    >
                        <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1 ml-2">
                            <MessageCircle size={12} /> Популярный комментарий
                        </div>
                        <CommentCard 
                            comment={item.comment} 
                            currentUserId={currentUserId}
                            onUpdate={refetch}
                            isDarkMode={isDarkMode}
                        />
                    </motion.div>
                );
            }

            // 4. USER CAROUSEL
            if (item.type === 'USER_CAROUSEL' && item.users) {
                return (
                    <motion.div 
                         // ИСПРАВЛЕНИЕ КЛЮЧА: Уникальный ключ для карусели
                        key={`carousel-${index}`} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                    >
                        <UserCarousel users={item.users} onUpdate={refetch} currentUserId={currentUserId} />
                    </motion.div>
                );
            }

            return null;
        })}
        
        {feed.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
                Пока нет рекомендаций. Подпишитесь на кого-нибудь или проявите активность!
            </div>
        )}
      </div>
    </div>
  );
}