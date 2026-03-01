// frontend/components/messages/ConversationList.tsx
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, Archive, ChevronDown, Hash, Users, Globe, Undo2, Trash2 } from 'lucide-react';
import ConversationItem from './ConversationItem';
import MessageUserModal from '@/components/MessageUserModal';
import { Conversation } from '@/types/messages';
import { gql, useQuery, useMutation } from '@apollo/client';
import Avatar from '@/components/Avatar';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';

const GET_CONVERSATIONS = gql`
  query GetConversations {
    conversations {
      id 
      updatedAt 
      unreadCount 
      isPinned 
      pinOrder
      mutedUntil
      isManuallyUnread
      
      isGroup
      type
      title
      avatar
      description
      slug
      
      myRole
      hasLeft
      participantsCount
      lastMessage { 
        id
        content 
        createdAt 
        senderId
        images 
        isRead 
        reactions {
          id
          userId
          emoji
        }
      }
      participant { 
        id 
        username 
        name 
        avatar 
        isOnline 
        lastOnlineAt
        amIBlocked
        isBlockedByMe
      }
    }
    archivedConversations {
      id 
      updatedAt 
      unreadCount 
      isPinned 
      pinOrder
      mutedUntil
      isManuallyUnread
      
      isGroup
      type
      title
      avatar
      description
      slug

      myRole
      hasLeft
      participantsCount
      lastMessage { 
        id
        content 
        createdAt 
        senderId 
        isRead 
        images
        reactions {
          id
          userId
          emoji
        }
      }
      participant { 
        id 
        username 
        name 
        avatar 
        isOnline 
        lastOnlineAt
        amIBlocked
        isBlockedByMe
      }
      isArchived 
    }
  }
`;

const SEARCH_GLOBAL = gql`
  query SearchGlobal($query: String!) {
    searchConversations(query: $query) {
      id
      title
      avatar
      slug
      participantsCount
      type
      description
    }
  }
`;

const DELETE_CONVERSATION = gql`mutation DeleteConversation($conversationId: Int!, $type: String!) { deleteConversation(conversationId: $conversationId, type: $type) }`;

const UPDATE_PIN_ORDER = gql`
  mutation UpdatePinOrder($conversationIds: [Int!]!) {
    updatePinOrder(conversationIds: $conversationIds)
  }
`;

const GET_SIDEBAR_COUNTS_FOR_REFETCH = gql`
  query GetSidebarCounts {
    incomingRequests { id }
    myNotifications { id isRead }
    unreadConversationsCount 
  }
`;

const GET_ALL_CONVERSATIONS_FOR_REFETCH = gql`
  query GetAllConversations {
    conversations { id }
    archivedConversations { id }
  }
`;

const UndoToast = ({ onUndo, timeLeft }: { onUndo: () => void, timeLeft: number }) => {
    const progress = (timeLeft / 5000) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white rounded-2xl shadow-2xl flex items-center gap-4 p-3 pr-4 border border-zinc-800 min-w-[300px]"
        >
            <div className="relative w-8 h-8 flex items-center justify-center">
                 <svg className="w-full h-full -rotate-90">
                    <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle 
                        cx="16" cy="16" r="14" fill="none" stroke="#ef4444" strokeWidth="3"
                        strokeDasharray="88"
                        strokeDashoffset={88 - (88 * progress) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-100 ease-linear"
                    />
                 </svg>
                 <Trash2 size={14} className="absolute text-red-500" />
            </div>
            
            <div className="flex-1">
                <p className="text-sm font-bold">Диалог удален</p>
                <p className="text-xs text-zinc-400">Отменить действие?</p>
            </div>

            <button 
                onClick={onUndo} 
                className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-white/10"
            >
                <Undo2 size={16} /> Отменить
            </button>
        </motion.div>
    );
};

interface ConversationListProps {
  conversations: Conversation[];
  archivedConversations: Conversation[];
  activeConvId: number | null;
  onSelect: (id: number) => void;
  onRefetch: () => void;
  isDarkMode: boolean;
  myId: number;
  typingByConversation: Map<number, { userId: number; userName: string }>;
  unreadReactions: Set<number>;
  onLeaveClick?: (conv: Conversation) => void;
}

