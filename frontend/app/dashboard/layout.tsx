// frontend/app/dashboard/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Header from '@/components/Header'; 
import LoadingScreen from '@/components/LoadingScreen';
import { useNotification } from '@/context/NotificationContext';
import { useApolloClient } from '@apollo/client';
import { useSocket } from '@/context/SocketContext';
import NewSessionToast from '@/components/NewSessionToast';

// ... (функция DashboardCore остается такой же) ...
function DashboardCore({ children }: { children: React.ReactNode }) {
  const { showNotification, activeConversationId } = useNotification();
  const apolloClient = useApolloClient();
  const { socket } = useSocket();
  const [newSession, setNewSession] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notificationData: any) => {
      const isCurrentChat = 
        notificationData.type === 'NEW_MESSAGE' && 
        notificationData.conversationId === activeConversationId;

      if (isCurrentChat) {
        apolloClient.refetchQueries({ include: "active" });
        return;
      }

      showNotification(notificationData);
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
      apolloClient.refetchQueries({ include: "active" });
    };

    const handleUpdates = () => apolloClient.refetchQueries({ include: "active" });
    const handleNotificationCountUpdated = () => apolloClient.refetchQueries({ include: ["GetHeaderData"] });
    const handlePostPublished = () => apolloClient.refetchQueries({ include: "active" });
    const handleNewSession = (sessionData: any) => setNewSession(sessionData);

    socket.on('new_notification', handleNewNotification);
    socket.on('friendship_update', handleUpdates);
    socket.on('user_status_change', handleUpdates);
    socket.on('user_profile_updated', handleUpdates);
    socket.on('notification_count_updated', handleNotificationCountUpdated);
    socket.on('post_published', handlePostPublished);
    socket.on('new_session_detected', handleNewSession);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('friendship_update', handleUpdates);
      socket.off('user_status_change', handleUpdates);
      socket.off('user_profile_updated', handleUpdates);
      socket.off('notification_count_updated', handleNotificationCountUpdated);
      socket.off('post_published', handlePostPublished);
      socket.off('new_session_detected', handleNewSession);
    };
  }, [showNotification, apolloClient, socket, activeConversationId]);

  return (
    <>
      {children}
      {newSession && <NewSessionToast session={newSession} onClose={() => setNewSession(null)} />}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { isConnected, connectSocket } = useSocket();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      router.replace('/');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated && !isConnected) connectSocket();
  }, [isAuthenticated, isConnected, connectSocket]);

  if (!isAuthenticated || !isConnected) return <LoadingScreen />;

 return (
  <div className="relative h-screen bg-transparent overflow-hidden">
      <Header />
      {/* Теперь main занимает всю высоту экрана, а контент скроллится под Header */}
      <main className="w-full relative h-full overflow-y-auto">
          <DashboardCore>{children}</DashboardCore>
      </main>
  </div>
);
}