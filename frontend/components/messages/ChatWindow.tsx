'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gql, useQuery, useLazyQuery, useMutation, useApolloClient } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { useSocket } from '@/context/SocketContext';
import { Conversation, Message } from '@/types/messages';
import { useDebounce } from '@/hooks/use-debounce';
import ConversationList from '@/components/messages/ConversationList';
import ChatPlaceholder from '@/components/messages/ChatPlaceholder';
import Toast from '@/components/Toast';
import LoadingScreen from '@/components/LoadingScreen';
import LeaveConversationModal from '@/components/messages/LeaveConversationModal';
import { useNotification } from '@/context/NotificationContext';
import { X, Edit2, ShieldAlert, Megaphone, Bell, BellOff } from 'lucide-react';
import PinnedMessageHeader from './PinnedMessageHeader';
import ForwardModal from '../ForwardModal';
import ConversationStatsModal from './ConversationStatsModal';
import GroupConversationEditor from './GroupConversationEditor';
import ImageViewer from '../ImageViewer';
import MessageInput from './MessageInput';
import ConfirmationModal from '@/components/ConfirmationModal';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';


const GET_MESSAGES = gql`
  query GetMessages($conversationId: Int!) {
    messages(conversationId: $conversationId) {
      id
      content
      createdAt
      updatedAt
      editedAt
      senderId
      conversationId
      isRead
      images
      isPinned
      type
      isAnonymous
      viewsCount
      
      sender { id username name avatar }
      replyTo { id content images sender { username } }
      reactions { id emoji userId user { id username name avatar } }
      readBy { user { id name username } readAt }
      
      forwardedFrom { id username name avatar }
    }
  }
`;

const JOIN_CHANNEL = gql`
  mutation JoinChannel($conversationId: Int!) {
    joinChannel(conversationId: $conversationId)
  }
`;

const INCREMENT_MESSAGE_VIEWS = gql`
  mutation IncrementMessageViews($messageIds: [Int!]!) {
    incrementMessageViews(messageIds: $messageIds)
  }
`;

const TOGGLE_MUTE = gql`mutation ToggleMuteConversation($conversationId: Int!) { toggleMuteConversation(conversationId: $conversationId) }`;

const SEND_MESSAGE = gql`mutation SendMessage($conversationId: Int, $targetUserId: Int, $content: String!, $replyToId: Int, $images: [String!]) { sendMessage(conversationId: $conversationId, targetUserId: $targetUserId, content: $content, replyToId: $replyToId, images: $images) { id conversationId } }`;
const MARK_READ = gql`
  mutation MarkMessagesRead($conversationId: Int!) {
    markMessagesRead(conversationId: $conversationId)
  }
`;
const DELETE_MESSAGE = gql`mutation DeleteMessage($messageId: Int!, $type: String!) { deleteMessage(messageId: $messageId, type: $type) }`;
const EDIT_MESSAGE = gql`mutation EditMessage($messageId: Int!, $content: String!) { editMessage(messageId: $messageId, content: $content) { id content editedAt } }`;
const TOGGLE_PIN_MESSAGE = gql`mutation TogglePinMessage($messageId: Int!) { togglePinMessage(messageId: $messageId) { id isPinned } }`;
const DELETE_CONVERSATION = gql`mutation DeleteConversationFromChat($conversationId: Int!, $type: String!) { deleteConversation(conversationId: $conversationId, type: $type) }`;
const BLOCK_USER = gql`mutation BlockChatUser($targetId: Int!) { blockUser(targetId: $targetId) }`;
const LEAVE_CONVERSATION = gql`mutation LeaveConversation($conversationId: Int!, $newAdminUserId: Int) { leaveConversation(conversationId: $conversationId, newAdminUserId: $newAdminUserId) }`;

interface ChatWindowProps {
  activeConversation: Conversation | null;
  onConversationCreated: (newConversationId: number) => void;
  myId: number;
  onBack: () => void;
  onConversationsRefetch: () => void;
  isTyping: boolean;
  typingDisplay?: string;
  animateReactionInConvId: number | null;
  onAnimationDone: () => void;
}

