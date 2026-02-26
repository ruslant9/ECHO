'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useApolloClient, gql } from '@apollo/client';
import Avatar from './Avatar';
import { ThumbsUp, ThumbsDown, CornerDownRight, Trash2, Loader, ChevronDown, Edit2, X, Check, Square, CheckSquare, Crown, Smile, ArrowLeft } from 'lucide-react';
import { formatTimeAgo } from '@/lib/time-ago';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';
import LikesTooltip from './LikesTooltip';
import { useSocket } from '@/context/SocketContext';
import RichEmojiInput from './RichEmojiInput';
import { useEmojiPicker } from '@/context/EmojiContext';
import Tooltip from './Tooltip'; 

interface Author {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
}

interface CommentType {
  id: number;
  content: string;
  likesCount: number;
  dislikesCount: number;
  score: number;
  createdAt: string; 
  parentId?: number;
  userVote?: 'LIKE' | 'DISLIKE';
  author: Author;
  replies: CommentType[];
}

const GET_COMMENTS = gql`
  query GetComments($postId: Int!, $sort: String) {
    comments(postId: $postId, sort: $sort) {
      id
      content
      likesCount
      dislikesCount
      score
      createdAt
      parentId
      userVote
      author { id username name avatar }
      replies {
        id
        content
        likesCount
        dislikesCount
        score
        createdAt
        parentId
        userVote
        author { id username name avatar }
      }
    }
  }
`;

const toHex = (str: string) => {
  return Array.from(str)
    .map(c => c.codePointAt(0)?.toString(16))
    .join('-')
    .toLowerCase();
};

const APPLE_EMOJI_BASE_URL = '/emojis/';

const ADD_COMMENT = gql`mutation AddComment($postId: Int!, $content: String!, $parentId: Int) { createComment(postId: $postId, content: $content, parentId: $parentId) { id } }`;
const DELETE_COMMENT = gql`mutation DeleteComment($commentId: Int!) { deleteComment(commentId: $commentId) }`;
const VOTE_COMMENT = gql`mutation VoteComment($commentId: Int!, $type: String!) { voteComment(commentId: $commentId, type: $type) { id likesCount dislikesCount score userVote } }`;
const UPDATE_COMMENT = gql`mutation UpdateComment($commentId: Int!, $content: String!) { updateComment(commentId: $commentId, content: $content) { id content } }`;
const DELETE_MANY_COMMENTS = gql`
  mutation DeleteManyComments($commentIds: [Int!]!) {
    deleteManyComments(commentIds: $commentIds)
  }
`;
const CLEAR_COMMENTS = gql`mutation ClearComments($postId: Int!, $type: String!) { clearComments(postId: $postId, type: $type) }`;

