'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react'; // <--- Добавили useEffect
import NotificationToast from '@/components/NotificationToast';
import NewMessageToast from '@/components/NewMessageToast';
import { gql, useMutation } from '@apollo/client';

interface NotificationContextType {
  showNotification: (notification: any) => void;
  markNotificationAsRead: (id: number) => void;
  setActiveChatParticipantId: (id: number | null) => void;
  setActiveConversationId: (id: number | null) => void;
  activeConversationId: number | null; // <--- ADD THIS LINE
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MARK_READ_NOTIFICATIONS = gql`
  mutation MarkReadNotifications($ids: [Int!]!) {
    markNotificationsRead(ids: $ids)
  }
`;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [standardNotification, setStandardNotification] = useState<any | null>(null);
  const [messageNotification, setMessageNotification] = useState<any | null>(null);
  
  const [activeChatParticipantId, setActiveChatParticipantId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  const [markReadMutation] = useMutation(MARK_READ_NOTIFICATIONS);

  // --- Автоматическое закрытие тоста о новом сообщении при заходе в диалог/беседу ---
  useEffect(() => {
    if (!messageNotification) return;
    // Личный диалог: закрываем, если открыт чат с этим пользователем
    if (activeChatParticipantId && messageNotification.initiator?.id === activeChatParticipantId && !messageNotification.conversationId) {
      setMessageNotification(null);
      return;
    }
    // Беседа: закрываем, если открыта эта беседа
    if (activeConversationId != null && messageNotification.conversationId != null && messageNotification.conversationId === activeConversationId) {
      setMessageNotification(null);
    }
  }, [activeChatParticipantId, activeConversationId, messageNotification]);
  // ---------------------------------------------------------

  const showNotification = useCallback((newNotification: any) => {
    if (newNotification.type === 'NEW_MESSAGE') {
      if (newNotification.conversationId != null && newNotification.conversationId === activeConversationId) {
        return;
      }
      if (newNotification.initiator?.id === activeChatParticipantId && !newNotification.conversationId) {
        return;
      }
      if (!messageNotification) {
        setMessageNotification(newNotification);
      }
    } else {
      setStandardNotification(newNotification);
    }
  }, [messageNotification, activeChatParticipantId, activeConversationId]);

  const markNotificationAsRead = useCallback(async (id: number) => {
    try {
      await markReadMutation({ variables: { ids: [id] } });
    } catch (error) {
      console.error('Не удалось пометить уведомление как прочитанное:', error);
    }
  }, [markReadMutation]);

  const handleStandardClose = () => setStandardNotification(null);
  const handleMessageClose = () => setMessageNotification(null);

  const value = useMemo(
    () => ({ 
      showNotification, 
      markNotificationAsRead, 
      setActiveChatParticipantId, 
      setActiveConversationId,
      activeConversationId // <--- ADD THIS PROPERTY
    }),
    [showNotification, markNotificationAsRead, activeConversationId] // <--- ADD TO DEPENDENCY ARRAY
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {standardNotification && (
        <NotificationToast notification={standardNotification} onClose={handleStandardClose} />
      )}
      {messageNotification && (
        <NewMessageToast notification={messageNotification} onClose={handleMessageClose} />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}