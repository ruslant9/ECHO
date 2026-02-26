// frontend/components/PollVotersModal.tsx
'use client';

import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { gql, useQuery } from '@apollo/client';
import Avatar from './Avatar';
import Link from 'next/link';
import LiquidGlassModal from './LiquidGlassModal';

const GET_POLL_VOTERS = gql`
  query GetPollVoters($pollId: Int!) {
    getPollVoters(pollId: $pollId) {
      optionId
      user {
        id
        username
        name
        avatar
      }
    }
  }
`;

interface PollOption {
  id: number;
  text: string;
  votesCount: number;
}

interface PollVotersModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: number;
  options: PollOption[];
}

export default function PollVotersModal({ isOpen, onClose, pollId, options }: PollVotersModalProps) {
  const [activeTab, setActiveTab] = useState<number | 'ALL'>('ALL');

  const { data, loading, error } = useQuery(GET_POLL_VOTERS, {
    variables: { pollId },
    skip: !isOpen,
    fetchPolicy: 'network-only',
  });

  if (!isOpen) return null;

  const voters = data?.getPollVoters || [];

  const displayedVoters = activeTab === 'ALL'
    ? voters
    : voters.filter((v: any) => v.optionId === activeTab);

  const getOptionText = (optionId: number) => {
    return options.find(o => o.id === optionId)?.text || 'Вариант удален';
  };

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-5 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
        <h2 className="font-bold text-xl tracking-tight">Результаты опроса</h2>
        <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 p-4 overflow-x-auto glass-scrollbar border-b border-white/20 dark:border-white/10 bg-black/5 shrink-0">
         <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                ${activeTab === 'ALL' 
                    ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]' 
                    : 'bg-white/10 text-white hover:bg-white/20'}`}
         >
            Все
         </button>
         {options.map(opt => (
             <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2
                    ${activeTab === opt.id 
                        ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]' 
                        : 'bg-white/10 text-white hover:bg-white/20'}`}
             >
                <span className="max-w-25px truncate">{opt.text}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === opt.id ? 'bg-black/20 text-black' : 'bg-white/20 text-white'}`}>
                    {opt.votesCount}
                </span>
             </button>
         ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 glass-scrollbar max-h-[50vh]">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader className="animate-spin text-lime-400" size={32} />
          </div>
        ) : error ? (
           <div className="text-center py-10 text-red-400 font-medium bg-red-500/10 rounded-xl border border-red-500/20 m-2">
               Ошибка загрузки или доступ запрещен
           </div>
        ) : displayedVoters.length === 0 ? (
          <div className="text-center py-12 opacity-60 font-medium">
            Пока никто не проголосовал за этот вариант
          </div>
        ) : (
            <div className="space-y-1">
                {displayedVoters.map((item: any, idx: number) => (
                    <Link 
                        key={`${item.user.id}-${idx}`} 
                        href={`/dashboard/user/${item.user.id}`}
                        className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10"
                    >
                        <Avatar username={item.user.username} name={item.user.name} url={item.user.avatar} size="md" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-base truncate flex items-center gap-2">
                                {item.user.name || item.user.username}
                            </div>
                            {activeTab === 'ALL' && (
                                <div className="text-xs mt-0.5 truncate opacity-70">
                                    Выбрал(а): <span className="text-lime-400 font-semibold ml-1">{getOptionText(item.optionId)}</span>
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        )}
      </div>
    </LiquidGlassModal>
  );
}