export default function CommentSection({ 
    postId, 
    currentUserId, 
    postAuthorId, 
    highlightCommentId 
}: { 
    postId: number; 
    currentUserId: number; 
    postAuthorId: number; 
    highlightCommentId?: number; 
}) {
  const { isDarkMode } = useTheme();
  const { socket } = useSocket();
  const client = useApolloClient();
  const { togglePicker, isOpen: isPickerOpen } = useEmojiPicker();
  
  const [input, setInput] = useState('');
  const [sort, setSort] = useState<'popular' | 'new'>('popular');
  const [replyTo, setReplyTo] = useState<{ id: number, username: string, authorId: number } | null>(null);
  
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // Состояние: редактируется ли сейчас что-либо
  const isAnyEditing = editingCommentId !== null;

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCommentIds, setSelectedCommentIds] = useState<Set<number>>(new Set());
  const [showClearMenu, setShowClearMenu] = useState(false);

  const replyTextareaRef = useRef<HTMLDivElement>(null); 
  const mainInputRef = useRef<HTMLDivElement>(null);     
  
  const clearMenuRef = useRef<HTMLDivElement>(null);
  const highlightedCommentRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null); 

  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [prevSortIndex, setPrevSortIndex] = useState(0);
  const [sortDirection, setSortDirection] = useState<'left' | 'right'>('right');

  const [expandedComments, setExpandedComments] = useState(new Set<number>());
  const numericPostId = Number(postId);
  const { data, loading, refetch } = useQuery<{ comments: CommentType[] }>(GET_COMMENTS, {
    variables: { postId: numericPostId, sort },
    skip: !numericPostId,
    fetchPolicy: 'cache-and-network'
  });

  const [addComment] = useMutation(ADD_COMMENT, {
    update() { refetch(); },
    onCompleted: () => { setInput(''); setReplyTo(null); }
  });

  const [updateComment] = useMutation(UPDATE_COMMENT, {
    onCompleted: () => { setEditingCommentId(null); setEditContent(''); }
  });

  const [voteComment] = useMutation(VOTE_COMMENT, { onCompleted: () => refetch() });
  
  const updateCacheCounter = (newCount: number) => {
    if (typeof newCount === 'number') {
        client.cache.modify({
            id: client.cache.identify({ __typename: 'Post', id: numericPostId }),
            fields: { commentsCount: () => newCount },
        });
    }
  };

  const resetEditingState = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const [deleteComment] = useMutation(DELETE_COMMENT, {
    update(cache, { data: { deleteComment: newCommentsCount } }) {
      refetch();
      updateCacheCounter(newCommentsCount);
      // Сбрасываем редактирование при удалении
      resetEditingState();
    },
    onCompleted: () => setConfirmationState({ ...confirmationState, isOpen: false }),
  });

  const [deleteManyComments] = useMutation(DELETE_MANY_COMMENTS, {
    update(cache, { data: { deleteManyComments: newCommentsCount } }) {
      refetch();
      updateCacheCounter(newCommentsCount);
      setIsSelectionMode(false);
      setSelectedCommentIds(new Set());
      // Сбрасываем редактирование при массовом удалении
      resetEditingState();
    }
  });

  const [clearComments] = useMutation(CLEAR_COMMENTS, {
    update(cache, { data: { clearComments: newCommentsCount } }) {
      refetch();
      updateCacheCounter(newCommentsCount);
      setShowClearMenu(false);
      // Сбрасываем редактирование при очистке
      resetEditingState();
    }
  });

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

  const sortTabs = useMemo(() => [
      { id: 'popular', label: 'Популярные' },
      { id: 'new', label: 'Сначала новые' }
  ], []);

  const currentSortIndex = sortTabs.findIndex(t => t.id === sort);

  useEffect(() => {
    if (currentSortIndex > prevSortIndex) setSortDirection('right');
    else if (currentSortIndex < prevSortIndex) setSortDirection('left');
    setPrevSortIndex(currentSortIndex);
  }, [currentSortIndex, prevSortIndex]);

  useEffect(() => {
     if (!numericPostId || !socket) return; 
     socket.emit('join_post_room', { postId: numericPostId });
     const handleRefresh = (payload?: any) => {
        refetch();
        if (payload && typeof payload.postCommentsCount === 'number') updateCacheCounter(payload.postCommentsCount);
        if (payload && typeof payload.newCommentsCount === 'number') updateCacheCounter(payload.newCommentsCount);
     };
     socket.on(`new_comment_for_post_${numericPostId}`, handleRefresh);
     socket.on(`comment_update_${numericPostId}`, handleRefresh);
     socket.on(`comment_edited_${numericPostId}`, handleRefresh);
     socket.on(`delete_comment_for_post_${numericPostId}`, handleRefresh);
     socket.on(`comments_bulk_deleted_${numericPostId}`, handleRefresh);
     socket.on(`comments_cleared_${numericPostId}`, handleRefresh);
     return () => {
        socket.emit('leave_post_room', { postId: numericPostId });
        socket.off(`new_comment_for_post_${numericPostId}`, handleRefresh);
        socket.off(`comment_update_${numericPostId}`, handleRefresh);
        socket.off(`comment_edited_${numericPostId}`, handleRefresh);
        socket.off(`delete_comment_for_post_${numericPostId}`, handleRefresh);
        socket.off(`comments_bulk_deleted_${numericPostId}`, handleRefresh);
        socket.off(`comments_cleared_${numericPostId}`, handleRefresh);
     };
  }, [numericPostId, socket, client, refetch]);
  
  useEffect(() => { if (replyTo && replyTextareaRef.current) replyTextareaRef.current.focus(); }, [replyTo]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clearMenuRef.current && !clearMenuRef.current.contains(event.target as Node)) {
        setShowClearMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

   useEffect(() => {
    if (highlightCommentId && data?.comments) {
      const findCommentAndParents = (commentsArray: CommentType[], targetId: number, currentPath: number[] = []): { comment: CommentType; path: number[] } | null => {
        for (const comment of commentsArray) {
          const newPath = [...currentPath, comment.id];
          if (comment.id === targetId) return { comment, path: newPath };
          if (comment.replies?.length > 0) {
            const foundInReplies = findCommentAndParents(comment.replies, targetId, newPath);
            if (foundInReplies) return foundInReplies;
          }
        }
        return null;
      };

      const found = findCommentAndParents(data.comments, highlightCommentId);
      if (found) {
        const { path } = found;
        setExpandedComments(prev => {
          const newSet = new Set(prev);
          path.slice(0, -1).forEach(id => newSet.add(id));
          return newSet;
        });
        setTimeout(() => {
          if (highlightedCommentRef.current) highlightedCommentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [highlightCommentId, data?.comments]);

  const handleSubmit = async () => {
    if (!input.trim() || isAnyEditing) return;
    let contentToSend = input;
    if (replyTo) contentToSend = `@${replyTo.username} ${input}`;
    try { await addComment({ variables: { postId: numericPostId, content: contentToSend, parentId: replyTo?.id } }); } catch (e) { console.error(e); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
    }
  };

  const handleReply = (comment: CommentType) => { 
      if (isAnyEditing) return;
      setReplyTo({ id: comment.id, username: comment.author.username, authorId: comment.author.id }); 
      setInput(''); 
  };

  const handleCancelReply = () => { setReplyTo(null); setInput(''); };
  
  const handleDeleteClick = (commentId: number) => { 
    setConfirmationState({
        isOpen: true,
        title: 'Удалить комментарий?',
        message: 'Это действие нельзя будет отменить. Вы уверены?',
        onConfirm: () => { if (commentId) deleteComment({ variables: { commentId } }); }
    });
  };

  const toggleExpand = (commentId: number) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) newSet.delete(commentId); else newSet.add(commentId);
      return newSet;
    });
  };

  const startEditing = (comment: CommentType) => { setEditingCommentId(comment.id); setEditContent(comment.content); };
  const cancelEditing = () => { setEditingCommentId(null); setEditContent(''); };
  const saveEditing = async () => {
    if (!editContent.trim()) return;
    if (editingCommentId === null) return;
    try { await updateComment({ variables: { commentId: editingCommentId, content: editContent } }); } catch (e) { console.error(e); }
  };

  const toggleSelectComment = (commentId: number) => {
    setSelectedCommentIds(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId); else next.add(commentId);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedCommentIds.size === 0) return;
    setConfirmationState({
        isOpen: true,
        title: `Удалить ${selectedCommentIds.size} комментария?`,
        message: 'Это действие нельзя будет отменить. Вы уверены?',
        onConfirm: () => { deleteManyComments({ variables: { commentIds: Array.from(selectedCommentIds) } }); }
    });
  };

  const handleClear = (type: 'ALL' | 'MINE' | 'OTHERS') => {
    setShowClearMenu(false);
    let title = '';
    if (type === 'MINE') title = 'Удалить все мои комментарии?';
    if (type === 'OTHERS') title = 'Удалить все чужие комментарии?';
    if (type === 'ALL') title = 'Удалить все комментарии в этом посте?';
    setConfirmationState({
        isOpen: true,
        title: title,
        message: 'Это действие нельзя будет отменить. Вы уверены?',
        onConfirm: () => { clearComments({ variables: { postId: numericPostId, type } }); }
    });
  };

  const handleEmojiClick = (emoji: string) => {
    const editor = replyTo ? replyTextareaRef.current : mainInputRef.current;
    if (editor) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            setInput(prev => prev + emoji);
        } else {
            const range = selection.getRangeAt(0);
            const frag = document.createDocumentFragment();
            const textNode = document.createTextNode(emoji);
            frag.appendChild(textNode);
            range.deleteContents();
            range.insertNode(frag);
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            const event = new Event('input', { bubbles: true });
            editor.dispatchEvent(event);
        }
        editor.focus(); 
    } else {
        setInput(prev => prev + emoji);
    }
  };

  const comments = data?.comments || [];
  const rootComments = comments.filter((c: CommentType) => !c.parentId);

  const renderContentWithMentions = (content: string) => {
    const emojiRegex = /(\p{Emoji_Presentation})/gu; 
    const mentionRegex = /(@[a-zA-Z0-9_]+)/g;
    const partsByMention = content.split(mentionRegex);

    return partsByMention.map((mentionPart, mentionIndex) => {
      if (mentionPart.match(mentionRegex)) {
        return <span key={`mention-${mentionIndex}`} className="text-blue-500 font-medium">{mentionPart}</span>;
      } else {
        const partsByEmoji = mentionPart.split(emojiRegex);
        return partsByEmoji.map((emojiPart, emojiIndex) => {
          if (!emojiPart) return null; 
          if (emojiPart.match(emojiRegex)) {
            const hex = toHex(emojiPart);
            if (hex && !/^[a-z0-9_]+$/i.test(emojiPart)) { 
              return (
                <img 
                  key={`emoji-${mentionIndex}-${emojiIndex}`}
                  src={`${APPLE_EMOJI_BASE_URL}${hex}.png`}
                  alt={emojiPart}
                  className="inline-block w-5 h-5 mx-px align-text-bottom" 
                />
              );
            }
          }
          return <span key={`text-${mentionIndex}-${emojiIndex}`}>{emojiPart}</span>;
        });
      }
    });
  };

  const renderComment = (comment: CommentType, isChild = false) => {
     const isLiked = comment.userVote === 'LIKE';
     const isDisliked = comment.userVote === 'DISLIKE';
     const hasReplies = comment.replies && comment.replies.length > 0;
     const isExpanded = expandedComments.has(comment.id);
     const isPostAuthorComment = comment.author.id === postAuthorId;
     const isEditing = editingCommentId === comment.id;
     const isMyComment = currentUserId === comment.author.id;
     const canDelete = isMyComment || (currentUserId === postAuthorId);
     const isSelected = selectedCommentIds.has(comment.id);

     return (
        <motion.div key={comment.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} ref={highlightCommentId === comment.id ? highlightedCommentRef : null} className={`flex gap-3 mb-4 ${isChild ? 'ml-10 mt-2' : ''}`}>
           {isSelectionMode && canDelete && (
             <div className="pt-2">
                <button onClick={() => toggleSelectComment(comment.id)} className="text-zinc-400 hover:text-lime-500 transition-colors cursor-pointer">
                   {isSelected ? <CheckSquare size={20} className="text-lime-500" /> : <Square size={20} />}
                </button>
             </div>
           )}
            <Avatar username={comment.author.username} name={comment.author.name} url={comment.author.avatar} size="sm" />
           <div className="flex-1 min-w-0">
              <div style={{ ...liquidCommentStyle, borderTopLeftRadius: 0 }} className="p-4 relative group transition-colors">
                  <div className="flex justify-between items-start mb-1">
                     <Link href={`/dashboard/user/${comment.author.id}`} className={`font-bold text-sm hover:underline flex items-center gap-1 ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>
                        {comment.author.name || comment.author.username}
                        {isPostAuthorComment && (
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide ${isDarkMode ? 'bg-lime-400/10 text-lime-400' : 'bg-lime-100 text-lime-700'}`}>Автор</span>
                        )}
                     </Link>
                     <span className="text-xs text-zinc-500">{formatTimeAgo(comment.createdAt)}</span>
                  </div>

                  {isEditing ? (
                      <div className="my-2">
                          <textarea 
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className={`w-full p-2 rounded-xl text-sm outline-none resize-none border ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}
                              rows={2}
                              autoFocus
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                              <button onClick={cancelEditing} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-700 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}`}><X size={16} /></button>
                              <button onClick={saveEditing} className="p-1.5 bg-lime-400 hover:bg-lime-500 text-black rounded-lg transition-colors cursor-pointer"><Check size={16} /></button>
                          </div>
                      </div>
                  ) : (
                      <p className={`text-sm whitespace-pre-wrap mb-3 wrap-break-words ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>
                        {renderContentWithMentions(comment.content)}
                      </p>
                  )}

                  {!isSelectionMode && (
                    <div className={`flex items-center gap-4 text-xs font-bold pt-2 border-t ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                        <LikesTooltip id={comment.id} type="comment" count={comment.likesCount}>
                            <button onClick={() => voteComment({ variables: { commentId: comment.id, type: 'LIKE' } })} className={`flex items-center gap-1.5 transition-colors cursor-pointer ${isLiked ? 'text-green-600' : 'text-zinc-500 hover:text-green-600'}`}>
                                <ThumbsUp size={14} className={isLiked ? "fill-green-500 text-green-500" : ""} /> 
                                {comment.likesCount > 0 && <span>{comment.likesCount}</span>}
                            </button>
                        </LikesTooltip>
                        <button onClick={() => voteComment({ variables: { commentId: comment.id, type: 'DISLIKE' } })} className={`flex items-center gap-1 transition-colors cursor-pointer ${isDisliked ? 'text-red-500' : 'text-zinc-500 hover:text-red-500'}`}>
                            <ThumbsDown size={14} className={isDisliked ? "fill-red-500 text-red-500" : ""} /> 
                        </button>
                        
                        <button 
                            onClick={() => handleReply(comment)} 
                            disabled={isAnyEditing}
                            className={`transition-colors cursor-pointer ${isAnyEditing ? 'opacity-30 cursor-not-allowed' : 'text-zinc-500 hover:text-blue-500'}`}
                        >
                            Ответить
                        </button>

                        {isMyComment && !isEditing && (
                            <button onClick={() => startEditing(comment)} className="text-zinc-500 hover:text-yellow-500 transition-colors flex items-center gap-1 cursor-pointer"><Edit2 size={12} /></button>
                        )}
                        {canDelete && (
                            <button onClick={() => handleDeleteClick(comment.id)} className="text-zinc-400 hover:text-red-600 ml-auto transition-colors flex items-center gap-1 cursor-pointer">Удалить</button>
                        )}
                    </div>
                  )}
              </div>
              
              {hasReplies && (
                <button onClick={() => toggleExpand(comment.id)} className={`flex items-center gap-1 text-xs font-bold mt-2 ml-4 p-1 rounded-md transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                  <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'} cursor-pointer`} />
                  {isExpanded ? 'Свернуть' : `Показать ${comment.replies.length} ответ(а)`}
                </button>
              )}

              <AnimatePresence initial={false}>
                {isExpanded && hasReplies && comment.replies?.map((reply: CommentType) => renderComment(reply, true))}
              </AnimatePresence>
           </div>
        </motion.div>
     );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .comment-liquid-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 48px;
          padding: 4px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
        .comment-liquid-option {
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
          font-weight: 600;
          cursor: pointer;
          transition: color 160ms;
        }
        .comment-liquid-option:hover { color: var(--c-action); }
        .comment-liquid-option[data-active="true"] { color: var(--c-content); cursor: default; }
        .comment-liquid-blob {
            border-radius: 99em;
            background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
            box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
      `}} />

      <ConfirmationModal isOpen={confirmationState.isOpen} onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })} onConfirm={confirmationState.onConfirm} title={confirmationState.title} message={confirmationState.message} />
      <div>
        <div className={`relative flex gap-2 mb-1 transition-all duration-300 ${isAnyEditing ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>
           <div className="flex-1 relative w-0">
              <div className={`text-xs mb-2 text-left font-medium opacity-70 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                 Enter — отправить, Shift+Enter — перенос
              </div>
              {replyTo ? (
               <div className={`w-full rounded-xl p-3 flex items-center gap-2 pr-12 transition-all min-h-12 relative border ${isDarkMode ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}>
                    <span className={`text-sm font-semibold rounded-md px-2 py-0.5 whitespace-nowrap shrink-0 ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>@{replyTo.username}</span>
                    <RichEmojiInput
                        ref={replyTextareaRef}
                        value={input}
                        onChange={setInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Напишите ответ..."
                        isDarkMode={isDarkMode}
                        className="flex-1 min-h-6 self-stretch"
                        textPaddingRightPx={80}
                        disabled={isAnyEditing}
                    />
                    <div className="flex items-center absolute right-1 top-1/2 -translate-y-1/2 z-10">
                        <Tooltip content="Отменить ответ" position="top">
                            <button onClick={handleCancelReply} className="bg-red-500 text-white rounded-xl p-1.5 transition-colors hover:bg-red-600 flex items-center justify-center mr-1 cursor-pointer">
                                <ArrowLeft size={16} />
                            </button>
                        </Tooltip>
                        <button 
                            ref={emojiButtonRef}
                            onClick={() => togglePicker(emojiButtonRef, handleEmojiClick)}
                            className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer
                                ${isDarkMode 
                                    ? (isPickerOpen ? 'bg-lime-400/20 text-lime-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700') 
                                    : (isPickerOpen ? 'bg-lime-100 text-lime-600' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100')}`}
                        >
                            <Smile size={20} />
                        </button>
                    </div>
                </div>
              ) : (
                <div className={`relative w-full rounded-xl border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300/50'}`}>
                    <RichEmojiInput
                        ref={mainInputRef}
                        value={input}
                        onChange={setInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Написать комментарий..."
                        isDarkMode={isDarkMode}
                        className="w-full min-h-12 self-stretch"
                        textPaddingRightPx={40}
                        disabled={isAnyEditing}
                    />
                    <button 
                        ref={emojiButtonRef}
                        onClick={() => togglePicker(emojiButtonRef, handleEmojiClick)}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer
                            ${isDarkMode 
                                ? (isPickerOpen ? 'bg-lime-400/20 text-lime-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700') 
                                : (isPickerOpen ? 'bg-lime-100 text-lime-600' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100')}`}
                    >
                        <Smile size={20} />
                    </button>
                </div>
              )}
           </div>
           <button onClick={handleSubmit} disabled={isAnyEditing || isSelectionMode || !input.trim()} className="h-12 w-12 bg-lime-400 rounded-xl flex items-center justify-center text-black font-bold hover:bg-lime-500 transition-colors shrink-0 disabled:opacity-50 self-end cursor-pointer"><CornerDownRight size={20} /></button>
        </div>

        <div className="flex flex-wrap justify-between items-center mb-4 px-1 gap-2 mt-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{comments.length || 0} Комментариев</span>

            {comments.length > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                    {isSelectionMode ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5 duration-200">
                            <button onClick={() => { setIsSelectionMode(false); setSelectedCommentIds(new Set()); }} className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'}`}>
                                Отмена
                            </button>
                            <button onClick={handleBulkDelete} disabled={selectedCommentIds.size === 0} className="px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors flex items-center gap-2 bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 cursor-pointer">
                                Удалить ({selectedCommentIds.size})
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Tooltip content="Выбрать комментарии" position="top">
                                <button onClick={() => setIsSelectionMode(true)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-200'}`}>
                                    <CheckSquare size={18} />
                                </button>
                            </Tooltip>
                            <div className="relative" ref={clearMenuRef}>
                                <Tooltip content="Очистить..." position="top">
                                    <button onClick={() => setShowClearMenu(!showClearMenu)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-200'}`}>
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                                <AnimatePresence>
                                    {showClearMenu && (
                                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className={`absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-xl z-50 border p-1 ${isDarkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                                            <div className={`px-2 py-1 text-[10px] font-bold uppercase ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Удалить</div>
                                            
                                            {(() => {
                                                const hasMyComments = comments.some(c => c.author.id === currentUserId || c.replies.some(r => r.author.id === currentUserId));
                                                return (
                                                    <button 
                                                        onClick={() => handleClear('MINE')} 
                                                        disabled={!hasMyComments}
                                                        className={`w-full text-left px-2 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${isDarkMode ? 'text-zinc-200 hover:bg-zinc-800' : 'text-zinc-800 hover:bg-zinc-100'}`}
                                                    >
                                                        Только мои
                                                    </button>
                                                );
                                            })()}

                                            {currentUserId === postAuthorId && ( <>
                                                    <button onClick={() => handleClear('OTHERS')} className={`w-full text-left px-2 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-200 hover:bg-zinc-800' : 'text-zinc-800 hover:bg-zinc-100'}`}>Только чужие</button>
                                                    <div className={`h-px my-1 ${isDarkMode ? 'bg-zinc-700' : 'bg-zinc-100'}`} />
                                                    <button onClick={() => handleClear('ALL')} className="w-full text-left px-2 py-1.5 text-sm rounded-lg font-medium text-red-500 transition-colors hover:bg-red-500/10 cursor-pointer">Все комментарии</button>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="comment-liquid-switcher" style={liquidGlassStyles} data-active-index={currentSortIndex} data-direction={sortDirection}>
                {sortTabs.map(tab => {
                    const isActive = sort === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setSort(tab.id as 'popular' | 'new')}
                            className="comment-liquid-option relative"
                            data-active={isActive}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId={`comment-sort-blob-${postId}`}
                                    className="comment-liquid-blob absolute inset-0 z-0"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
        <div className="space-y-2">
            <AnimatePresence>
              {rootComments.map((c: CommentType) => renderComment(c))}
            </AnimatePresence>
        </div>
      </div>
    </>
  );
}