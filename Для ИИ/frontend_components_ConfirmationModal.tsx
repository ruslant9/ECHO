// frontend/components/ConfirmationModal.tsx
'use client';

import { AlertTriangle } from 'lucide-react';
import LiquidGlassModal from './LiquidGlassModal';
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-8 flex flex-col items-center text-center text-white"> {/* добавлен класс text-white */}
        <div className="p-4 bg-white/20 dark:bg-black/30 rounded-full mb-6 border border-white/20 shadow-inner">
          <AlertTriangle size={36} className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
        </div>
        <h2 className="font-bold text-2xl mb-3 tracking-tight">{title}</h2>
        <p className="text-sm font-medium opacity-80">{message}</p>
      </div>

      <div className="p-6 border-t border-white/20 dark:border-white/10 flex gap-4 bg-white/5 dark:bg-black/20">
        {/* ДОБАВЛЕНО: cursor-pointer */}
        <button 
          onClick={onClose} 
          className="flex-1 py-3.5 rounded-2xl font-bold transition-all bg-white/20 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/10 border border-white/30 dark:border-white/10 shadow-sm cursor-pointer text-white"
        >
          Отмена
        </button>
        {/* ДОБАВЛЕНО: cursor-pointer */}
        <button 
          onClick={handleConfirm} 
          className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer"
        >
          Подтвердить
        </button>
      </div>
    </LiquidGlassModal>
  );
}