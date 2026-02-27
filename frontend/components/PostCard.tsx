'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Repeat, Pin, Check, Users, Clock, RotateCcw, AlertCircle, Send, Trash2, Edit2, Loader, MessageSquareOff, Clapperboard } from 'lucide-react';
import { gql, useMutation, useQuery } from '@apollo/client';
import Avatar from './Avatar';
import CommentSection from './CommentSection';
import { formatTimeAgo } from '@/lib/time-ago';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import ConfirmationModal from './ConfirmationModal';
import { useSocket } from '@/context/SocketContext';
import Toast from './Toast';
import Tooltip from './Tooltip';
import PollVotersModal from './PollVotersModal'; 
import ActionUsersTooltip from './ActionUsersTooltip';
import ActionUsersListModal from './ActionUsersListModal';
import PostImages from './PostImages';
import ImageViewer from './ImageViewer';
import MiniVibePlayer from './vibes/MiniVibePlayer';

const toHex = (str: string) => {
  return Array.from(str)
    .map(c => c.codePointAt(0)?.toString(16))
    .join('-')
    .toLowerCase();
};

const APPLE_EMOJI_BASE_URL = '/emojis/';

const GET_POST_LIKES = gql`
  query GetPostLikes($postId: Int!) {
    getPostLikes(postId: $postId) {
      id
      username
      name
      avatar
    }
  }
`;

const GET_POST_REPOSTERS = gql`
  query GetPostReposters($postId: Int!) {
    getPostReposters(postId: $postId) {
      id
      username
      name
      avatar
    }
  }
`;

const TOGGLE_LIKE = gql`
  mutation ToggleLike($postId: Int!) {
    togglePostLike(postId: $postId) {
      id
      likesCount
    }
  }
`;

const DELETE_POST = gql`
  mutation DeletePost($postId: Int!) {
    deletePost(postId: $postId)
  }
`;

const REPOST_POST = gql`
  mutation RepostPost($postId: Int!) {
    repostPost(postId: $postId) {
      id
      repostsCount
    }
  }
`;

const TOGGLE_PIN = gql`
  mutation TogglePin($postId: Int!) {
    togglePinPost(postId: $postId)
  }
`;

const TOGGLE_POLL_VOTE = gql`
  mutation TogglePollVote($pollId: Int!, $optionIds: [Int!]!) {
    togglePollVote(pollId: $pollId, optionIds: $optionIds) {
      id
      options {
        id
        text
        votesCount
      }
    }
  }
`;

const GET_USER_POLL_VOTES = gql`
  query GetUserPollVotes($pollId: Int!) {
    getUserPollVotes(pollId: $pollId) {
      optionId 
    }
  }
`;

const PUBLISH_POST_NOW = gql`
  mutation PublishPostNow($postId: Int!) {
    publishPostNow(postId: $postId) {
      id
    }
  }
`;

interface PollOption {
  id: number;
  text: string;
  votesCount: number;
}

interface Poll {
  id: number;
  question: string;
  endDate: string;
  isAnonymous: boolean;
  allowMultipleVotes: boolean;
  options: PollOption[];
  allowRevote: boolean; 
}

interface PostContent {
  id: number;
  content?: string;
  images?: string[];
  createdAt: string;
  vibe?: { id: number; videoUrl: string; author?: { id: number; username: string; name?: string; avatar?: string; } };
  author: {
    id: number;
    username: string;
    name?: string;
    avatar?: string;
  };
  commentsDisabled?: boolean;
  poll?: Poll;
  repostsCount: number;
}

interface PostCardProps {
  post: {
    id: number;
    content?: string;
    images?: string[];
    createdAt: string;
    vibe?: { id: number; videoUrl: string; };
    likesCount: number;
    commentsCount: number;
    repostsCount: number;
    isLikedByUser: boolean;
    commentsDisabled: boolean;
    isPinned: boolean;
    originalPost?: PostContent;
    scheduledAt?: string;
    isPublished?: boolean;
    
    author: {
      id: number;
      username: string;
      name?: string;
      avatar?: string;
    };
    poll?: Poll;
  };
  currentUserId: number;
  onEdit: () => void;
  onUpdate?: () => void;
  highlightCommentId?: number;
  isSinglePostView?: boolean;
  isScheduledView?: boolean;
}

