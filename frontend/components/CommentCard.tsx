'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Heart } from 'lucide-react'; 
import { formatTimeAgo } from '@/lib/time-ago';
import Link from 'next/link';
import Avatar from './Avatar';
import { gql, useMutation } from '@apollo/client';
import Toast from './Toast';

const VOTE_COMMENT = gql`
  mutation VoteComment($commentId: Int!, $type: String!) {
    voteComment(commentId: $commentId, type: $type) {
      id
      likesCount
      dislikesCount
      score
      userVote
    }
  }
`;

interface CommentCardProps {
  comment: {
    id: number;
    content: string;
    createdAt: string;
    likesCount: number;
    dislikesCount: number;
    score: number;
    userVote?: 'LIKE' | 'DISLIKE';
    author: {
      id: number;
      username: string;
      name?: string;
      avatar?: string;
    };
    post: { 
      id: number;
      content?: string;
      images?: string[];
    };
  };
  currentUserId: number;
  onUpdate?: () => void; 
  isDarkMode: boolean;
}

export default function CommentCard({ comment, currentUserId, onUpdate, isDarkMode }: CommentCardProps) {
  const [currentLikesCount, setCurrentLikesCount] = useState(comment.likesCount);
  const [currentUserVote, setCurrentUserVote] = useState(comment.userVote);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setCurrentLikesCount(comment.likesCount);
    setCurrentUserVote(comment.userVote);
  }, [comment.likesCount, comment.userVote]);

  const [voteCommentMutation] = useMutation(VOTE_COMMENT, {
    update(cache, { data: { voteComment } }) {
        cache.modify({
            id: cache.identify({ __typename: 'Comment', id: comment.id }),
            fields: {
                likesCount() { return voteComment.likesCount; },
                dislikesCount() { return voteComment.dislikesCount; },
                score() { return voteComment.score; },
                userVote() { return voteComment.userVote; }
            }
        });
    },
    onError: (error) => {
        setToast({ message: error.graphQLErrors?.[0]?.message || 'Ошибка при голосовании', type: 'error' });
        setCurrentLikesCount(comment.likesCount);
        setCurrentUserVote(comment.userVote);
    }
  });

  const handleVote = async (type: 'LIKE' | 'DISLIKE') => {
    const isLikeAction = type === 'LIKE';
    const isRemovingLike = currentUserVote === 'LIKE' && type === 'LIKE';
    const isRemovingDislike = currentUserVote === 'DISLIKE' && type === 'DISLIKE';

    if (isRemovingLike) {
        setCurrentUserVote(undefined);
        setCurrentLikesCount(prev => prev - 1);
    } else if (isLikeAction) {
        setCurrentUserVote('LIKE');
        setCurrentLikesCount(prev => prev + 1);
    } else if (isRemovingDislike) {
        setCurrentUserVote(undefined);
    } else {
        if (currentUserVote === 'LIKE') setCurrentLikesCount(prev => prev - 1);
        setCurrentUserVote('DISLIKE');
    }

    try {
      await voteCommentMutation({
        variables: { commentId: comment.id, type },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const isLiked = currentUserVote === 'LIKE';
  
  const getTextSnippet = () => {
    if (comment.post.content) {
      const snippet = comment.post.content.substring(0, 50);
      return snippet.length < comment.post.content.length ? `${snippet}...` : snippet;
    }
    return null;
  };

  // --- LIQUID GLASS STYLES FOR COMMENT CARD ---
  const liquidCommentStyle = {
    position: 'relative',
    borderRadius: '16px',
    border: 'none',
    backgroundColor: isDarkMode 
      ? 'color-mix(in srgb, #bbbbbc 5%, transparent)' 
      : 'color-mix(in srgb, #bbbbbc 8%, transparent)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: `
      inset 0 0 0 1px color-mix(in srgb, ${isDarkMode ? '#fff' : '#000'} ${isDarkMode ? '10%' : '5%'}, transparent),
      0px 2px 8px 0px color-mix(in srgb, #000 5%, transparent)
    `,
  } as React.CSSProperties;
  // ---------------------------------------------

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div 
        style={liquidCommentStyle} 
        className="p-4 transition-colors relative mb-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/dashboard/user/${comment.author.id}`}>
            <Avatar username={comment.author.username} name={comment.author.name} url={comment.author.avatar} size="md" />
          </Link>
          <div>
            <Link href={`/dashboard/user/${comment.author.id}`} className={`font-bold text-sm hover:underline ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {comment.author.name || comment.author.username}
            </Link>
            <p className="text-xs text-zinc-500">{formatTimeAgo(comment.createdAt)}</p>
          </div>
        </div>

        <p className={`text-sm whitespace-pre-wrap mb-3 wrap-break-words ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>
          {comment.content}
        </p>

        <Link 
            href={`/dashboard/post/${comment.post.id}?commentId=${comment.id}`}
            className={`flex items-center gap-2 p-3 rounded-xl transition-colors border text-sm
                ${isDarkMode ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200'}
            `}
        >
            <MessageCircle size={18} className={`shrink-0 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`} />
            
            <div className={`flex items-center gap-1 min-w-0 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <span className="shrink-0">К публикации:</span>
                
                {comment.post.content ? (
                    <span className="font-medium truncate ml-1">{getTextSnippet()}</span>
                ) : comment.post.images && comment.post.images.length > 0 ? (
                    <div className="flex items-center gap-2 ml-1">
                        <img 
                            src={comment.post.images[0]} 
                            alt="Post preview" 
                            className={`w-6 h-6 rounded-md object-cover border ${isDarkMode ? 'border-zinc-600' : 'border-zinc-300'}`} 
                        />
                        {comment.post.images.length > 1 && (
                            <span className="text-xs opacity-60">+{comment.post.images.length - 1}</span>
                        )}
                    </div>
                ) : (
                    <span className="font-medium truncate ml-1 opacity-50">[Без контента]</span>
                )}
            </div>
        </Link>


        <div className={`flex items-center gap-4 text-xs font-bold pt-4 mt-4 border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
            <button onClick={() => handleVote(isLiked ? 'DISLIKE' : 'LIKE')} className={`flex items-center gap-1.5 transition-colors cursor-pointer
                ${isLiked ? 'text-red-500' : 'text-zinc-500 hover:text-red-500'}`}
            >
                <Heart size={14} className={isLiked ? "fill-current" : ""} /> 
                {currentLikesCount > 0 && <span>{currentLikesCount}</span>}
            </button>
            <Link href={`/dashboard/post/${comment.post.id}?commentId=${comment.id}`} className="text-zinc-500 hover:text-blue-500 transition-colors cursor-pointer">
                Перейти к комментарию
            </Link>
        </div>
      </div>
    </>
  );
}