'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gql, useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { useSocket } from '@/context/SocketContext';
import { Conversation, Message } from '@/types/messages';
import ConversationList from '@/components/messages/ConversationList';
import ChatWindow from '@/components/messages/ChatWindow';
import ChatPlaceholder from '@/components/messages/ChatPlaceholder';
import Toast from '@/components/Toast';
import LoadingScreen from '@/components/LoadingScreen';
import LeaveConversationModal from '@/components/messages/LeaveConversationModal';
import { useNotification } from '@/context/NotificationContext';

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

const GET_ME_ID = gql`query GetMeId { me { id } }`;
const GET_USER_BASIC = gql`query GetUserBasic($id: Int!) { user(id: $id) { id username name avatar isOnline lastOnlineAt } }`;

const LEAVE_CONVERSATION = gql`
  mutation LeaveConversation($conversationId: Int!, $newAdminUserId: Int) {
    leaveConversation(conversationId: $conversationId, newAdminUserId: $newAdminUserId)
  }
`;

export default function MessagesPage() {
  const { isDarkMode } = useTheme();
  const { socket } = useSocket();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setActiveChatParticipantId, setActiveConversationId } = useNotification();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [tempConversation, setTempConversation] = useState<Conversation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [leaveModalConvId, setLeaveModalConvId] = useState<number | null>(null);

  const { data: meData, loading: meLoading } = useQuery(GET_ME_ID);
  const myId = meData?.me?.id;
  const [leaveConversationMutation] = useMutation(LEAVE_CONVERSATION);
  const [typingByConversation, setTypingByConversation] = useState<Map<number, { userId: number; userName: string }>>(new Map());
  const [unreadReactions, setUnreadReactions] = useState<Set<number>>(new Set());
  const [animateReactionInConvId, setAnimateReactionInConvId] = useState<number | null>(null);


  const { data: convData, refetch: refetchConvs } = useQuery(GET_CONVERSATIONS, { 
    pollInterval: 10000,
      skip: !myId,
      fetchPolicy: 'cache-and-network'
  });
  
  const [fetchUserBasic] = useLazyQuery(GET_USER_BASIC);

  const { conversations, archivedConversations } = useMemo(() => {
    const conversationMap = new Map<number, Conversation>();
    [...(convData?.conversations || []), ...(convData?.archivedConversations || [])].forEach(conv => {
        conversationMap.set(conv.id, conv);
    });
    const allUniqueConvs = Array.from(conversationMap.values());
    const sortedConvs = allUniqueConvs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return {
      conversations: sortedConvs.filter(c => !c.isArchived),
      archivedConversations: sortedConvs.filter(c => c.isArchived),
    };
  }, [convData]);

  useEffect(() => {
    const targetConvIdParam = searchParams.get('conversationId');
    const targetUserId = searchParams.get('userId');
    const allConvs = [...conversations, ...archivedConversations];

    if (targetConvIdParam) {
      const convId = Number(targetConvIdParam);
      const conv = allConvs.find((c) => c.id === convId);
      if (conv) {
        setActiveConvId(conv.id);
        setTempConversation(null);
      }
      router.replace('/dashboard/messages');
      return;
    }

    if (targetUserId) {
      const userIdNum = Number(targetUserId);
      const existingConv = allConvs.find(
        (c) => c.participant?.id === userIdNum,
      );

      if (existingConv) {
        setActiveConvId(existingConv.id);
        setTempConversation(null);
      } else {
        fetchUserBasic({ variables: { id: userIdNum } }).then((res) => {
          if (res.data?.user) {
            setTempConversation({
              id: 0,
              updatedAt: new Date().toISOString(),
              unreadCount: 0,
              isPinned: false,
              participant: res.data.user,
              isArchived: false,
              isManuallyUnread: false,
              type: 'DIRECT',
              isGroup: false,
              hasLeft: false,
              participantsCount: 2,
            });
            setActiveConvId(0);
          } else {
            setToast({ message: 'Пользователь не найден', type: 'error' });
          }
        });
      }
      router.replace('/dashboard/messages');
    }
  }, [searchParams, conversations, archivedConversations, router, fetchUserBasic]);


  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = () => refetchConvs();
    const handleTyping = (data: { conversationId: number; userId: number; userName?: string }) => {
        if (data.userId !== myId) {
            const name = data.userName || 'Кто-то';
            setTypingByConversation(prev => new Map(prev).set(data.conversationId, { userId: data.userId, userName: name }));
            setTimeout(() => {
                setTypingByConversation(prev => {
                    const next = new Map(prev);
                    if (next.get(data.conversationId)?.userId === data.userId) next.delete(data.conversationId);
                    return next;
                });
            }, 3000);
        }
    };

    const handleUnreadReaction = (data: { conversationId: number }) => {
        if (data.conversationId !== activeConvId) {
            setUnreadReactions(prev => new Set(prev).add(data.conversationId));
        }
    };
    
    socket.on('message_received', handleUpdate);
    socket.on('conversation_updated', handleUpdate);
    socket.on('message_deleted', handleUpdate);
    socket.on('conversation_deleted', handleUpdate);
    socket.on('user_typing', handleTyping);
    socket.on('unread_reaction', handleUnreadReaction);
    
    return () => {
      socket.off('message_received', handleUpdate);
      socket.off('conversation_updated', handleUpdate);
      socket.off('user_typing', handleTyping);
      socket.off('message_deleted', handleUpdate);
      socket.off('conversation_deleted', handleUpdate);
      socket.off('unread_reaction', handleUnreadReaction);
    };
  }, [socket, refetchConvs, activeConvId, myId]);

  const handleSelectConversation = (id: number) => {
    if (unreadReactions.has(id)) {
        setAnimateReactionInConvId(id);
    }
    setActiveConvId(id);
    setTempConversation(null);
    setUnreadReactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
    });
  };
  
  const handleBackToConversations = () => {
    setActiveConvId(null);
    setTempConversation(null);
  };
  
  const activeConversation = activeConvId === 0 ? tempConversation : [...conversations, ...archivedConversations].find(c => c.id === activeConvId) || null;

   useEffect(() => {
    if (activeConversation) {
      setActiveChatParticipantId(activeConversation.participant?.id || null);
      setActiveConversationId(activeConversation.id);
    } else {
      setActiveChatParticipantId(null);
      setActiveConversationId(null);
    }
    return () => {
      setActiveChatParticipantId(null);
      setActiveConversationId(null);
    };
  }, [activeConversation, setActiveChatParticipantId, setActiveConversationId]);

  if (meLoading) return <LoadingScreen />;

 return (
    // Убрали pt-24 из главного контейнера, чтобы border слева был на всю высоту
    <div className={`h-screen flex overflow-hidden ${isDarkMode ? 'bg-black' : 'bg-white'} ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <ConversationList
        conversations={conversations}
        archivedConversations={archivedConversations}
        activeConvId={activeConvId}
        onSelect={handleSelectConversation}
        onRefetch={refetchConvs}
        isDarkMode={isDarkMode}
        myId={myId || 0}
        typingByConversation={typingByConversation}
        unreadReactions={unreadReactions}
        onLeaveClick={(conv) => setLeaveModalConvId(conv.id)}
      />

      {leaveModalConvId != null && myId && (
        <LeaveConversationModal
          isOpen={true}
          onClose={() => setLeaveModalConvId(null)}
          conversationId={leaveModalConvId}
          myId={myId}
          onConfirm={async (newAdminUserId) => {
            try {
              await leaveConversationMutation({
                variables: { conversationId: leaveModalConvId, newAdminUserId: newAdminUserId ?? null },
              });
              refetchConvs();
              setToast({ message: 'Вы вышли из беседы', type: 'success' });
              setLeaveModalConvId(null);
            } catch (e: any) {
              setToast({ message: e.message || 'Не удалось выйти из беседы', type: 'error' });
            }
          }}
        />
      )}

       {/* Добавили pt-24 здесь, чтобы чат не перекрывался прозрачной шапкой */}
       <div className={`flex-1 flex flex-col h-full min-w-0 bg-transparent pt-24 ${activeConversation === null ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <ChatWindow
            activeConversation={activeConversation}
            onConversationCreated={(newId) => { refetchConvs().then(() => setActiveConvId(newId)); }}
            myId={myId || 0}
            onBack={handleBackToConversations}
            onConversationsRefetch={refetchConvs}
            isTyping={typingByConversation.has(activeConversation.id)}
            typingDisplay={typingByConversation.get(activeConversation.id) ? `${typingByConversation.get(activeConversation.id)!.userName} печатает...` : undefined}
            animateReactionInConvId={animateReactionInConvId}
            onAnimationDone={() => setAnimateReactionInConvId(null)}
          />
        ) : <ChatPlaceholder />}
      </div>
    </div>
  );
}