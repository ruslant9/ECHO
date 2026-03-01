'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';
import { 
  Heart, MessageCircle, Repeat, Loader, X, Send, 
  Trash2, Play, Pause, ChevronUp, ChevronDown, CheckCircle, Clapperboard,
  RotateCcw, FastForward, Lock
} from 'lucide-react';
import Avatar from '@/components/Avatar';
import ConfirmationModal from '@/components/ConfirmationModal';
import ActionUsersListModal from '@/components/ActionUsersListModal'; 
import Tooltip from '@/components/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from '@/lib/time-ago';
import Link from 'next/link';
import Toast from '@/components/Toast';
import { formatViewsCount } from '@/lib/format-number';
import { useMusicPlayer } from '@/context/MusicPlayerContext'; 

const GET_VIBE_LIKES = gql`
  query GetVibeLikes($vibeId: Int!) {
    getVibeLikes(vibeId: $vibeId) { id username name avatar }
  }
`;

const GET_VIBE_REPOSTERS = gql`
  query GetVibeReposters($vibeId: Int!) {
    getVibeReposters(vibeId: $vibeId) { id username name avatar friendshipStatus }
  }
`;

const GET_VIBES = gql`
  query GetVibes($feedType: String!) {
    getVibesFeed(feedType: $feedType) {
      id videoUrl description hashtags likesCount commentsCount repostsCount createdAt isLikedByUser authorId isPrivate
      author { id username name avatar }
    }
    me { id }
  }
`;

const GET_SINGLE_VIBE = gql`
  query GetSingleVibe($id: Int!) {
    vibe(id: $id) {
      id videoUrl description hashtags likesCount commentsCount repostsCount createdAt isLikedByUser authorId isPrivate
      author { id username name avatar }
    }
  }
`;

const INCREMENT_VIEWS = gql`
  mutation IncrementVibeViews($vibeId: Int!) {
    incrementVibeViews(vibeId: $vibeId)
  }
`;

const TOGGLE_LIKE = gql`mutation ToggleVibeLike($vibeId: Int!) { toggleVibeLike(vibeId: $vibeId) }`;
const REPOST_VIBE = gql`mutation RepostVibe($vibeId: Int!) { repostVibe(vibeId: $vibeId) }`;
const GET_COMMENTS = gql`query GetVibeComments($vibeId: Int!) { getVibeComments(vibeId: $vibeId) { id content createdAt authorId author { id username name avatar } } }`;
const ADD_COMMENT = gql`mutation AddVibeComment($vibeId: Int!, $content: String!) { addVibeComment(vibeId: $vibeId, content: $content) }`;
const DELETE_COMMENT = gql`mutation DeleteVibeComment($commentId: Int!) { deleteVibeComment(commentId: $commentId) }`;

interface FeedVibe {
  uniqueKey: string;
  data: any;
}

