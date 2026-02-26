'use client';

import { X, Loader } from 'lucide-react';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import Avatar from './Avatar';
import LiquidGlassModal from './LiquidGlassModal';

interface ActionUsersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  query: any; 
  variables: object; 
}

export default function ActionUsersListModal({ isOpen, onClose, title, query, variables }: ActionUsersListModalProps) {
  const { data, loading, error } = useQuery(query, {
    variables,
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });
  
  const list = data ? data[Object.keys(data)[0]] : [];

  if (!isOpen) return null;

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
        <h2 className="font-bold text-xl tracking-tight">{title}</h2>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 glass-scrollbar max-h-[60vh]">
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin text-lime-400" size={32} />
          </div>
        )}
        {error && (
           <div className="text-center py-10 text-red-500 font-medium">Ошибка загрузки</div>
        )}
        {!loading && (!list || list.length === 0) && (
          <div className="text-center py-12 opacity-60 font-medium">Список пуст</div>
        )}
        {!loading && list && (
          <div className="space-y-1">
            {list.map((user: any, index: number) => (
              <Link
                key={`${user.id}-${index}`}
                href={`/dashboard/user/${user.id}`}
                onClick={onClose}
                className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10"
              >
                <Avatar username={user.username} name={user.name} url={user.avatar} size="md" />
                <div className="font-bold text-base truncate">{user.name || user.username}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </LiquidGlassModal>
  );
}