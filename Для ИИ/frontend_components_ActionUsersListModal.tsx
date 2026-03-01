// frontend/components/ActionUsersListModal.tsx
'use client';

import { useState, useMemo } from 'react';
import { X, Loader, Search } from 'lucide-react';
import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';
import Avatar from './Avatar';
import LiquidGlassModal from './LiquidGlassModal';

// Запрос для получения ID друзей текущего пользователя
const GET_MY_FRIEND_IDS = gql`
  query GetMyFriendIdsForFilter {
    myFriends {
      friend { id }
    }
  }
`;

interface ActionUsersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  query: any; 
  variables: object; 
}

export default function ActionUsersListModal({ isOpen, onClose, title, query, variables }: ActionUsersListModalProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FRIENDS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Запрос списка пользователей (лайкнувших или репостнувших)
  const { data, loading, error } = useQuery(query, {
    variables,
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });
  
  // Запрос списка моих друзей для фильтрации
  const { data: friendsData } = useQuery(GET_MY_FRIEND_IDS, {
    skip: !isOpen,
    fetchPolicy: 'cache-first'
  });

  const allUsers = data ? data[Object.keys(data)[0]] : [];
  const friendIds = useMemo(() => {
      return new Set((friendsData?.myFriends || []).map((f: any) => f.friend.id));
  }, [friendsData]);

  // Фильтрация и поиск
  const filteredList = useMemo(() => {
      if (!allUsers) return [];

      let list = allUsers;

      // 1. Фильтр по вкладке
      if (activeTab === 'FRIENDS') {
          list = list.filter((u: any) => friendIds.has(u.id));
      }

      // 2. Поиск
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          list = list.filter((u: any) => 
              (u.name && u.name.toLowerCase().includes(q)) || 
              (u.username && u.username.toLowerCase().includes(q))
          );
      }

      return list;
  }, [allUsers, activeTab, searchQuery, friendIds]);

  const friendsCount = useMemo(() => {
      if (!allUsers) return 0;
      return allUsers.filter((u: any) => friendIds.has(u.id)).length;
  }, [allUsers, friendIds]);

  if (!isOpen) return null;

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      {/* Шапка */}
      <div className="p-5 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
        <h2 className="font-bold text-xl tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
          <X size={20} />
        </button>
      </div>

      {/* Вкладки */}
      <div className="flex px-4 pt-4 gap-4 border-b border-white/10 bg-black/5">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'ALL' ? 'text-lime-400 border-lime-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
              Все <span className="text-xs opacity-60 ml-1">{allUsers?.length || 0}</span>
          </button>
          <button 
            onClick={() => setActiveTab('FRIENDS')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'FRIENDS' ? 'text-lime-400 border-lime-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
              Друзья <span className="text-xs opacity-60 ml-1">{friendsCount}</span>
          </button>
      </div>

      {/* Поиск */}
      <div className="p-4 bg-black/5">
        <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..." 
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/20 border border-white/10 outline-none text-sm text-white placeholder:text-zinc-500 focus:border-lime-400/50 transition-colors"
            />
        </div>
      </div>

      {/* Список */}
      <div className="flex-1 overflow-y-auto p-2 glass-scrollbar max-h-[560px] min-h-[200px]">
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin text-lime-400" size={32} />
          </div>
        )}
        {error && (
           <div className="text-center py-10 text-red-500 font-medium">Ошибка загрузки</div>
        )}
        {!loading && filteredList.length === 0 && (
          <div className="text-center py-12 opacity-50 font-medium text-sm">
             {searchQuery ? 'Ничего не найдено' : (activeTab === 'FRIENDS' ? 'Среди лайкнувших нет ваших друзей' : 'Список пуст')}
          </div>
        )}
        {!loading && filteredList.length > 0 && (
          <div className="space-y-1">
            {filteredList.map((user: any, index: number) => (
              <Link
                key={`${user.id}-${index}`}
                href={`/dashboard/user/${user.id}`}
                onClick={onClose}
                className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10"
              >
                <Avatar username={user.username} name={user.name} url={user.avatar} size="md" />
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-base truncate">{user.name || user.username}</div>
                    <div className="text-xs text-zinc-500 truncate">@{user.username}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </LiquidGlassModal>
  );
}