export default function VibesPage() {
  const { closePlayer } = useMusicPlayer();
  const [feedType, setFeedType] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
  const [vibesList, setVibesList] = useState<FeedVibe[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [isAutoScroll, setIsAutoScroll] = useState(false);
  const [activeVibeId, setActiveVibeId] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  
  const initialVibeId = searchParams.get('vibeId');
  const initialCommentId = searchParams.get('commentId');

  useEffect(() => {
    closePlayer();
  }, [closePlayer]);

  const { data: singleVibeData } = useQuery(GET_SINGLE_VIBE, {
    variables: { id: Number(initialVibeId) },
    skip: !initialVibeId,
    fetchPolicy: 'network-only',
  });

  const { data, refetch, loading } = useQuery(GET_VIBES, { 
    variables: { feedType }, 
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  
  const [toggleLike] = useMutation(TOGGLE_LIKE);
  const [repostVibe] = useMutation(REPOST_VIBE);

  const currentUserId = data?.me?.id;

  const handleTabChange = (type: 'FOR_YOU' | 'FOLLOWING') => {
    if (type !== feedType) {
      setFeedType(type);
      setVibesList([]);
    }
  };

  useEffect(() => {
    if (data?.getVibesFeed) {
      setVibesList((prev) => {
        let newFeed = data.getVibesFeed;

        if (initialVibeId && singleVibeData?.vibe && prev.length === 0) {
           newFeed = newFeed.filter((v: any) => v.id !== singleVibeData.vibe.id);
           newFeed = [singleVibeData.vibe, ...newFeed];
        }

        if (feedType === 'FOLLOWING') {
          return newFeed.map((v: any) => ({ uniqueKey: String(v.id), data: v }));
        } else {
          const newItems = newFeed.map((v: any) => ({
            uniqueKey: `${v.id}-${Date.now()}-${Math.random()}`,
            data: v
          }));
          if (prev.length === 0) return newItems;
          return [...prev, ...newItems];
        }
      });
      setIsFetchingMore(false);
    }
  }, [data, singleVibeData, feedType, initialVibeId]);

  useEffect(() => {
    if (initialVibeId && vibesList.length > 0) {
      const element = document.getElementById(`vibe-${initialVibeId}`);
      if (element) element.scrollIntoView({ behavior: 'auto' });
    }
  }, [initialVibeId, vibesList.length]);

  useEffect(() => {
    if (feedType !== 'FOR_YOU') return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && !isFetchingMore) {
        setIsFetchingMore(true);
        refetch();
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, isFetchingMore, feedType, refetch]);

  const scrollFeed = (direction: 'up' | 'down') => {
    if (containerRef.current) {
      const vh = containerRef.current.clientHeight;
      containerRef.current.scrollBy({ top: direction === 'up' ? -vh : vh, behavior: 'smooth' });
    }
  };

  const handleRepostAction = async (vibeId: number) => {
    try {
      await repostVibe({ variables: { vibeId } });
      setToast({ message: 'Вайб репостнут в вашу ленту!', type: 'success' });
    } catch (e) {
      setToast({ message: 'Ошибка при репосте', type: 'error' });
    }
  };
  
  const triggerRestart = () => {
    if (activeVibeId) {
        const event = new CustomEvent(`restart-vibe-${activeVibeId}`);
        window.dispatchEvent(event);
    }
  };

  return (
    <div className="h-full w-full flex justify-center bg-black relative overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="absolute top-20 left-0 right-0 z-40 flex justify-center items-center pointer-events-none">
        <div className="flex items-center gap-4 text-lg font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] pointer-events-auto">
          <button 
            onClick={() => handleTabChange('FOLLOWING')} 
            className={`transition-all cursor-pointer ${feedType === 'FOLLOWING' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Подписки
          </button>
          <span className="text-white/30">|</span>
          <button 
            onClick={() => handleTabChange('FOR_YOU')} 
            className={`transition-all cursor-pointer ${feedType === 'FOR_YOU' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
          >
            Рекомендации
          </button>
        </div>
      </div>

      <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50 pointer-events-auto">
        
        <Tooltip content="Начать заново" position="left">
            <button 
              onClick={triggerRestart} 
              className="p-3 rounded-full bg-white/10 hover:bg-lime-400 hover:text-black text-white backdrop-blur-md transition-all border border-white/10 shadow-xl cursor-pointer"
            >
              <RotateCcw size={24} />
            </button>
         </Tooltip>

         <Tooltip content={isAutoScroll ? "Выключить автопрокрутку" : "Включить автопрокрутку"} position="left">
            <button 
              onClick={() => setIsAutoScroll(!isAutoScroll)} 
              className={`p-3 rounded-full backdrop-blur-md transition-all border shadow-xl cursor-pointer
                ${isAutoScroll ? 'bg-lime-400 text-black border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.6)]' : 'bg-white/10 hover:bg-lime-400 hover:text-black text-white border-white/10'}
              `}
            >
              <FastForward size={24} className={isAutoScroll ? 'fill-current' : ''} />
            </button>
         </Tooltip>

        <div className="h-px w-full bg-white/20 my-2" />

        <Tooltip content="Предыдущее видео" position="left">
          <button onClick={() => scrollFeed('up')} className="p-3 rounded-full bg-white/10 hover:bg-lime-400 hover:text-black text-white backdrop-blur-md transition-all border border-white/10 shadow-xl cursor-pointer">
            <ChevronUp size={28} />
          </button>
        </Tooltip>
        
        <Tooltip content="Следующее видео" position="left">
          <button onClick={() => scrollFeed('down')} className="p-3 rounded-full bg-white/10 hover:bg-lime-400 hover:text-black text-white backdrop-blur-md transition-all border border-white/10 shadow-xl cursor-pointer">
            <ChevronDown size={28} />
          </button>
        </Tooltip>
      </div>

      {loading && vibesList.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
           <Loader className="animate-spin text-lime-400" size={40} />
        </div>
      )}

      <div ref={containerRef} className="h-full w-full max-w-md snap-y snap-mandatory overflow-y-scroll no-scrollbar relative scroll-smooth bg-zinc-950">
        
        {vibesList.map((item) => (
          <div key={item.uniqueKey} id={feedType === 'FOLLOWING' || String(item.data.id) === initialVibeId ? `vibe-${item.data.id}` : undefined} className="h-full w-full snap-start">
            <VibePlayer 
              vibe={item.data} 
              currentUserId={currentUserId}
              onLike={() => toggleLike({ variables: { vibeId: item.data.id } })} 
              onRepost={() => handleRepostAction(item.data.id)}
              initialOpenCommentId={initialVibeId === String(item.data.id) ? initialCommentId : null}
              isAutoScroll={isAutoScroll}
              onVisible={() => setActiveVibeId(item.data.id)}
            />
          </div>
        ))}
        
        {feedType === 'FOLLOWING' && vibesList.length > 0 && !loading && (
          <div className="h-full w-full snap-start flex flex-col items-center justify-center text-center p-8 bg-zinc-950 text-white">
             <motion.div initial={{ scale: 0.5, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                <CheckCircle size={40} className="text-lime-400" />
             </motion.div>
             <h3 className="text-2xl font-bold mb-2">Вы посмотрели всё!</h3>
             <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                Новых вайбов от друзей пока нет. Загляните в рекомендации!
             </p>
             <button 
               onClick={() => {
                 if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
               }}
               className="mt-8 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-bold transition-colors cursor-pointer"
             >
               Вернуться в начало
             </button>
          </div>
        )}

        {feedType === 'FOR_YOU' && vibesList.length > 0 && (
          <div ref={loadMoreRef} className="h-full w-full snap-start flex flex-col items-center justify-center bg-zinc-950">
            {(loading || isFetchingMore) && <Loader className="animate-spin text-lime-400" size={40} />}
          </div>
        )}
        
        {vibesList.length === 0 && !loading && (
          <div className="h-full w-full snap-start flex flex-col items-center justify-center text-center p-8 bg-zinc-950 text-white">
             <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                <Clapperboard size={40} className="text-zinc-600" />
             </div>
             <h3 className="text-xl font-bold mb-2">Здесь пока пусто</h3>
             <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                {feedType === 'FOLLOWING' 
                  ? 'Подпишитесь на кого-нибудь или добавьте друзей, чтобы видеть их вайбы.' 
                  : 'Никто еще не выложил вайб. Будьте первыми!'}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}

function VibePlayer({ vibe, onLike, onRepost, currentUserId, initialOpenCommentId, isAutoScroll, onVisible }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(!!initialOpenCommentId);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);
  const [isRepostsModalOpen, setIsRepostsModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showIcon, setShowIcon] = useState<'play' | 'pause' | 'restart' | null>(null);
  const iconTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isLiked, setIsLiked] = useState(vibe.isLikedByUser);
  const [likesCount, setLikesCount] = useState(vibe.likesCount);
  const [repostsCount, setRepostsCount] = useState(vibe.repostsCount);

  const isMyVibe = currentUserId === vibe.authorId;

  const [incrementViews] = useMutation(INCREMENT_VIEWS);
  const viewCountedRef = useRef(false);

  const { data: repostersData } = useQuery(GET_VIBE_REPOSTERS, {
    variables: { vibeId: vibe.id },
    skip: !isMyVibe || vibe.repostsCount === 0,
    fetchPolicy: 'network-only' 
  });
  const reposters = repostersData?.getVibeReposters || [];
  const knownReposters = reposters.filter((u: any) => u.friendshipStatus === 'FRIEND' || u.friendshipStatus === 'REQUEST_SENT');

  useEffect(() => {
    const handleRestartEvent = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play();
            setIsPlaying(true);
            triggerIcon('restart');
        }
    };
    window.addEventListener(`restart-vibe-${vibe.id}`, handleRestartEvent);
    return () => window.removeEventListener(`restart-vibe-${vibe.id}`, handleRestartEvent);
  }, [vibe.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
          onVisible();
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
          setIsCommentsOpen(false);
          setIsLikesModalOpen(false);
          setIsRepostsModalOpen(false);
          viewCountedRef.current = false; 
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [onVisible]);

  useEffect(() => {
    if (initialOpenCommentId) {
        setIsCommentsOpen(true);
    }
  }, [initialOpenCommentId]);

  const triggerIcon = (type: 'play' | 'pause' | 'restart') => {
    setShowIcon(type);
    if (iconTimeout.current) clearTimeout(iconTimeout.current);
    iconTimeout.current = setTimeout(() => setShowIcon(null), 800);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerIcon('pause');
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        triggerIcon('play');
      }).catch(() => {});
    }
  };

  const handleVideoEnded = () => {
    if (isAutoScroll) {
      const currentEl = videoRef.current?.closest('.snap-start');
      const nextEl = currentEl?.nextElementSibling;
      if (nextEl) {
        nextEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        videoRef.current?.play();
      }
    }
  };

  const handlePointerDownTimeline = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const updateVideoProgress = (clientX: number) => {
      if (!videoRef.current || !progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      videoRef.current.currentTime = pos * videoRef.current.duration;
    };

    updateVideoProgress(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateVideoProgress(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikesCount((prev: number) => isLiked ? prev - 1 : prev + 1);
    onLike(); 
  };

  const handleRepostClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRepostsCount((prev: number) => prev + 1);
    onRepost();
  };

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400';
  const videoSrc = vibe.videoUrl.startsWith('http') ? vibe.videoUrl : `${backendUrl}${vibe.videoUrl}`;

  return (
    <div className="h-full w-full relative bg-zinc-900 flex items-center justify-center overflow-hidden group">
      
      {isMyVibe && (
        <>
          <ActionUsersListModal isOpen={isLikesModalOpen} onClose={() => setIsLikesModalOpen(false)} title="Лайкнули вайб" query={GET_VIBE_LIKES} variables={{ vibeId: vibe.id }} />
          <ActionUsersListModal isOpen={isRepostsModalOpen} onClose={() => setIsRepostsModalOpen(false)} title="Репостнули вайб" query={GET_VIBE_REPOSTERS} variables={{ vibeId: vibe.id }} />
        </>
      )}

      <AnimatePresence>
        {showIcon && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/40 p-4 rounded-full text-white backdrop-blur-md">
              {showIcon === 'play' && <Play size={48} className="fill-current ml-1" />}
              {showIcon === 'pause' && <Pause size={48} className="fill-current" />}
              {showIcon === 'restart' && <RotateCcw size={48} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <video 
        ref={videoRef} 
        src={videoSrc} 
        className="w-full h-full object-contain pointer-events-none" 
        loop={!isAutoScroll} 
        onEnded={handleVideoEnded}
        playsInline 
        controls={false} 
        onTimeUpdate={() => { 
          if(videoRef.current) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100); 
            if (!viewCountedRef.current && videoRef.current.currentTime > 2) {
              viewCountedRef.current = true;
              incrementViews({ variables: { vibeId: vibe.id } }).catch(() => {});
            }
          }
        }}
      />
      
      <div className="absolute inset-0 z-10 cursor-pointer bg-black/[0.001]" onClick={togglePlay} />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between text-white pb-12 z-20 pointer-events-none">
        <div className="flex-1 pr-12 pointer-events-auto">
          
          {isMyVibe && repostsCount > 0 && knownReposters.length > 0 && (
            <div 
              onClick={(e) => { e.stopPropagation(); setIsRepostsModalOpen(true); }}
              className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-xs font-bold text-white shadow-sm cursor-pointer transition-colors border border-white/10"
            >
              <Repeat size={12} className="text-green-400" />
              {knownReposters.length === 1 
                 ? `Репостнул(а) ${knownReposters[0].name || knownReposters[0].username}`
                 : `Репостнули ${knownReposters.length} (посмотреть)`
              }
            </div>
          )}

          <Link href={`/dashboard/user/${vibe.author.id}`} onClick={e => e.stopPropagation()} className="flex items-center gap-3 mb-2 w-fit">
            <Avatar url={vibe.author.avatar} username={vibe.author.username} name={vibe.author.name} size="md" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                  <span className="font-bold drop-shadow-md hover:underline">{vibe.author.name || vibe.author.username}</span>
                  {vibe.isPrivate && (
                      <Tooltip content="Приватный вайб" position="right">
                          <Lock size={12} className="text-white/60" />
                      </Tooltip>
                  )}
              </div>
              <span className="text-[10px] text-white/70">{formatTimeAgo(vibe.createdAt)}</span>
            </div>
          </Link>
          <p className="text-sm mb-1 drop-shadow-md">{vibe.description}</p>
          <div className="flex flex-wrap gap-1">
            {vibe.hashtags?.map((tag: string, i: number) => <span key={i} className="text-lime-400 text-xs font-bold">#{tag}</span>)}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 pb-2 relative z-30 pointer-events-auto">
          <div className="flex flex-col items-center gap-1">
            <Tooltip content={isLiked ? "Убрать лайк" : "Лайк"} position="left">
                <button onClick={handleLikeClick} className="hover:scale-110 transition-transform cursor-pointer">
                <div className={`p-3 rounded-full ${isLiked ? 'bg-red-500 text-white' : 'bg-black/40 text-white backdrop-blur-md'}`}>
                    <Heart size={24} className={isLiked ? "fill-current" : ""} />
                </div>
                </button>
            </Tooltip>
            <button 
              onClick={(e) => { e.stopPropagation(); if (likesCount > 0 && isMyVibe) setIsLikesModalOpen(true); }} 
              className={`transition-transform ${likesCount > 0 && isMyVibe ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`text-xs font-bold drop-shadow-md ${likesCount > 0 && isMyVibe ? 'hover:underline' : ''}`}>
                {formatViewsCount(likesCount)}
              </span>
            </button>
          </div>

          <Tooltip content="Комментарии" position="left">
            <button onClick={(e) => { e.stopPropagation(); setIsCommentsOpen(true); }} className="flex flex-col items-center gap-1 hover:scale-110 transition-transform cursor-pointer">
                <div className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md"><MessageCircle size={24} /></div>
                <span className="text-xs font-bold drop-shadow-md">{formatViewsCount(vibe.commentsCount || 0)}</span>
            </button>
          </Tooltip>

          <div className="flex flex-col items-center gap-1">
            <Tooltip content="Репост" position="left">
                <button onClick={handleRepostClick} className="hover:scale-110 transition-transform cursor-pointer">
                <div className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md"><Repeat size={24} /></div>
                </button>
            </Tooltip>
            <button 
              onClick={(e) => { e.stopPropagation(); if (repostsCount > 0 && isMyVibe) setIsRepostsModalOpen(true); }} 
              className={`transition-transform ${repostsCount > 0 && isMyVibe ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`text-xs font-bold drop-shadow-md ${repostsCount > 0 && isMyVibe ? 'hover:underline' : ''}`}>
                {formatViewsCount(repostsCount || 0)}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={progressBarRef}
        className="absolute bottom-0 left-0 right-0 h-6 bg-transparent z-40 cursor-pointer group/progress flex items-end"
        onPointerDown={handlePointerDownTimeline}
      >
        <div className="w-full h-1.5 group-hover/progress:h-3 bg-white/20 transition-all duration-200 backdrop-blur-sm relative">
            <div className="h-full bg-lime-400 shadow-[0_0_10px_#a3e635] transition-all duration-75 ease-linear relative" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-md translate-x-1/2" />
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isCommentsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCommentsOpen(false)} className="fixed inset-0 bg-black/60 z-9998 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[75vh] bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl z-9999 flex flex-col border-t border-white/10">
               <div className="p-4 border-b border-white/10 flex justify-between items-center">
                  <h3 className="font-bold text-white">Комментарии ({vibe.commentsCount || 0})</h3>
                  <button onClick={() => setIsCommentsOpen(false)} className="p-1.5 bg-white/10 rounded-full text-white cursor-pointer"><X size={18}/></button>
               </div>
               <div className="flex-1 overflow-y-auto">
                 <VibeCommentsList 
                    vibeId={vibe.id} 
                    currentUserId={currentUserId} 
                    vibeAuthorId={vibe.authorId} 
                    onCommentUpdate={() => {}} 
                    highlightCommentId={initialOpenCommentId} 
                 />
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function VibeCommentsList({ vibeId, currentUserId, vibeAuthorId, onCommentUpdate, highlightCommentId }: any) {
  const { data, loading, refetch } = useQuery(GET_COMMENTS, { variables: { vibeId }, fetchPolicy: 'network-only' });
  const [addComment, { loading: sending }] = useMutation(ADD_COMMENT, { onCompleted: () => { setInput(''); refetch(); onCommentUpdate(); } });
  const [deleteComment] = useMutation(DELETE_COMMENT, { onCompleted: () => { refetch(); onCommentUpdate(); setIsDeleteModalOpen(false); setCommentToDelete(null); } });
  
  const [input, setInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

  const comments = data?.getVibeComments || [];

  useEffect(() => {
    if (!loading && comments.length > 0 && highlightCommentId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`vibe-comment-${highlightCommentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-lime-900/30', 'border-lime-500/50');
          setTimeout(() => {
            element.classList.remove('bg-lime-900/30', 'border-lime-500/50');
          }, 3000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, comments, highlightCommentId]);

  return (
    <div className="flex flex-col h-full">
      <ConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={() => commentToDelete && deleteComment({ variables: { commentId: commentToDelete } })} title="Удалить?" message="Это действие необратимо." />
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
        {loading && <div className="text-center text-white/50 text-sm py-4">Загрузка...</div>}
        {comments.map((c: any) => (
          <div 
            key={c.id} 
            id={`vibe-comment-${c.id}`} 
            className="flex gap-3 group p-2 rounded-xl border border-transparent transition-all duration-700" 
          >
            <Avatar url={c.author.avatar} username={c.author.username} name={c.author.name} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-sm text-white/90">{c.author.name || c.author.username}</span>
                <span className="text-[10px] text-white/40">{formatTimeAgo(c.createdAt)}</span>
                {(currentUserId === c.authorId || currentUserId === vibeAuthorId) && (
                  <button onClick={() => { setCommentToDelete(c.id); setIsDeleteModalOpen(true); }} className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition-opacity cursor-pointer"><Trash2 size={14} /></button>
                )}
              </div>
              <p className="text-sm text-white/80 wrap-break-words">{c.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && !loading && <div className="text-center text-white/30 text-xs py-10">Будьте первым, кто оставит комментарий</div>}
      </div>
      
      <form onSubmit={(e) => { e.preventDefault(); if(input.trim() && !sending) addComment({ variables: { vibeId, content: input } }); }} className="p-4 border-t border-white/10 bg-zinc-900 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ваш комментарий..." className="flex-1 bg-white/5 text-white text-sm px-4 py-3 rounded-2xl outline-none focus:bg-white/10 transition-colors" />
        <button type="submit" disabled={!input.trim() || sending} className="p-3 bg-lime-400 rounded-2xl cursor-pointer text-black disabled:opacity-50 active:scale-95 transition-all">
          {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18}/>}
        </button>
      </form>
    </div>
  );
}