export default function ConversationList({ 
    activeConvId, 
    onSelect, 
    onRefetch,
    isDarkMode, 
    myId,
    typingByConversation,
    unreadReactions,
    onLeaveClick,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [archiveOverflow, setArchiveOverflow] = useState('overflow-hidden');
  const [pendingDeletion, setPendingDeletion] = useState<{ id: number; type: 'ME' | 'ALL'; timeLeft: number } | null>(null);
  const deletionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [deleteConversation] = useMutation(DELETE_CONVERSATION, {
      refetchQueries: [GET_ALL_CONVERSATIONS_FOR_REFETCH, GET_SIDEBAR_COUNTS_FOR_REFETCH],
      onCompleted: () => {
          onRefetch();
      }
  });

  const [updatePinOrder] = useMutation(UPDATE_PIN_ORDER);

  const { data: convData } = useQuery(GET_CONVERSATIONS, { 
    pollInterval: 10000,
    skip: !myId,
    fetchPolicy: 'cache-and-network'
  });

  const { data: globalSearchData } = useQuery(SEARCH_GLOBAL, {
      variables: { query: debouncedSearchQuery },
      skip: debouncedSearchQuery.length < 3,
      fetchPolicy: 'network-only'
  });

  const { pinnedConversations, unpinnedConversations, archivedConversationsList } = useMemo(() => {
    const conversationMap = new Map<number, Conversation>();
    [...(convData?.conversations || []), ...(convData?.archivedConversations || [])].forEach(conv => {
        conversationMap.set(conv.id, conv);
    });
    
    const allUniqueConvs = Array.from(conversationMap.values()).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.isPinned && b.isPinned) {
            return (a.pinOrder ?? 0) - (b.pinOrder ?? 0);
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const cleanedConvs: Conversation[] = [];
    let favoritesAdded = false;

    for (const conv of allUniqueConvs) {
        if (pendingDeletion && pendingDeletion.id === conv.id) continue;

        const isFav = !conv.isGroup && conv.participant?.id === myId;
        if (isFav) {
            if (!favoritesAdded) {
                cleanedConvs.push(conv);
                favoritesAdded = true;
            }
        } else {
            cleanedConvs.push(conv);
        }
    }

    return {
      pinnedConversations: cleanedConvs.filter(c => c.isPinned && !c.isArchived),
      unpinnedConversations: cleanedConvs.filter(c => !c.isPinned && !c.isArchived),
      archivedConversationsList: cleanedConvs.filter(c => c.isArchived),
    };
  }, [convData, myId, pendingDeletion?.id]); 

  const [pinnedOrder, setPinnedOrder] = useState<Conversation[]>([]);
  useEffect(() => {
      setPinnedOrder(pinnedConversations);
  }, [pinnedConversations]);

  const movePinned = (id: number, direction: 'up' | 'down') => {
      const index = pinnedOrder.findIndex(c => c.id === id);
      if (index === -1) return;

      const newOrder = [...pinnedOrder];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= newOrder.length) return;

      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];

      setPinnedOrder(newOrder);
      const newIds = newOrder.map(conv => conv.id);
      updatePinOrder({ variables: { conversationIds: newIds } });
  };

  const handleDeleteRequest = (conversationId: number, type: 'ME' | 'ALL') => {
      if (pendingDeletion) {
          executeDeletion(pendingDeletion.id, pendingDeletion.type);
      }
      setPendingDeletion({ id: conversationId, type, timeLeft: 5000 });
      intervalRef.current = setInterval(() => {
          setPendingDeletion(prev => {
              if (!prev || prev.timeLeft <= 100) return null;
              return { ...prev, timeLeft: prev.timeLeft - 100 };
          });
      }, 100);
      deletionTimerRef.current = setTimeout(() => {
          executeDeletion(conversationId, type);
      }, 5000);
  };

  const executeDeletion = (id: number, type: 'ME' | 'ALL') => {
      deleteConversation({ variables: { conversationId: id, type } });
      resetTimers();
  };

  const handleUndoDeletion = () => {
      resetTimers();
  };

  const resetTimers = () => {
      if (deletionTimerRef.current) clearTimeout(deletionTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPendingDeletion(null);
  };

  const filteredUnpinned = useMemo(() => {
      if (!searchQuery) return unpinnedConversations;
      const q = searchQuery.toLowerCase();
      return unpinnedConversations.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.participant?.name?.toLowerCase().includes(q)) || 
        (c.participant?.username.toLowerCase().includes(q))
      );
  }, [unpinnedConversations, searchQuery]);

  const filteredArchived = useMemo(() => {
      if (!searchQuery) return archivedConversationsList;
      const q = searchQuery.toLowerCase();
      return archivedConversationsList.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.participant?.name?.toLowerCase().includes(q)) || 
        (c.participant?.username.toLowerCase().includes(q))
      );
  }, [archivedConversationsList, searchQuery]);
  
  const archiveUnreadCount = useMemo(() => {
      return archivedConversationsList.filter(c => c.unreadCount > 0 || c.isManuallyUnread).length;
  }, [archivedConversationsList]);

  const globalResults = globalSearchData?.searchConversations || [];

  return (
    <>
      <MessageUserModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} currentUserId={myId} />
      
      <AnimatePresence>
         {pendingDeletion && (
             <UndoToast onUndo={handleUndoDeletion} timeLeft={pendingDeletion.timeLeft} />
         )}
      </AnimatePresence>

      <div className={`w-full md:w-80 lg:w-96 border-r pt-6 flex flex-col ${activeConvId !== null ? 'hidden md:flex' : 'flex'} ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="p-4 border-b border-dashed flex items-center justify-between shrink-0" style={{borderColor: isDarkMode ? '#27272a' : '#e4e4e7'}}>
          <h1 className="text-xl font-bold">Сообщения</h1>
          <button onClick={() => setIsSearchModalOpen(true)} className={`p-2 rounded-full transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>
            <Edit2 size={20} />
          </button>
        </div>
        <div className="p-3">
          <div className={`relative flex items-center px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <Search size={18} className="text-zinc-500 mr-2" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск чатов и каналов..." className="bg-transparent w-full outline-none text-sm" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {searchQuery.length >= 3 && globalResults.length > 0 && (
              <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Глобальный поиск</div>
                  {globalResults.map((channel: any) => (
                      <div 
                        key={channel.id} 
                        onClick={() => { onSelect(channel.id); setSearchQuery(''); }}
                        className={`mx-2 p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-colors
                            ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50'}`}
                      >
                          <Avatar url={channel.avatar} name={channel.title} size="md" />
                          <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                  <span className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-black'}`}>{channel.title}</span>
                                  {channel.type === 'CHANNEL' && <Globe size={12} className="text-blue-500" />}
                              </div>
                              <div className="text-xs text-zinc-500 truncate flex items-center gap-1">
                                  <span>@{channel.slug || 'private'}</span>
                                  <span>•</span>
                                  <span>{channel.participantsCount} подп.</span>
                              </div>
                          </div>
                      </div>
                  ))}
                  <div className={`my-2 mx-4 h-px ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
              </div>
          )}

          <AnimatePresence>
            {archivedConversationsList.length > 0 && !searchQuery && (
                <motion.div
                    layout
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className={`mx-2 mt-1 mb-2 rounded-2xl transition-colors ${isDarkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}
                >
                <div onClick={() => setIsArchiveExpanded(!isArchiveExpanded)} className="flex items-center justify-between px-4 py-3 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-zinc-400/20 text-zinc-400' : 'bg-zinc-200 text-zinc-500'}`}><Archive size={18} /></div>
                        <span className="font-bold text-sm">Архив</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {archiveUnreadCount > 0 && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-200 text-zinc-700'}`}>
                                {archiveUnreadCount}
                            </span>
                        )}
                        <ChevronDown size={18} className="text-zinc-500 transition-transform" style={{ transform: isArchiveExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </div>
                </div>
                <AnimatePresence>
                    {isArchiveExpanded && (
                        <motion.div 
                            layout
                            initial={{ height: 0 }} 
                            animate={{ height: 'auto' }} 
                            exit={{ height: 0 }} 
                            onAnimationStart={() => setArchiveOverflow('overflow-hidden')}
                            onAnimationComplete={() => setArchiveOverflow('overflow-visible')}
                            className={`${archiveOverflow} pb-2`}
                        >
                            {filteredArchived.map((conv) => (
                                <ConversationItem 
                                    key={conv.id} 
                                    conv={conv} 
                                    isActive={activeConvId === conv.id} 
                                    onClick={() => onSelect(conv.id)} 
                                    isDarkMode={isDarkMode} 
                                    onUpdate={onRefetch} 
                                    isTyping={typingByConversation.has(conv.id)} 
                                    typingUserName={typingByConversation.get(conv.id)?.userName} 
                                    hasUnreadReaction={unreadReactions.has(conv.id)} 
                                    onLeaveClick={onLeaveClick}
                                    myId={myId}
                                    onDelete={handleDeleteRequest}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
                </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex flex-col gap-1">
            <AnimatePresence initial={false}>
              {pinnedOrder.map((conv, idx) => (
                <ConversationItem 
                  key={conv.id}
                  conv={conv} 
                  isActive={activeConvId === conv.id} 
                  onClick={() => onSelect(conv.id)} 
                  isDarkMode={isDarkMode} 
                  onUpdate={onRefetch} 
                  isTyping={typingByConversation.has(conv.id)} 
                  typingUserName={typingByConversation.get(conv.id)?.userName} 
                  hasUnreadReaction={unreadReactions.has(conv.id)} 
                  onLeaveClick={onLeaveClick} 
                  myId={myId}
                  onDelete={handleDeleteRequest}
                  isPinnedList={true}
                  isFirst={idx === 0}
                  isLast={idx === pinnedOrder.length - 1}
                  onMove={(dir) => movePinned(conv.id, dir)}
                />
              ))}
            </AnimatePresence>
          </div>

          {pinnedConversations.length > 0 && unpinnedConversations.length > 0 && !searchQuery && (
              <motion.div layout className={`h-px mx-4 my-2 transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          )}

          {filteredUnpinned.length === 0 && !searchQuery && globalResults.length === 0 && pinnedConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 opacity-50 text-sm"><p>Диалогов пока нет</p></div>
          )}
            
          <div className="flex flex-col gap-1 pb-2">
            <AnimatePresence>
              {filteredUnpinned.map((conv) => (
                <ConversationItem 
                  key={conv.id} 
                  conv={conv} 
                  isActive={activeConvId === conv.id} 
                  onClick={() => onSelect(conv.id)} 
                  isDarkMode={isDarkMode} 
                  onUpdate={onRefetch} 
                  isTyping={typingByConversation.has(conv.id)} 
                  typingUserName={typingByConversation.get(conv.id)?.userName} 
                  hasUnreadReaction={unreadReactions.has(conv.id)} 
                  onLeaveClick={onLeaveClick} 
                  myId={myId}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}