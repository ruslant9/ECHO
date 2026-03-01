// frontend/components/UsersListModal.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
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

// 1. ИСПРАВЛЕНО: Добавлены followers для me, чтобы можно было искать общих
const GET_USER_LISTS_AND_MY_RELATIONS = gql`
  query GetUserLists($id: Int!) {
    user(id: $id) {
      id
      friends { id username name avatar bio isOnline lastOnlineAt }
      subscriptions { id username name avatar bio isOnline lastOnlineAt }
      followers { id username name avatar bio isOnline lastOnlineAt }
    }
    me {
      id
      friends { id }
      subscriptions { id }
      followers { id } 
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
      className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer"
    >
      <Avatar username={user.username} name={user.name} url={user.avatar} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate text-zinc-900 dark:text-zinc-100">{user.name || user.username}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">@{user.username}</div>
        <div className={`text-xs truncate mt-0.5 ${user.isOnline ? 'text-lime-500 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
          {statusText}
        </div>
      </div>
    </Link>
  );
}

export default function UsersListModal({ isOpen, onClose, userId, type }: UsersListModalProps) {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMMON'>('ALL');

  const { data, loading, error, refetch } = useQuery(GET_USER_LISTS_AND_MY_RELATIONS, {
    variables: { id: userId },
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });

  const me = data?.me;
  const isMyProfile = userId === me?.id;
  
  // 2. ИСПРАВЛЕНО: Добавлен set для followers
  const myFriendIds = useMemo(() => new Set((me?.friends || []).map((f: any) => f.id)), [me]);
  const mySubscriptionIds = useMemo(() => new Set((me?.subscriptions || []).map((s: any) => s.id)), [me]);
  const myFollowerIds = useMemo(() => new Set((me?.followers || []).map((f: any) => f.id)), [me]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setActiveTab('ALL');
    }
  }, [isOpen]);

  const { list, title, commonList, commonTitle, commonCount } = useMemo(() => {
    let list: UserInList[] = [];
    let title = '';
    let commonList: UserInList[] = [];
    let commonTitle = '';
    
    if (data?.user) {
      switch (type) {
        case 'friends':
          list = data.user.friends || [];
          title = 'Друзья';
          commonList = list.filter(u => myFriendIds.has(u.id));
          commonTitle = 'Общие друзья';
          break;
        case 'subscriptions':
          list = data.user.subscriptions || [];
          title = 'Подписки';
          commonList = list.filter(u => mySubscriptionIds.has(u.id));
          commonTitle = 'Общие подписки';
          break;
        case 'followers': // 3. ИСПРАВЛЕНО: Явная логика для подписчиков
          list = data.user.followers || [];
          title = 'Подписчики';
          commonList = list.filter(u => myFollowerIds.has(u.id)); 
          commonTitle = 'Общие подписчики';
          break;
      }
    }
    return { list, title, commonList, commonTitle, commonCount: commonList.length };
  }, [data, type, myFriendIds, mySubscriptionIds, myFollowerIds]);
  
  const filteredList = useMemo(() => {
    let currentList = activeTab === 'ALL' ? list : commonList;

    if (!searchQuery.trim()) return currentList;

    const query = searchQuery.toLowerCase();
    return currentList.filter(user => {
      const name = user.name?.toLowerCase() || '';
      const username = user.username.toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  }, [list, commonList, activeTab, searchQuery]);

  useEffect(() => {
    if (!socket || !list) return;
    const handleStatusChange = (statusData: { userId: number; isOnline: boolean }) => {
      if (list.some((userInList: UserInList) => userInList.id === statusData.userId)) {
        refetch();
      }
    };
    socket.on('user_status_change', handleStatusChange);
    return () => {
      socket.off('user_status_change', handleStatusChange);
    };
  }, [socket, list, refetch]);

  if (!isOpen) return null;

  const tabButtonClass = "pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer";

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
        <h2 className="font-bold text-xl tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
          <X size={20} />
        </button>
      </div>

      {/* 4. ИСПРАВЛЕНО: Убрано условие commonCount > 0, чтобы табы показывались всегда у чужих профилей */}
      {!isMyProfile && (
        <div className="flex px-4 pt-4 gap-4 border-b border-white/10 bg-black/5">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={`${tabButtonClass} ${activeTab === 'ALL' ? 'text-lime-400 border-lime-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Все <span className="text-xs opacity-60 ml-1">{list.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('COMMON')}
            className={`${tabButtonClass} ${activeTab === 'COMMON' ? 'text-lime-400 border-lime-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            {commonTitle} <span className="text-xs opacity-60 ml-1">{commonCount}</span>
          </button>
        </div>
      )}

      <div className="p-4 bg-black/5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени или нику..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/20 border border-white/10 outline-none text-sm text-white placeholder:text-zinc-500 focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 glass-scrollbar max-h-[50vh] min-h-[200px]">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin text-lime-400" size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 font-medium">Ошибка загрузки</div>
        ) : filteredList && filteredList.length > 0 ? (
          <div className="space-y-1">
            {filteredList.map((user: UserInList) => (
              <UserRow key={user.id} user={user} onClose={onClose} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 opacity-60 font-medium text-sm">
            {searchQuery ? 'Ничего не найдено' : 'Список пуст'}
          </div>
        )}
      </div>
    </LiquidGlassModal>
  );
}