// frontend/components/UsersListModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { X, Loader, Search } from 'lucide-react';
import { gql, useQuery } from '@apollo/client';
import Link from 'next/link';
import Avatar from './Avatar';
import { formatTimeAgo } from '@/lib/time-ago';
import { useSocket } from '@/context/SocketContext';
import LiquidGlassModal from './LiquidGlassModal';

interface UserInList {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  lastOnlineAt?: string;
}

const GET_USER_LISTS = gql`
  query GetUserLists($id: Int!) {
    user(id: $id) {
      id
      friends { id username name avatar bio isOnline lastOnlineAt }
      subscriptions { id username name avatar bio isOnline lastOnlineAt }
      followers { id username name avatar bio isOnline lastOnlineAt }
    }
  }
`;

interface UsersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'friends' | 'subscriptions' | 'followers';
  userId: number;
}

function UserRow({ user, onClose }: { user: UserInList; onClose: () => void }) {
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const updateStatus = () => {
      if (user.isOnline) {
        setStatusText('Онлайн');
      } else if (user.lastOnlineAt) {
        setStatusText(`Был(а) в сети ${formatTimeAgo(user.lastOnlineAt)}`);
      } else {
        setStatusText('');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000);
    return () => clearInterval(interval);
  }, [user.isOnline, user.lastOnlineAt]);

  return (
    <Link
      href={`/dashboard/user/${user.id}`}
      onClick={onClose}
      className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10"
    >
      <Avatar username={user.username} name={user.name} url={user.avatar} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-100">{user.name || user.username}</div>
        <div className={`text-xs truncate ${user.isOnline ? 'text-lime-500 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {statusText || user.bio}
        </div>
      </div>
    </Link>
  );
}

export default function UsersListModal({ isOpen, onClose, userId, type }: UsersListModalProps) {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, loading, error, refetch } = useQuery<{ user: { friends?: UserInList[]; subscriptions?: UserInList[]; followers?: UserInList[] } }>(GET_USER_LISTS, {
    variables: { id: userId },
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });

  let list: UserInList[] | undefined;
  let title: string;

  if (type === 'friends') {
    list = data?.user?.friends;
    title = 'Друзья';
  } else if (type === 'subscriptions') {
    list = data?.user?.subscriptions;
    title = 'Подписки';
  } else {
    list = data?.user?.followers;
    title = 'Подписчики';
  }

  const filteredList = list?.filter(user => {
    const query = searchQuery.toLowerCase();
    const name = user.name?.toLowerCase() || '';
    const username = user.username.toLowerCase();
    return name.includes(query) || username.includes(query);
  });

  useEffect(() => {
    if (!socket || !list) return;

    const handleStatusChange = (statusData: { userId: number; isOnline: boolean }) => {
      const isUserInList = list.some((userInList: UserInList) => userInList.id === statusData.userId);
      if (isUserInList) {
        refetch();
      }
    };

    socket.on('user_status_change', handleStatusChange);
    return () => {
      socket.off('user_status_change', handleStatusChange);
    };
  }, [socket, list, refetch]);

  if (!isOpen) return null;

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
        <h2 className="font-bold text-xl tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-white/20 dark:border-white/10 bg-black/5">
        <div className="relative flex items-center px-4 py-3 rounded-xl bg-black/20 border border-white/10 focus-within:border-lime-400 transition-colors">
          <Search size={18} className="text-white/50 mr-3" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени или нику..."
            className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-white/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 glass-scrollbar max-h-[60vh]">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin text-lime-400" size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 font-medium">
            Ошибка загрузки
          </div>
        ) : list && list.length > 0 ? (
          filteredList && filteredList.length > 0 ? (
            <div className="space-y-1">
              {filteredList.map((user: UserInList) => (
                <UserRow key={user.id} user={user} onClose={onClose} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 opacity-60 font-medium text-sm">
              По вашему запросу ничего не найдено
            </div>
          )
        ) : (
          <div className="text-center py-12 opacity-60 font-medium text-sm">
            Список пуст
          </div>
        )}
      </div>
    </LiquidGlassModal>
  );
}