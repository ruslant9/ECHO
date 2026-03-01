// frontend/components/profile/LikedContent.tsx
'use client';

import { useState } from 'react';
import { Heart, MessageCircle, FileText, Clapperboard } from 'lucide-react';
import PostCard from '@/components/PostCard';
import CommentCard from '@/components/CommentCard';
import VibesGrid from './VibesGrid';
import ProfileTabs from './ProfileTabs';
import { useTheme } from '@/context/ThemeContext';

interface LikedContentProps {
  likedPosts: any[];
  likedVibes: any[];
  likedComments: any[];
  currentUserId: number;
  onUpdate: () => void;
}

export default function LikedContent({ likedPosts, likedVibes, likedComments, currentUserId, onUpdate }: LikedContentProps) {
  const { isDarkMode } = useTheme();
  const [likedTab, setLikedTab] = useState<'posts' | 'vibes' | 'comments'>('posts');

  const tabs = [
    { id: 'posts', label: 'Посты', count: likedPosts.length },
    { id: 'vibes', label: 'Вайбы', count: likedVibes.length },
    { id: 'comments', label: 'Комментарии', count: likedComments.length },
  ];

  return (
    <div className="space-y-4 pb-10">
      <ProfileTabs tabs={tabs} activeTab={likedTab} onChange={setLikedTab} prefixId="liked" />

      {likedTab === 'posts' && (
          <div className="space-y-4">
              {likedPosts.length > 0 ? (
                  likedPosts.map((post) => (
                      <PostCard key={`liked-post-${post.id}`} post={post} currentUserId={currentUserId} onEdit={() => {}} onUpdate={onUpdate} />
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
          <VibesGrid vibes={likedVibes} emptyMessage="Нет понравившихся вайбов" />
      )}

      {likedTab === 'comments' && (
          <div className="space-y-4">
              {likedComments.length > 0 ? (
                  likedComments.map((comment) => (
                      <CommentCard key={`liked-comment-${comment.id}`} comment={comment} currentUserId={currentUserId} onUpdate={onUpdate} isDarkMode={isDarkMode} />
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
  );
}