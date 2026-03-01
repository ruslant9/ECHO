'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut } from 'lucide-react';
import { gql, useQuery } from '@apollo/client';
import Avatar from '@/components/Avatar';
import { useTheme } from '@/context/ThemeContext';
import LiquidGlassModal from '../LiquidGlassModal';
const GET_CONVERSATION_PARTICIPANTS = gql`
  query GetConversationParticipantsForLeave($conversationId: Int!) {
    conversationParticipants(conversationId: $conversationId) {
      id
      username
      name
      avatar
      role
    }
  }
`;

interface Participant {
  id: number;
  username: string;
  name?: string | null;
  avatar?: string | null;
  role: string;
  isOnline: boolean;
}

interface LeaveConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  myId: number;
  /** Для админа — id нового админа; для не-админа можно не передавать */
  onConfirm: (newAdminUserId?: number) => void;
  isLeaving?: boolean;
}

export default function LeaveConversationModal({
  isOpen,
  onClose,
  conversationId,
  myId,
  onConfirm,
  isLeaving = false,
}: LeaveConversationModalProps) {
  const { isDarkMode } = useTheme();
  const { data } = useQuery<{ conversationParticipants: Participant[] }>(GET_CONVERSATION_PARTICIPANTS, {
    variables: { conversationId },
    skip: !isOpen,
  });

  const participants = data?.conversationParticipants || [];
  const myParticipant = participants.find((p) => p.id === myId);
  const isAdmin = (myParticipant as any)?.role === 'ADMIN';
  const otherParticipants = participants.filter((p) => p.id !== myId);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    if (isAdmin && otherParticipants.length > 0) {
      setSelectedId((prev) => {
        const stillValid = prev != null && otherParticipants.some((p) => p.id === prev);
        return stillValid ? prev : otherParticipants[0].id;
      });
    } else {
      setSelectedId(null);
    }
  }, [isOpen, isAdmin, otherParticipants.length, otherParticipants.map((p) => p.id).join(',')]);

  const handleConfirm = () => {
    if (isAdmin && selectedId != null) {
      onConfirm(selectedId);
    } else if (!isAdmin) {
      onConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
     <div className="p-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
  <h2 className="font-bold text-xl flex items-center gap-3 text-red-400">
    <LogOut size={24} /> Выйти из беседы
  </h2>
  <button onClick={onClose} disabled={isLeaving} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"><X size={20} /></button>
</div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 glass-scrollbar max-h-[60vh] bg-black/5">
        {!isAdmin ? (
          <p className="font-medium opacity-90 text-lg leading-relaxed">Вы уверены, что хотите покинуть этот диалог? Вы потеряете доступ к сообщениям.</p>
        ) : (
          <>
            <p className="font-medium opacity-90 mb-4 text-sm bg-blue-500/20 text-blue-200 p-4 rounded-xl border border-blue-500/30">
              Вы являетесь создателем. Выберите нового администратора перед выходом.
            </p>
            {otherParticipants.length === 0 ? (
              <p className="opacity-60 italic text-center py-6">В беседе нет других участников. Просто удалите её.</p>
            ) : (
              <ul className="space-y-2">
                {otherParticipants.map((p) => (
                  <li key={p.id}>
                    <div onClick={() => setSelectedId(p.id)} className={`w-full flex items-center gap-4 p-3 rounded-xl cursor-pointer border transition-all ${selectedId === p.id ? 'bg-lime-400/20 border-lime-400/50 shadow-inner' : 'bg-black/20 border-white/5 hover:bg-white/10'}`}>
                      <Avatar url={p.avatar ?? undefined} username={p.username} name={p.name ?? undefined} size="md" />
                      <div className="flex-1 text-left min-w-0">
                        <span className="font-bold text-base truncate block">{p.name || p.username}</span>
                      </div>
                      {selectedId === p.id && <div className="w-4 h-4 bg-lime-400 rounded-full shadow-[0_0_10px_#a3e635]" />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

     <div className="p-6 border-t border-white/20 dark:border-white/10 flex gap-3 bg-white/5 dark:bg-black/10 shrink-0">
  <button 
    onClick={onClose} 
    disabled={isLeaving} 
    className="flex-1 py-3.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all cursor-pointer" // <--- ДОБАВЛЕНО
  >
    Отмена
  </button>
  <button 
    onClick={handleConfirm} 
    disabled={(isAdmin && selectedId == null) || isLeaving} 
    className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-30 disabled:shadow-none cursor-pointer" // <--- ДОБАВЛЕНО
  >
    {isLeaving ? 'Выход…' : (isAdmin ? 'Передать и выйти' : 'Выйти')}
  </button>
</div>

    </LiquidGlassModal>
  );
}