export default function PostCard({ post, currentUserId, onEdit, onUpdate, highlightCommentId, isSinglePostView, isScheduledView = false }: PostCardProps) {
  const { isDarkMode } = useTheme();
  const { socket } = useSocket();
  
  const [showComments, setShowComments] = useState(!!highlightCommentId); 
  const [isLiked, setIsLiked] = useState(post.isLikedByUser);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  useEffect(() => {
    setIsLiked(post.isLikedByUser);
    setLikesCount(post.likesCount);
  }, [post.isLikedByUser, post.likesCount]);

  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  
  const isRepost = !!post.originalPost;
  const displayContent: PostContent = isRepost && post.originalPost ? post.originalPost : post;
  
  const [repostsCount, setRepostsCount] = useState(displayContent.repostsCount);
  const [isOriginalDeleted, setIsOriginalDeleted] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVotersModalOpen, setIsVotersModalOpen] = useState(false); 

  const [usersModal, setUsersModal] = useState({
      isOpen: false,
      type: 'like' as 'like' | 'repost',
      title: ''
  });

  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  const actualPoll = isRepost ? post.originalPost?.poll : post.poll;

  const [pollOptions, setPollOptions] = useState<PollOption[]>(actualPoll?.options || []);
  const [userSelectedPollOptionsPreview, setUserSelectedPollOptionsPreview] = useState<Set<number>>(new Set());
  const userHasVotedRef = useRef(false);
  const [isRevoting, setIsRevoting] = useState(false);

  const [toggleLike] = useMutation(TOGGLE_LIKE, {
    update(cache, { data: { togglePostLike } }) {
      cache.modify({
        id: cache.identify({ __typename: 'Post', id: post.id }),
        fields: {
          isLikedByUser(existingValue) { return !existingValue; },
          likesCount() { return togglePostLike.likesCount; },
        },
      });
    },
    onError: () => {
      setToast({ message: 'Ошибка при изменении лайка', type: 'error' });
      setIsLiked(post.isLikedByUser);
      setLikesCount(post.likesCount);
    }
  });

  const [repostPost] = useMutation(REPOST_POST);
  const [togglePin] = useMutation(TOGGLE_PIN);
  const [deletePost] = useMutation(DELETE_POST, {
    update(cache, { data: { deletePost: success } }) {
        if (success) {
            cache.evict({ id: cache.identify(post) });
            cache.gc();
            if (onUpdate) onUpdate();
        }
    }
  });
  
  const [publishPostNow, { loading: publishing }] = useMutation(PUBLISH_POST_NOW);
  const [togglePollVote] = useMutation(TOGGLE_POLL_VOTE);

  const { data: userVotesData, refetch: refetchUserVotes } = useQuery(GET_USER_POLL_VOTES, {
    variables: { pollId: actualPoll?.id! },
    skip: !actualPoll || !currentUserId,
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (isRevoting) return;
      if (data?.getUserPollVotes && data.getUserPollVotes.length > 0) {
        const votedOptionIds = new Set<number>(data.getUserPollVotes.map((vote: { optionId: number }) => vote.optionId));
        setUserSelectedPollOptionsPreview(votedOptionIds);
        userHasVotedRef.current = true;
      } else {
        setUserSelectedPollOptionsPreview(new Set());
        userHasVotedRef.current = false;
      }
    }
  });

  useEffect(() => {
    if (actualPoll?.options) setPollOptions(actualPoll.options);
  }, [actualPoll?.options]);

  useEffect(() => {
    if (!socket) return;
    const postIdForSockets = post.id;
    const originalContentIdForSockets = displayContent.id;

   const handlePostUpdate = (data: any) => {
  // Обновление для самого поста (свои лайки/комментарии)
  if (data.id === postIdForSockets) {
    if (typeof data.likesCount === 'number') setLikesCount(data.likesCount);
    // Если сервер присылает commentsCount в post_update, обновляем и его
    if (typeof data.commentsCount === 'number') setCommentsCount(data.commentsCount);
  }
  // Обновление для оригинала (только счётчик репостов)
  if (data.id === originalContentIdForSockets && typeof data.repostsCount === 'number') {
    setRepostsCount(data.repostsCount);
  }
};
    const handleNewComment = (data: any) => { 
      if (typeof data.postCommentsCount === 'number') setCommentsCount(data.postCommentsCount); 
      else setCommentsCount((prev: number) => prev + 1); 
    };
    const handleDeleteComment = (data: any) => { 
      if (typeof data.newCommentsCount === 'number') setCommentsCount(data.newCommentsCount); 
    };
    const handlePostDeleted = (data: { id: number }) => {
        if (isRepost && originalContentIdForSockets === data.id) setIsOriginalDeleted(true);
    };

    socket.on(`post_update_${postIdForSockets}`, handlePostUpdate);
    socket.on(`new_comment_for_post_${postIdForSockets}`, handleNewComment);
    socket.on(`delete_comment_for_post_${postIdForSockets}`, handleDeleteComment);
    socket.on(`comments_bulk_deleted_${postIdForSockets}`, handleDeleteComment);
    socket.on(`comments_cleared_${postIdForSockets}`, handleDeleteComment);
    socket.on('post_deleted', handlePostDeleted); 
    
    if (postIdForSockets !== originalContentIdForSockets) {
        socket.on(`post_update_${originalContentIdForSockets}`, handlePostUpdate);
    }

    if (actualPoll) {
      socket.on(`poll_update_${actualPoll.id}`, (data: { id: number; options: PollOption[] }) => {
        setPollOptions(data.options);
        if (!isRevoting) refetchUserVotes();
      });
    }

    return () => {
        socket.off(`post_update_${postIdForSockets}`, handlePostUpdate);
        socket.off(`new_comment_for_post_${postIdForSockets}`, handleNewComment);
        socket.off(`delete_comment_for_post_${postIdForSockets}`, handleDeleteComment);
        socket.off(`comments_bulk_deleted_${postIdForSockets}`, handleDeleteComment);
        socket.off(`comments_cleared_${postIdForSockets}`, handleDeleteComment);
        socket.off('post_deleted', handlePostDeleted); 
        if (postIdForSockets !== originalContentIdForSockets) {
            socket.off(`post_update_${originalContentIdForSockets}`, handlePostUpdate);
        }
        if (actualPoll) socket.off(`poll_update_${actualPoll.id}`);
    };
  }, [socket, post.id, actualPoll, displayContent.id, refetchUserVotes, isRevoting, isRepost]);

  const handleLike = async () => {
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
    try { await toggleLike({ variables: { postId: post.id } }); } catch (error) { console.error("Like error:", error); }
  };

  const handleRepost = async () => {
    try {
        await repostPost({ variables: { postId: displayContent.id } }); 
        setToast({ message: 'Репост опубликован в вашем профиле', type: 'success' });
        if (onUpdate) onUpdate();
    } catch (e) {
        setToast({ message: 'Не удалось сделать репост', type: 'error' });
    }
  };

  const handlePin = async () => {
    try {
        await togglePin({ variables: { postId: post.id } });
        if (onUpdate) onUpdate();
        setToast({ message: post.isPinned ? 'Пост откреплен!' : 'Пост закреплен!', type: 'success' });
    } catch (e) {
        console.error(e);
        setToast({ message: 'Ошибка при закреплении', type: 'error' });
    }
  };

  const confirmDelete = async () => {
    try { await deletePost({ variables: { postId: post.id } }); } catch (error) { console.error("Delete error:", error); }
    setIsDeleteModalOpen(false);
  };
  
  const handleViewAllClick = useCallback((type: 'like' | 'repost', title: string) => {
      setUsersModal({ isOpen: true, type, title });
  }, []); 

  const handleImageClick = (index: number) => {
    setViewerInitialIndex(index);
    setIsViewerOpen(true);
  };

  const handlePublishNow = async () => {
    try {
      await publishPostNow({ variables: { postId: post.id } });
      setToast({ message: 'Пост опубликован!', type: 'success' });
      if (onUpdate) onUpdate();
    } catch (e) {
      setToast({ message: 'Не удалось опубликовать пост', type: 'error' });
    }
  }

  const formatScheduledDate = (dateString: any) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handlePollOptionClick = (optionId: number) => {
    if (!actualPoll || new Date(actualPoll.endDate) < new Date() || !isOptionClickable) return;
    setUserSelectedPollOptionsPreview(prev => {
      const newSelection = new Set(prev);
      if (actualPoll!.allowMultipleVotes) {
        newSelection.has(optionId) ? newSelection.delete(optionId) : newSelection.add(optionId);
      } else {
        newSelection.clear();
        newSelection.add(optionId);
      }
      return newSelection;
    });
  };

  const handleVoteSubmit = async () => {
    if (!actualPoll || userSelectedPollOptionsPreview.size === 0) return;
    try {
      await togglePollVote({ variables: { pollId: actualPoll.id, optionIds: Array.from(userSelectedPollOptionsPreview) } });
      userHasVotedRef.current = true;
      setIsRevoting(false);
      setToast({ message: 'Ваш голос учтен!', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Ошибка при голосовании', type: 'error' });
    }
  };
  
  const handleCancelVote = async () => {
    if (!actualPoll) return;
    setIsRevoting(true);
    setUserSelectedPollOptionsPreview(new Set());
    try {
        await togglePollVote({ variables: { pollId: actualPoll.id, optionIds: [] } });
        await refetchUserVotes(); 
        setToast({ message: 'Ваш голос отменен. Выберите заново.', type: 'success' });
    } catch (error: any) {
        setIsRevoting(false); 
        refetchUserVotes();
        setToast({ message: 'Не удалось отменить голос', type: 'error' });
    }
  };
  
  const pollTotalVotes = pollOptions.reduce((sum, option) => sum + option.votesCount, 0);
  const isPollEnded = actualPoll ? new Date(actualPoll.endDate) < new Date() : false;
  const hasVoted = userHasVotedRef.current;
  const canRevote = actualPoll?.allowRevote && !isPollEnded;
  const isOptionClickable = !isPollEnded && (!hasVoted || isRevoting);

  const formatPollEndDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderContentWithEmojis = (content: string) => {
    const emojiRegex = /(\p{Emoji_Presentation})/gu;
    const parts = content.split(emojiRegex);
    return parts.map((part, index) => {
      if (!part) return null;
      if (part.match(emojiRegex)) {
        const hex = toHex(part);
        if (hex && !/^[a-z0-9_]+$/i.test(part)) {
          return (
            <img key={index} src={`${APPLE_EMOJI_BASE_URL}${hex}.png`} alt={part} className="inline-block w-5 h-5" 
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { 
                const imgElement = e.target as HTMLImageElement;
                imgElement.style.display = 'none';
                const span = document.createElement('span');
                span.textContent = part;
                if (imgElement.parentNode) imgElement.parentNode.insertBefore(span, imgElement);
              }}
            />
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };
  
  const hasContent = !!displayContent.content?.trim();
  const hasImages = !!displayContent.images?.length;
  const hasPoll = !!actualPoll;
  const hasVibe = !!displayContent.vibe;
  const isContentEmpty = (!hasContent && !hasImages && !hasPoll && !hasVibe) || isOriginalDeleted;

  // --- LIQUID GLASS STYLES ---
  const liquidGlassCardStyle = {
    position: 'relative',
    borderRadius: '24px',
    border: 'none',
    backgroundColor: isDarkMode ? 'color-mix(in srgb, #bbbbbc 8%, transparent)' : 'color-mix(in srgb, #bbbbbc 12%, transparent)',
    backdropFilter: 'blur(12px) saturate(150%)',
    WebkitBackdropFilter: 'blur(12px) saturate(150%)',
    boxShadow: `
      inset 0 0 0 1px color-mix(in srgb, ${isDarkMode ? '#fff' : '#fff'} ${isDarkMode ? '15%' : '40%'}, transparent),
      inset 2px 2px 0px 0px color-mix(in srgb, ${isDarkMode ? '#fff' : '#fff'} ${isDarkMode ? '10%' : '30%'}, transparent),
      0px 4px 20px 0px color-mix(in srgb, #000 ${isDarkMode ? '30%' : '10%'}, transparent)
    `,
    transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s',
  } as React.CSSProperties;

  const liquidBtnStyle = (isActive: boolean, type: 'like' | 'comment' | 'repost') => {
    let color = isDarkMode ? '#a1a1aa' : '#52525b';
    let backgroundColor = 'transparent';
    if (isActive) {
      switch (type) {
        case 'like': color = '#f43f5e'; backgroundColor = isDarkMode ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.1)'; break;
        case 'comment': color = '#3b82f6'; backgroundColor = isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'; break;
        case 'repost': color = '#f59e0b'; backgroundColor = isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'; break;
      }
    }
    return {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '99em', cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', backgroundColor, color, boxShadow: 'none',
    };
  };

  if (isRepost && !displayContent) {
     return (
         <div className={`p-4 rounded-2xl border mb-6 ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'}`}>
            <p className="text-zinc-500 text-sm italic">Оригинальная публикация была удалена.</p>
         </div>
     )
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} title="Удалить публикацию?" message="Это действие нельзя будет отменить. Вы уверены?" />
      {displayContent.images && displayContent.images.length > 0 && (
        <ImageViewer isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} images={displayContent.images} initialIndex={viewerInitialIndex} />
      )}
      {actualPoll && (
          <PollVotersModal isOpen={isVotersModalOpen} onClose={() => setIsVotersModalOpen(false)} pollId={actualPoll.id} options={pollOptions} />
      )}
      <ActionUsersListModal isOpen={usersModal.isOpen} onClose={() => setUsersModal(prev => ({ ...prev, isOpen: false }))} title={usersModal.title} query={usersModal.type === 'like' ? GET_POST_LIKES : GET_POST_REPOSTERS} variables={{ postId: displayContent.id }} />

      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={liquidGlassCardStyle}
        className={`mb-6 relative overflow-visible group`}
      >
        <div className="absolute inset-0 rounded-[24px] pointer-events-none z-0 bg-linear-to-br from-white/5 to-transparent opacity-50" />

        {isRepost && (
            <div className={`px-4 py-2 text-xs font-bold flex items-center gap-2 border-b relative z-10
                ${isDarkMode ? 'text-zinc-400 border-white/5 bg-zinc-900/20' : 'text-zinc-500 border-black/5 bg-zinc-50/20'}`}>
                <Repeat size={14} />
                <Link href={`/dashboard/user/${post.author.id}`} className="hover:underline">
                    {post.author.name || post.author.username}
                </Link>
                <span>репостнул(а)</span>
            </div>
        )}

        {post.isPinned && (
             <div className="absolute top-0 right-0 p-2 z-20 pointer-events-none">
                 <div className="bg-lime-400 text-black p-1.5 rounded-bl-xl rounded-tr-xl shadow-sm" title="Закреплено">
                     <Pin size={16} className="fill-current" />
                 </div>
             </div>
        )}

        <div className="p-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/user/${displayContent.author?.id}`}>
              <Avatar username={displayContent.author?.username} name={displayContent.author?.name} url={displayContent.author?.avatar} size="md" />
            </Link>
            <div>
              <Link href={`/dashboard/user/${displayContent.author?.id}`} className={`font-bold text-sm hover:underline ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {displayContent.author?.name || displayContent.author?.username}
              </Link>
              <p className="text-xs text-zinc-500">{formatTimeAgo(displayContent.createdAt)}</p>
            </div>
          </div>

          {!isSinglePostView && post.author.id === currentUserId && (
            <div className={`flex items-center gap-1 transition-all ${post.isPinned ? 'mr-10' : ''}`}>
                {!isScheduledView && (
                  <Tooltip content={post.isPinned ? "Открепить" : "Закрепить"} position="top">
                    <button onClick={handlePin} className={`p-2 rounded-full transition-colors cursor-pointer ${post.isPinned ? 'text-lime-500 bg-lime-500/10' : (isDarkMode ? 'text-zinc-500 hover:text-lime-400 hover:bg-white/10' : 'text-zinc-400 hover:text-lime-500 hover:bg-black/5')}`}>
                      <motion.div key={post.isPinned ? 'pinned' : 'unpinned'} initial={{ scale: 1 }} animate={{ scale: post.isPinned ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.2, ease: "easeInOut" }}>
                        <Pin size={18} className={post.isPinned ? "fill-current" : ""} />
                      </motion.div>
                    </button>
                  </Tooltip>
                )}
                {!isRepost && !isScheduledView && (<Tooltip content="Редактировать" position="top"><button onClick={onEdit} className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-zinc-500 hover:text-yellow-400' : 'hover:bg-black/5 text-zinc-400 hover:text-yellow-500'}`}><Edit2 size={18} /></button></Tooltip>)}
                {!isScheduledView && <Tooltip content="Удалить" position="top"><button onClick={() => setIsDeleteModalOpen(true)} className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-white/10 text-zinc-500 hover:text-red-400' : 'hover:bg-black/5 text-zinc-400 hover:text-red-500'}`}><Trash2 size={18} /></button></Tooltip>}
            </div>
          )}
        </div>

        {/* CONTENT SECTION */}
        <div className="relative z-10">
            {!isContentEmpty && displayContent.content && (
                <div className={`px-4 pb-3 flex flex-wrap items-center gap-x-1 text-sm ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {renderContentWithEmojis(displayContent.content)}
                </div>
            )}
            
            {!isContentEmpty && displayContent.images && displayContent.images.length > 0 && (
                <div className="px-0 sm:px-4 pb-3">
                    <PostImages images={displayContent.images} onImageClick={handleImageClick} />
                </div>
            )}

            {!isContentEmpty && displayContent.vibe && (
              <div className="px-4 pb-4">
                <div className={`p-3 rounded-[20px] border flex flex-col items-center gap-3 transition-all ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                  <div className="w-full flex items-center justify-between gap-2 mb-1 px-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-lime-500">
                      <Clapperboard size={14} strokeWidth={3} />
                      
                      {/* === ИСПРАВЛЕНО ЗДЕСЬ === */}
                      <span>
                        {displayContent.vibe.author && displayContent.vibe.author.id !== displayContent.author.id
                          ? `Вайб от ${displayContent.vibe.author.name || displayContent.vibe.author.username}` 
                          : 'Мой Вайб'
                        }
                      </span>
                      {/* ======================= */}

                    </div>
                    
                    {/* === ИСПРАВЛЕНА ССЫЛКА НА ПРОФИЛЬ АВТОРА ВАЙБА === */}
                    {displayContent.vibe.author && displayContent.vibe.author.id !== displayContent.author.id && (
                        <Link 
                          href={`/dashboard/user/${displayContent.vibe.author.id}`}
                          className="text-[10px] text-zinc-500 hover:text-lime-500 transition-colors font-bold uppercase"
                        >
                          Смотреть профиль
                        </Link>
                    )}
                    {/* ================================================= */}
                  </div>
                  
                  <MiniVibePlayer 
                    src={displayContent.vibe.videoUrl.startsWith('http') 
                      ? displayContent.vibe.videoUrl 
                      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}${displayContent.vibe.videoUrl}`
                    } 
                  />
                </div>
              </div>
            )}

            {isContentEmpty && (
                <div className={`px-4 py-8 flex flex-col items-center justify-center gap-2 text-sm italic border-y border-dashed my-2 ${isDarkMode ? 'text-zinc-500 border-zinc-800 bg-zinc-900/30' : 'text-zinc-400 border-zinc-100 bg-zinc-50/50'}`}>
                    <AlertCircle size={24} className="opacity-50" />
                    <p>Контент недоступен или был удален.</p>
                </div>
            )}
        </div>

        {!isContentEmpty && actualPoll && (
          <div className={`px-4 pt-4 border-t relative z-10 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
            <h3 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{actualPoll.question}</h3>
            <div className="space-y-2 mb-4">
              {pollOptions.map((option) => {
                const percentage = pollTotalVotes > 0 ? (option.votesCount / pollTotalVotes) * 100 : 0;
                const isSelected = userSelectedPollOptionsPreview.has(option.id); 
                const isAlreadyVoted = userHasVotedRef.current; 
                const isClickable = isOptionClickable;
                return (
                  <motion.button key={option.id} onClick={() => isClickable && handlePollOptionClick(option.id)}
                    className={`relative w-full p-3 rounded-lg flex items-center justify-between text-sm font-medium transition-all group overflow-hidden ${isClickable ? (isDarkMode ? 'hover:bg-white/5 cursor-pointer' : 'hover:bg-black/5 cursor-pointer') : 'cursor-default'} ${isSelected ? (isDarkMode ? 'bg-lime-900/40 border border-lime-400/50' : 'bg-lime-50 border border-lime-400') : (isDarkMode ? 'bg-zinc-800/50 border border-transparent' : 'bg-zinc-100/50 border border-transparent')}`}
                    disabled={!isClickable}>
                    {(isPollEnded || (isAlreadyVoted && !isRevoting)) && (
                        <div className={`absolute inset-0 z-0 ${isDarkMode ? 'bg-lime-400/20' : 'bg-lime-200/50'}`} style={{ width: `${percentage}%` }} />
                    )}
                    <span className="relative z-10 flex-1 text-left">{option.text}</span>
                    <div className="relative z-10 flex items-center gap-2">
                        {(isPollEnded || (isAlreadyVoted && !isRevoting)) && (
                            <span className={`text-xs font-semibold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{percentage.toFixed(0)}% ({option.votesCount})</span>
                        )}
                        {isSelected && <Check size={16} className="text-lime-500" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            {!isPollEnded && (
              <>
                  {(!hasVoted || isRevoting) ? (
                      <button onClick={handleVoteSubmit} disabled={userSelectedPollOptionsPreview.size === 0} className="w-full py-2.5 rounded-lg bg-lime-400 text-zinc-900 font-bold text-sm hover:bg-lime-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Проголосовать</button>
                  ) : canRevote ? (
                      <button onClick={handleCancelVote} className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}><RotateCcw size={16} />Переголосовать</button>
                  ) : (
                      <div className={`w-full py-2.5 rounded-lg text-center text-sm font-medium ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>Вы уже проголосовали</div>
                  )}
              </>
            )}
            {isPollEnded && (<div className={`w-full py-2.5 rounded-lg text-center text-sm font-medium ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>Голосование завершено</div>)}
            <div className={`mt-4 pt-3 border-t text-xs flex justify-between items-center ${isDarkMode ? 'border-white/5 text-zinc-500' : 'border-black/5 text-zinc-600'}`}>
              {pollTotalVotes > 0 && !actualPoll.isAnonymous ? (
                  <Tooltip content="Посмотреть, кто проголосовал" position="top">
                      <button onClick={() => setIsVotersModalOpen(true)} className="flex items-center gap-1 hover:underline hover:text-lime-500 transition-colors cursor-pointer">
                        <Users size={14} /><span>{pollTotalVotes} голос{pollTotalVotes !== 1 ? 'ов' : ''}</span>
                      </button>
                  </Tooltip>
              ) : (
                  <div className="flex items-center gap-1 cursor-default"><Users size={14} /><span>{pollTotalVotes} голос{pollTotalVotes !== 1 ? 'ов' : ''} {actualPoll?.isAnonymous && '(Анонимно)'}</span></div>
              )}
              <div className="flex items-center gap-1"><Clock size={14} /><span>{isPollEnded ? `Завершено: ${formatPollEndDate(actualPoll.endDate)}` : `Завершится: ${formatPollEndDate(actualPoll.endDate)}`}</span></div>
            </div>
          </div>
        )}

        {isScheduledView && (
          <div className={`p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
            <div className="flex items-center gap-2 text-sm text-blue-500 font-medium"><Clock size={16} /><span>Будет опубликовано: {formatScheduledDate(post.scheduledAt)}</span></div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsDeleteModalOpen(true)} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors flex items-center gap-2 cursor-pointer ${isDarkMode ? 'bg-zinc-800 text-red-400 hover:bg-red-900/30' : 'bg-zinc-100 text-red-500 hover:bg-red-50'}`}><Trash2 size={16}/> Удалить</button>
              <button onClick={handlePublishNow} disabled={publishing} className="px-4 py-2 text-sm font-bold rounded-full transition-colors flex items-center gap-2 bg-lime-400 text-black hover:bg-lime-500 disabled:opacity-50 cursor-pointer">{publishing ? <Loader size={16} className="animate-spin" /> : <Send size={16} />} Опубликовать сейчас</button>
            </div>
          </div>
        )}

        {!isScheduledView && (
          <div className="p-4 flex items-center gap-2 relative z-10">
           <ActionUsersTooltip id={post.id} type="like" count={likesCount} onViewAllClick={() => handleViewAllClick('like', 'Понравилось')}>
                <button onClick={handleLike} style={liquidBtnStyle(isLiked, 'like')} className="hover:!bg-white/10 dark:hover:!bg-white/5 group">
                    <div className="relative w-5 h-5 flex items-center justify-center">
                        <motion.svg viewBox="0 0 24 24" width="20" height="20" className="absolute" initial={false} animate={isLiked ? "liked" : "unliked"}>
                            <motion.path
                                d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                                fill={isLiked ? "#f43f5e" : "transparent"} stroke={isLiked ? "#f43f5e" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                variants={{ liked: { scale: [1, 1.2, 1], transition: { duration: 0.3 } }, unliked: { scale: 1, fill: "transparent" } }}
                            />
                             {isLiked && (
                                <motion.path
                                    d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
                                    fill="transparent" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    initial={{ pathLength: 0, opacity: 0.5 }} animate={{ pathLength: 1, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
                                />
                             )}
                        </motion.svg>
                    </div>
                    <span className="text-sm font-bold">{likesCount > 0 ? likesCount : 'Лайк'}</span>
                </button>
            </ActionUsersTooltip>
            
            {!post.commentsDisabled ? (
                <button onClick={() => setShowComments(!showComments)} style={liquidBtnStyle(showComments, 'comment')} className="hover:!bg-white/10 dark:hover:!bg-white/5">
                    <MessageCircle size={20} className={showComments ? "fill-current" : ""} />
                    <span className="text-sm font-bold">{commentsCount > 0 ? commentsCount : 'Коммент'}</span>
                </button>
            ) : (
                <div className="flex items-center gap-2 text-sm text-zinc-500 cursor-default px-3 py-2">
                    <MessageSquareOff size={20} />
                    <span className="opacity-50">Отключены</span>
                </div>
            )}

            <ActionUsersTooltip id={post.id} type="repost" count={repostsCount} onViewAllClick={() => handleViewAllClick('repost', 'Репостнули')}>
                <button onClick={handleRepost} style={liquidBtnStyle(repostsCount > 0, 'repost')} className="hover:!bg-white/10 dark:hover:!bg-white/5">
                    <Repeat size={20} />
                    <span className="text-sm font-bold">{repostsCount > 0 ? repostsCount : 'Репост'}</span>
                </button>
            </ActionUsersTooltip>
          </div>
        )}

        <AnimatePresence>
          {showComments && !post.commentsDisabled && !isScheduledView && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`border-t relative z-10 ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
               <div className="p-4"><CommentSection postId={post.id} currentUserId={currentUserId} postAuthorId={displayContent.author?.id} highlightCommentId={highlightCommentId} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}