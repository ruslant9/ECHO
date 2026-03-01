// frontend/context/SocketContext.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectSocket: () => void; // <--- Новый метод
  disconnectSocket: () => void; // <--- Новый метод
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Функция для ручного подключения (вызывается при логине)
  const connectSocket = useCallback(() => {
    const token = Cookies.get('token');
    
    if (!token) {
        console.warn("Socket connect aborted: No token found");
        return;
    }

    if (socket) {
      // Если сокет уже есть, обновляем токен и подключаемся
      socket.auth = { token };
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      // Создаем новый инстанс, если его нет
      const socketInstance = io('http://127.0.0.1:3400', {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      socketInstance.on('connect', () => {
        console.log('Global Socket Connected:', socketInstance.id);
        setIsConnected(true);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Global Socket Disconnected:', reason);
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Socket Connection Error:', err.message);
        setIsConnected(false); // Убеждаемся, что статус false
      });

      setSocket(socketInstance);
    }
  }, [socket]);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setIsConnected(false);
    }
  }, [socket]);

  // Автоматическое подключение при загрузке, если есть токен
  useEffect(() => {
    const token = Cookies.get('token');
    if (token && !socket) {
      connectSocket();
    }
    
    return () => {
        // Опционально: можно не отключать сокет при размонтировании провайдера, 
        // чтобы он жил при навигации, но если провайдер в layout, это ок.
    };
  }, [connectSocket, socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connectSocket, disconnectSocket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}