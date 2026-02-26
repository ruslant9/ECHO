'use client';

import { use } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import LoadingScreen from '@/components/LoadingScreen';
import PostCard from '@/components/PostCard';
import { ChevronLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const GET_SINGLE_POST = gql`
  query GetSinglePost($id: Int!) {
    post(id: $id) {
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
      
      originalPost {
        id
        content
        images
        createdAt
        author {
          id
          username
          name
          avatar
        }
          poll {
            id
            question
            endDate
            isAnonymous
            allowMultipleVotes
            allowRevote
            options {
              id
              text
              votesCount
            }
          }
      }

      author {
        id
        username
        name
        avatar
      }
      poll {
        id
        question
        endDate
        isAnonymous
        allowMultipleVotes
        allowRevote
        options {
          id
          text
          votesCount
        }
      }
    }
    me {
      id
    }
  }
`;

export default function SinglePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { id } = use(params);
  const postId = Number(id);
  const highlightCommentId = searchParams.get('commentId');

  const { data, loading, error, refetch } = useQuery(GET_SINGLE_POST, {
    variables: { id: postId },
    skip: !Number.isFinite(postId),
    fetchPolicy: 'cache-and-network',
  });

  const post = data?.post;
  const currentUser = data?.me;

  if (!Number.isFinite(postId)) return <div className="pt-24 p-10">Неверный ID поста</div>;
  if (loading) return <LoadingScreen />;
  
  if (error || !post) {
    return (
      <div className={`min-h-screen pt-24 p-10 flex flex-col items-center justify-center ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
        <h2 className="text-xl font-bold mb-2">Публикация не найдена</h2>
        <p className="text-zinc-500">Возможно, пост был удален или ссылка неверна.</p>
        <button 
          onClick={() => router.back()}
          className={`cursor-pointer mt-6 px-4 py-2 rounded-full flex items-center gap-2 ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}
        >
          <ChevronLeft size={16} /> Назад
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-24 px-6 pb-6 md:px-8 md:pb-8 transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
        <div className="max-w-xl mx-auto">
            <button 
                onClick={() => router.back()}
                className={`cursor-pointer mb-6 px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-zinc-100 hover:bg-zinc-200'}`}
            >
                <ChevronLeft size={16} /> Назад
            </button>

            <PostCard 
                post={post} 
                currentUserId={currentUser?.id || 0} 
                onEdit={() => {}}
                onUpdate={refetch}
                highlightCommentId={highlightCommentId ? Number(highlightCommentId) : undefined}
                isSinglePostView={true} 
            />
        </div>
    </div>
  );
}