export default function ChatWindow({
  activeConversation,
  onConversationCreated,
  myId,
  onBack,
  onConversationsRefetch,
  isTyping,
  typingDisplay,
  animateReactionInConvId,
  onAnimationDone
}: ChatWindowProps) {
  const { isDarkMode } = useTheme();
  const client = useApolloClient();
  const { socket } = useSocket();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<'ME' | 'ALL'>('ME');
  const [messageToAnimateId, setMessageToAnimateId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReactionUpdateRef = useRef<{ messageId: number; at: number } | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<number | null>(null);

  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [currentPinIndex, setCurrentPinIndex] = useState(0);
  const [scrollToBottomTrigger, setScrollToBottomTrigger] = useState(0);
  const [unreadBannerHideAt, setUnreadBannerHideAt] = useState<number | null>(null);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [pendingDialogDelete, setPendingDialogDelete] = useState<'ME' | 'ALL' | null>(null);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeavingConversation, setIsLeavingConversation] = useState(false);
  const viewedIdsInSession = useRef<Set<number>>(new Set());
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [visibleMessageIds, setVisibleMessageIds] = useState<number[]>([]);
  const debouncedVisibleIds = useDebounce(visibleMessageIds, 1500);
  const [incrementViews] = useMutation(INCREMENT_MESSAGE_VIEWS);
  
  // --- ОБЪЯВЛЕНИЯ ПЕРЕМЕННЫХ ПЕРЕНЕСЕНЫ ВЫШЕ ---
  const conversationId = activeConversation?.id ? Number(activeConversation.id) : 0;
  const isChannel = activeConversation?.type === 'CHANNEL';
  const isMember = !!activeConversation?.myRole; 
  const canPost = !isChannel || (activeConversation?.myRole === 'ADMIN' || (activeConversation?.permissions?.canPost));
  const participant = activeConversation?.participant as any;
  const hasLeftConversation = !!(activeConversation as any)?.hasLeft;

  const isFavorites = !activeConversation?.isGroup && activeConversation?.participantsCount === 1;

  useEffect(() => {
    viewedIdsInSession.current.clear();
  }, [conversationId]);

  useEffect(() => {
    if (isChannel && debouncedVisibleIds.length > 0) {
      const newToView = debouncedVisibleIds.filter(
        id => !viewedIdsInSession.current.has(id)
      );

      if (newToView.length > 0) {
        incrementViews({ variables: { messageIds: newToView } });
        newToView.forEach(id => viewedIdsInSession.current.add(id));
      }
    }
  }, [debouncedVisibleIds, isChannel, incrementViews]);

  const { data: msgData, refetch: refetchMsgs, error: messagesError, loading: messagesLoading } = useQuery(GET_MESSAGES, {
    variables: { conversationId },
    skip: !conversationId || conversationId === 0 || isNaN(conversationId),
    fetchPolicy: 'network-only', 
  });

  const [sendMessage] = useMutation(SEND_MESSAGE);
  
  const [markRead] = useMutation(MARK_READ, {
    onError: () => {} // Подавляем ошибки, если пользователь уже вышел
  });

  const [deleteMsg] = useMutation(DELETE_MESSAGE);
  const [editMsg] = useMutation(EDIT_MESSAGE);
  const [togglePinMessage] = useMutation(TOGGLE_PIN_MESSAGE);
  const [deleteConversationMutation] = useMutation(DELETE_CONVERSATION);
  const [blockUserMutation] = useMutation(BLOCK_USER);
  const [leaveConversationMutation] = useMutation(LEAVE_CONVERSATION);
  const [joinChannelMutation] = useMutation(JOIN_CHANNEL);
  
  const [toggleMute] = useMutation(TOGGLE_MUTE);

  const typingUsersSet = new Set<number>();
  if (isTyping && activeConversation && activeConversation.participant) {
    typingUsersSet.add(activeConversation.participant.id);
  }
  
  const isMessagingDisabled = 
    (hasLeftConversation && !isChannel) || 
    participant?.amIBlocked || 
    participant?.isBlockedByMe;

  const allChatImages = useMemo(() => {
    return messages.flatMap(m => m.images || []);
  }, [messages]);

  const handleImageClick = (messageId: number, imageIndexInMessage: number) => {
    let globalIndex = 0;
    for (const m of messages) {
      if (m.id === messageId) {
        globalIndex += imageIndexInMessage;
        break;
      }
      if (m.images && m.images.length > 0) {
        globalIndex += m.images.length;
      }
    }
    setViewerIndex(globalIndex);
    setIsViewerOpen(true);
  };

  useEffect(() => {
    if (activeConversation?.id === 0) {
      setMessages([]);
      return;
    }
    if (!msgData?.messages) return;

    setMessages((prev) => {
      const fromServer = msgData.messages as Message[];
      const optimistic = prev.filter((m) => (m as any).status === 'sending');
      if (optimistic.length === 0) return fromServer;

      const toKeep = optimistic.filter((opt) => {
        const match = fromServer.some(
          (s) =>
            s.senderId === opt.senderId &&
            s.content === opt.content &&
            Math.abs(new Date(s.createdAt).getTime() - new Date(opt.createdAt).getTime()) < 15000
        );
        return !match;
      });
      const merged = [...fromServer, ...toKeep].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return merged;
    });
  }, [msgData, activeConversation?.id]);

  useEffect(() => {
    const forbiddenMessage = messagesError?.graphQLErrors?.[0]?.message || messagesError?.message || '';
    const isAccessDenied = forbiddenMessage && forbiddenMessage.includes('Доступ запрещен');
    const isLeftMessage = forbiddenMessage && forbiddenMessage.includes('вышли');
    if (isAccessDenied && !isLeftMessage) {
      if (!isChannel) {
          onConversationsRefetch();
          onBack();
      }
    }
  }, [messagesError, onConversationsRefetch, onBack, isChannel]);

  useEffect(() => {
    const allPins = messages.filter(m => m.isPinned && m.type !== 'SYSTEM').sort((a, b) => a.id - b.id);
    setPinnedMessages(allPins);
    if (allPins.length === 0) setCurrentPinIndex(0);
    else if (currentPinIndex >= allPins.length) setCurrentPinIndex(allPins.length - 1);
  }, [messages, currentPinIndex]);

  useEffect(() => {
    if (animateReactionInConvId === activeConversation?.id && messages) {
      const targetMessage = [...messages].reverse().find(msg => msg.senderId === myId && msg.reactions?.length > 0);
      if (targetMessage) {
        setMessageToAnimateId(targetMessage.id);
        onAnimationDone();
        setTimeout(() => setMessageToAnimateId(null), 2000);
      } else {
        onAnimationDone();
      }
    }
  }, [animateReactionInConvId, activeConversation?.id, messages, onAnimationDone, myId]);

  useEffect(() => {
    if (!socket || !activeConversation) return;
    const handleUpdate = (data?: any) => { 
        if (activeConversation.id !== 0) {
            const incomingId = data?.conversationId || data?.id;
            if (!incomingId || incomingId === activeConversation.id) refetchMsgs({ fetchPolicy: 'network-only' });
        }
        onConversationsRefetch();
    };
    const handleMessageReceived = (newMessage: Message) => {
        if (newMessage.conversationId === activeConversation.id) {
            refetchMsgs({ fetchPolicy: 'network-only' });
            setScrollToBottomTrigger((t) => t + 1);
        }
        onConversationsRefetch();
    };
    const handleMessagesRead = ({ conversationId, readerId }: { conversationId: number; readerId: number }) => {
      if (conversationId === activeConversation.id) {
        refetchMsgs();
        onConversationsRefetch();
      }
    };
    const handleMessageUpdated = (updated: Message) => {
      if (!activeConversation || updated.conversationId !== activeConversation.id) {
        onConversationsRefetch();
        return;
      }
      const justUpdated = lastReactionUpdateRef.current;
      if (justUpdated && justUpdated.messageId === updated.id && Date.now() - justUpdated.at < 500) {
        onConversationsRefetch();
        return;
      }
      setMessages(prev => {
        if (!prev || prev.length === 0) return prev;
        const exists = prev.some(m => m.id === updated.id);
        if (!exists) return prev;
        return prev.map(m => {
          if (m.id !== updated.id) return m;
          const next = { ...m, ...updated } as Message;
          if (next.reactions?.length && m.reactions?.length) {
            next.reactions = next.reactions.map((r: any) => {
              const existing = m.reactions?.find((e: any) => e.id === r.id);
              if (existing?.user && !r.user) return { ...r, user: existing.user };
              return r;
            });
          }
          return next;
        });
      });
      onConversationsRefetch();
    };

    socket.on('message_received', handleMessageReceived); 
    socket.on('conversation_updated', handleUpdate);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_updated', handleMessageUpdated);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('conversation_updated', handleUpdate);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_updated', handleMessageUpdated);
    };
  }, [socket, activeConversation, refetchMsgs, onConversationsRefetch, markRead, myId]);

  const lastUnreadMessageId = messages.findLast((m) => m.type !== 'SYSTEM' && m.senderId !== myId && !m.isRead)?.id ?? null;
  const lastUnreadIsInView = lastUnreadMessageId != null && visibleMessageIds.includes(lastUnreadMessageId);

  useEffect(() => {
    setUnreadBannerHideAt(null);
  }, [activeConversation?.id, lastUnreadMessageId]);

  useEffect(() => {
    if (!lastUnreadIsInView || !lastUnreadMessageId) return;
    setUnreadBannerHideAt((prev) => (prev == null ? Date.now() + 5000 : prev));
  }, [lastUnreadIsInView, lastUnreadMessageId]);

  useEffect(() => {
  if (isFavorites && activeConversation && activeConversation.id !== 0) {
    markRead({ variables: { conversationId: activeConversation.id } }).catch(() => {});
  }
}, [isFavorites, activeConversation?.id, markRead]);

  useEffect(() => {
    const hideAt = unreadBannerHideAt;
    if (!hideAt) return;
    if (hasLeftConversation) return; 

    const delay = Math.max(0, hideAt - Date.now());
    const t = setTimeout(() => {
      setUnreadBannerHideAt(null);
      if (activeConversation?.id && activeConversation.id !== 0 && lastUnreadMessageId) {
        markRead({ variables: { conversationId: activeConversation.id } })
          .then(() => {
            onConversationsRefetch();
            refetchMsgs();
          })
          .catch(() => {});
      }
    }, delay);
    return () => clearTimeout(t);
  }, [unreadBannerHideAt, activeConversation?.id, lastUnreadMessageId, markRead, onConversationsRefetch, refetchMsgs, hasLeftConversation]);

  const showUnreadBanner = lastUnreadMessageId != null && (!lastUnreadIsInView || (unreadBannerHideAt != null && Date.now() < unreadBannerHideAt));

  const handleNextPin = () => {
    const nextIndex = (currentPinIndex + 1) % pinnedMessages.length;
    setCurrentPinIndex(nextIndex);
    handleScrollToMessage(pinnedMessages[nextIndex].id);
  };

  const handlePrevPin = () => {
    const prevIndex = (currentPinIndex - 1 + pinnedMessages.length) % pinnedMessages.length;
    setCurrentPinIndex(prevIndex);
    handleScrollToMessage(pinnedMessages[prevIndex].id);
  };

  const handleDeleteConversationRequest = (type: 'ME' | 'ALL') => {
    if (type === 'ALL') {
      const isGroup = activeConversation?.isGroup || false;
      const isAdmin = activeConversation?.myRole === 'ADMIN';
      if (isGroup && !isAdmin) {
        setToast({ message: 'Только администратор может удалить беседу для всех', type: 'error' });
        return;
      }
    }
    setPendingDialogDelete(type);
  };

  const handleDeleteConversationConfirm = async () => {
    if (!pendingDialogDelete || !activeConversation || activeConversation.id === 0) return;
    const type = pendingDialogDelete;
    try {
      await deleteConversationMutation({
        variables: { conversationId: activeConversation.id, type },
      });
      setToast({
        message: type === 'ALL' ? 'Беседа удалена у всех' : activeConversation.isGroup ? 'Беседа скрыта для вас' : 'Диалог скрыт для вас',
        type: 'success',
      });
      onConversationsRefetch();
      onBack();
    } catch (e: any) {
      setToast({ message: e.message || 'Не удалось удалить диалог', type: 'error' });
    } finally {
      setPendingDialogDelete(null);
    }
  };

  const handleBlockUserRequest = () => setIsBlockConfirmOpen(true);

  const handleBlockUserConfirm = async () => {
    if (!activeConversation) return;
    try {
      await blockUserMutation({
        variables: { targetId: (activeConversation.participant as any).id },
      });
      setToast({ message: 'Пользователь заблокирован', type: 'success' });
      onBack();
    } catch (e: any) {
      setToast({ message: e.message || 'Не удалось заблокировать пользователя', type: 'error' });
    } finally {
      setIsBlockConfirmOpen(false);
    }
  };

  const handleLeaveConversation = () => {
    if (!activeConversation || !activeConversation.isGroup) return;
    const myRole = (activeConversation as any).myRole;
    if (myRole === 'ADMIN') {
      setIsLeaveModalOpen(true);
    } else {
      executeLeaveConversation();
    }
  };

  const executeLeaveConversation = async (newAdminUserId?: number) => {
    if (!activeConversation?.id) return;
    const myRole = (activeConversation as any).myRole;
    
    if (myRole === 'ADMIN' && !newAdminUserId) {
      setToast({ message: 'Выберите нового администратора', type: 'error' });
      return;
    }
    
    setIsLeavingConversation(true);
    try {
      await leaveConversationMutation({
        variables: {
          conversationId: activeConversation.id,
          newAdminUserId: newAdminUserId ?? null,
        },
      });
      onConversationsRefetch();
      setToast({ message: 'Вы вышли из беседы', type: 'success' });
      onBack();
    } catch (e: any) {
      const errorMessage = e.graphQLErrors?.[0]?.message || e.message || 'Не удалось выйти из беседы';
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsLeavingConversation(false);
      setIsLeaveModalOpen(false);
    }
  };

  const handleJoinChannel = async () => {
      if (!activeConversation) return;
      try {
          await joinChannelMutation({ variables: { conversationId: activeConversation.id } });
          setToast({ message: 'Вы подписались на канал', type: 'success' });
          onConversationsRefetch();
      } catch (e: any) {
          setToast({ message: e.message || 'Ошибка подписки', type: 'error' });
      }
  };
  
  const handleToggleMute = async () => {
    if (!activeConversation) return;
    try {
      await toggleMute({ variables: { conversationId: activeConversation.id } });
      onConversationsRefetch();
    } catch (e: any) {
      setToast({ message: e.message || 'Ошибка настроек звука', type: 'error' });
    }
  };

  const handleSend = async (
    contentOverride?: string, 
    replyOverride?: Message | { id: number; content: string; sender: { username: string } } | null,
    images?: string[],
  ) => {
    const currentContent = contentOverride ?? inputText;
    const hasImages = !!images && images.length > 0;
    if (!currentContent.trim() && !hasImages) return;
    if (!activeConversation) return;

    if (editingMessage) {
      try {
        await editMsg({ variables: { messageId: editingMessage.id, content: currentContent } });
        setEditingMessage(null);
        setInputText('');
      } catch (e: any) {
        setToast({ message: e.message || 'Ошибка редактирования', type: 'error' });
      }
      return;
    }

    const isNewChat = activeConversation.id === 0;
    const currentReplyTo = replyOverride !== undefined ? replyOverride : replyTo;

    const fakeMessage: Message = {
      id: Date.now(),
      conversationId: activeConversation.id,
      content: currentContent,
      images: images && images.length > 0 ? images : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      senderId: myId,
      sender: { 
        id: myId, 
        username: 'me', 
        name: 'You', 
        avatar: undefined,
      }, 
      isRead: false,
      replyTo: currentReplyTo ? {
        id: currentReplyTo.id,
        content: currentReplyTo.content,
        sender: { username: currentReplyTo.sender.username }
      } : undefined,
      reactions: [],
      status: 'sending',
      isPinned: false,
      type: 'REGULAR'
    };

    setMessages(prev => [...prev, fakeMessage]);
    setInputText('');
    setReplyTo(null);

   try {
      const payloadVariables = {
        conversationId: isNewChat ? null : Number(activeConversation.id),
        targetUserId: isNewChat && activeConversation.participant ? Number(activeConversation.participant.id) : null,
        content: currentContent,
        replyToId: currentReplyTo ? Number(currentReplyTo.id) : null,
        images: images && images.length > 0 ? images : null,
      };
      
      const { data } = await sendMessage({ variables: payloadVariables });

      if (isNewChat && data.sendMessage.conversationId) {
        onConversationCreated(data.sendMessage.conversationId);
      } else {
        refetchMsgs({ fetchPolicy: 'network-only' });
      }
    } catch (e: any) {
      if (e.message.includes('заблокировали') || e.message.includes('не можете отправлять')) {
          setMessages(prev => prev.map(msg => 
              msg.id === fakeMessage.id ? { ...msg, status: 'failed' } : msg
          ));
      } else {
        setToast({ message: e.message || 'Ошибка отправки', type: 'error' });
        setMessages(prev => prev.filter(msg => msg.id !== fakeMessage.id));
      }
    }
  };

  const handleDeleteLocal = (messageId: number) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleRetry = (failedMessage: Message) => {
    handleDeleteLocal(failedMessage.id);
    handleSend(failedMessage.content, failedMessage.replyTo || null, failedMessage.images || []); 
  };
  
  const handleTyping = () => {
    if (socket && activeConversation && activeConversation.id !== 0 && !hasLeftConversation) {
      socket.emit('typing', { conversationId: activeConversation.id });
    }
  };

  const handleDeleteRequest = (msgId: number, type: 'ME' | 'ALL') => {
    setMessageToDelete(msgId);
    setDeleteType(type);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (messageToDelete) {
      try {
        await deleteMsg({ variables: { messageId: messageToDelete, type: deleteType } });
        if (deleteType === 'ALL') {
          client.cache.evict({ id: client.cache.identify({ __typename: 'Message', id: messageToDelete }) });
          client.cache.gc();
        }
        await refetchMsgs({ fetchPolicy: 'network-only' });
        onConversationsRefetch();
      } catch (error: any) {
        setToast({ message: error.message || 'Ошибка удаления', type: 'error' });
      } finally {
        setIsDeleteModalOpen(false);
        setMessageToDelete(null);
      }
    }
  };

  const handleJumpToDate = (dateStr: string) => {
    // 1. Ищем первое сообщение с такой датой в уже загруженных
    const targetDate = new Date(dateStr).toDateString();
    
    // Ищем сообщение, дата которого совпадает или новее выбранной
    const msg = messages.find(m => {
        const mDate = new Date(m.createdAt).toDateString();
        return mDate === targetDate || new Date(m.createdAt) > new Date(dateStr);
    });

    if (msg) {
        handleScrollToMessage(msg.id);
        setToast({ message: `Переход к ${new Date(dateStr).toLocaleDateString()}`, type: 'success' });
    } else {
        // Если сообщения нет в списке (оно слишком старое и не загружено),
        // в идеале тут нужно делать запрос fetchMessages({ cursor: ..., aroundDate: ... })
        // Но для текущей задачи выведем уведомление
        setToast({ message: 'Сообщения за эту дату не загружены. Прокрутите вверх.', type: 'error' });
    }
};

  const handleEditRequest = (message: Message) => {
    setEditingMessage(message);
    setInputText(message.content);
    setReplyTo(null);
  };
  
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => setToast({ message: 'Скопировано', type: 'success' }))
      .catch(() => setToast({ message: 'Не удалось скопировать', type: 'error' }));
  };

  const handlePinMessage = async (messageId: number) => {
      try {
          await togglePinMessage({ variables: { messageId } });
      } catch (e: any) {
          setToast({ message: e.message || 'Не удалось изменить закреп', type: 'error' });
      }
  };

  const handleScrollToMessage = (messageId: number) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setMessageToAnimateId(messageId);
        highlightTimeoutRef.current = setTimeout(() => {
          setMessageToAnimateId(null);
          highlightTimeoutRef.current = null;
        }, 2000);
    } else {
        setToast({ message: 'Сообщение не загружено в список', type: 'error' });
    }
  };

  const onReactionToggled = (messageId: number) => {
    lastReactionUpdateRef.current = { messageId, at: Date.now() };
  };

  const modalTitle = deleteType === 'ALL' ? 'Удалить у всех?' : 'Удалить у себя?';
  const modalMessage = deleteType === 'ALL' ? 'Это сообщение будет удалено для всех участников чата.' : 'Это сообщение будет удалено только из вашей истории.';

  const renderBottomBar = () => {
      if (isChannel) {
          if (!isMember) {
              return (
                  <div className={`w-full p-4 border-t flex items-center justify-center ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                      <button onClick={handleJoinChannel} className="px-8 py-3 bg-lime-400 text-black rounded-xl font-bold hover:bg-lime-500 transition-all shadow-lg shadow-lime-500/20 flex items-center gap-2">
                          <Megaphone size={18} />
                          Подписаться
                      </button>
                  </div>
              );
          }
          if (!canPost) {
              const isMuted = activeConversation?.mutedUntil && new Date(activeConversation.mutedUntil) > new Date();
              
              return (
                  <div className={`w-full p-4 border-t flex items-center justify-between gap-4 ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'}`}>
                      <div className="flex items-center gap-2 text-sm opacity-80">
                          <ShieldAlert size={16} />
                          <span>Только администраторы могут писать</span>
                      </div>
                      
                      <button 
                        onClick={handleToggleMute}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer border
                            ${isMuted 
                                ? (isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-300 text-zinc-500')
                                : 'bg-lime-400 border-lime-500 text-black shadow-sm'
                            }`}
                      >
                          {isMuted ? <BellOff size={16} /> : <Bell size={16} />}
                          {isMuted ? "Включить звук" : "Уведомления"}
                      </button>
                  </div>
              );
          }
      }

      if (hasLeftConversation && !isChannel) {
          return (
            <div className={`w-full p-4 border-t flex items-center justify-center gap-2 ${isDarkMode ? 'bg-amber-900/20 text-amber-200' : 'bg-amber-50 text-amber-800'}`}>
                <ShieldAlert size={20} />
                <span className="text-sm font-medium">Вы вышли из этой беседы.</span>
            </div>
          );
      }

      if (isMessagingDisabled) {
          return (
            <div className={`w-full p-4 border-t flex items-center justify-center gap-2 ${isDarkMode ? 'bg-red-900/10 text-red-400' : 'bg-red-50 text-red-500'}`}>
                <ShieldAlert size={20} />
                <span className="text-sm font-medium">Вы не можете отправлять сообщения этому пользователю.</span>
            </div>
          );
      }

      return (
          <MessageInput
              value={inputText}
              onChange={setInputText}
              onSend={(images?: string[]) => handleSend(undefined, undefined, images)}
              onTyping={handleTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              isDarkMode={isDarkMode}
              myId={myId}
          />
      );
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={modalTitle}
        message={modalMessage}
      />

      <ConfirmationModal
        isOpen={pendingDialogDelete !== null}
        onClose={() => setPendingDialogDelete(null)}
        onConfirm={handleDeleteConversationConfirm}
        title={
          pendingDialogDelete === 'ALL'
            ? 'Удалить диалог у всех?'
            : 'Удалить диалог только у себя?'
        }
        message={
          pendingDialogDelete === 'ALL'
            ? 'Этот диалог будет полностью удалён для всех участников.'
            : 'Диалог исчезнет только из вашей истории, собеседник его сохранит.'
        }
      />

      <ConfirmationModal
        isOpen={isBlockConfirmOpen}
        onClose={() => setIsBlockConfirmOpen(false)}
        onConfirm={handleBlockUserConfirm}
        title="Заблокировать пользователя?"
        message="Вы не сможете отправлять и получать сообщения от этого пользователя, пока не разблокируете его."
      />
      
      <ForwardModal 
        isOpen={!!forwardingMessageId} 
        onClose={() => setForwardingMessageId(null)} 
        messageId={forwardingMessageId} 
        onSuccess={() => {
            setToast({ message: 'Сообщение переслано', type: 'success' });
            refetchMsgs(); 
            onConversationsRefetch();
        }} 
      />

      <ConversationStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        conversationId={activeConversation?.id || null}
        hasLeft={!!(activeConversation as any)?.hasLeft}
      />
      
      {activeConversation?.isGroup && (
        <GroupConversationEditor
          isOpen={isGroupEditorOpen}
          onClose={() => setIsGroupEditorOpen(false)}
          conversationId={activeConversation.id}
          currentTitle={activeConversation.title}
          currentAvatar={activeConversation.avatar}
          type={activeConversation.type}
          currentSlug={activeConversation.slug}
          myRole={activeConversation.myRole}
          onUpdate={() => {
            onConversationsRefetch();
            refetchMsgs();
          }}
        />
      )}
      
      {activeConversation?.isGroup && (
        <LeaveConversationModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          conversationId={activeConversation.id}
          myId={myId}
          onConfirm={(newAdminUserId) => executeLeaveConversation(newAdminUserId)}
          isLeaving={isLeavingConversation}
        />
      )}

      <ImageViewer 
        isOpen={isViewerOpen} 
        onClose={() => setIsViewerOpen(false)} 
        images={allChatImages} 
        initialIndex={viewerIndex} 
      />

      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        <PinnedMessageHeader 
            messages={pinnedMessages}
            currentIndex={currentPinIndex}
            onNext={handleNextPin}
            onPrev={handlePrevPin}
            onScrollTo={handleScrollToMessage}
            onUnpin={(id) => handlePinMessage(id)}
        />
        <ChatHeader
  participant={activeConversation!.participant}
  conversation={activeConversation}
  typingUsers={typingUsersSet}
  typingDisplay={typingDisplay}
  isDarkMode={isDarkMode}
  onBack={onBack}
  onDeleteForAll={() => handleDeleteConversationRequest('ALL')}
  onDeleteForMe={() => handleDeleteConversationRequest('ME')}
  onBlockUser={handleBlockUserRequest}
  onOpenStats={() => setIsStatsOpen(true)}
  onOpenEditor={() => setIsGroupEditorOpen(true)}
  onLeaveConversation={() => handleLeaveConversation()}
  onJumpToDate={handleJumpToDate}
  onShowParticipants={
    (isChannel || activeConversation?.isGroup)
      ? () => {
          if (hasLeftConversation && !isChannel) { 
            setToast({ message: 'Список участников недоступен. Вы вышли из беседы.', type: 'error' });
          } else if (isChannel && activeConversation?.myRole !== 'ADMIN') {
            setToast({ message: 'Только администраторы могут просматривать участников канала', type: 'error' });
          } else {
            setIsGroupEditorOpen(true);
          }
        }
      : undefined
  }
  myId={myId}
  // 👇 новые пропсы
  messages={messages}
  onJumpToMessage={handleScrollToMessage}
/>
        <MessageList
          messages={messages}
          myId={myId}
          isDarkMode={isDarkMode}
          isGroup={activeConversation?.isGroup ?? false}
          onReply={setReplyTo}
          onDeleteRequest={handleDeleteRequest}
          onEditRequest={handleEditRequest}
          onCopyRequest={handleCopyMessage}
          messageToAnimateId={messageToAnimateId}
          isMessagingDisabled={isMessagingDisabled}
          onRetry={handleRetry}
          onDeleteLocal={handleDeleteLocal}
          onPinMessage={handlePinMessage}
          onVisibleRangeChange={setVisibleMessageIds}
          hasPinnedMessage={pinnedMessages.length > 0}
          onForward={(msg) => setForwardingMessageId(msg.id)}
          onReactionToggled={onReactionToggled}
          conversationId={activeConversation?.id}
          hasUnreadOnOpen={(activeConversation?.unreadCount ?? 0) > 0}
          scrollToBottomTrigger={scrollToBottomTrigger}
          showUnreadBanner={showUnreadBanner}
          conversationUnreadCount={activeConversation?.unreadCount ?? 0}
          messagesLoading={messagesLoading}
          onImageClick={handleImageClick}
          isChannel={isChannel}
          isFavorites={isFavorites}
        />
        {editingMessage && (
          <div className={`px-4 py-2 text-xs flex items-center justify-between border-t ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600'}`}>
            <div className="flex items-center gap-2">
              <Edit2 size={14} className="text-blue-500" />
              <span className="font-bold">Редактирование сообщения</span>
            </div>
            <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="hover:text-red-500 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        
        {renderBottomBar()}
      </div>
    </>
  );
}