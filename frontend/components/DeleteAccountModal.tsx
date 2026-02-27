'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- 1. ИМПОРТ
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import PasswordPromptModal from './PasswordPromptModal';
import LiquidGlassModal from './LiquidGlassModal';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (password: string) => void;
  isLoading: boolean;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirmDelete,
  isLoading,
}: DeleteAccountModalProps) {
  const { isDarkMode } = useTheme();
  const [confirmText, setConfirmText] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mouseDownTarget = useRef<EventTarget | null>(null);
  
  // --- 2. ДОБАВЛЕНО: Состояние для проверки монтирования на клиенте
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Компонент смонтирован, можно использовать document
    if (isOpen) {
      setConfirmText('');
      setShowPasswordPrompt(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownTarget.current = e.target;
  };

  const handleModalContentMouseDown = (e: React.MouseEvent) => {
    mouseDownTarget.current = e.target;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
      onClose();
    }
    mouseDownTarget.current = null;
  };

  const handleTextConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.toLowerCase() === 'подтвердить') {
      setShowPasswordPrompt(true);
    }
  };

  // Если не открыто или не смонтировано (SSR), ничего не рендерим
  if (!isOpen || !mounted) return null;

  // --- 3. ОБЕРТКА createPortal
  if (!isOpen || !mounted) return null;

  return (
    <>
      <LiquidGlassModal isOpen={isOpen && !showPasswordPrompt} onClose={onClose} maxWidth="max-w-md">
        <div className="p-8 text-white"> {/* добавлен класс text-white */}
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-red-500/20 rounded-full border border-red-500/30 shadow-inner">
              <ShieldAlert size={32} className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
            </div>
            <div>
              <h3 className="font-bold text-2xl tracking-tight">Удалить аккаунт?</h3>
              <p className="text-sm font-medium opacity-80 mt-1">Это действие НЕОБРАТИМО.</p>
            </div>
          </div>

          <form onSubmit={handleTextConfirm} className="space-y-5">
            <div>
              <label htmlFor="confirm-text" className="block text-xs font-bold uppercase mb-2 opacity-60">
                Введите слово "ПОДТВЕРДИТЬ"
              </label>
              <input
                id="confirm-text"
                ref={inputRef}
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ПОДТВЕРДИТЬ"
                className="w-full p-4 rounded-2xl bg-black/20 border border-white/20 outline-none focus:border-red-400 placeholder:text-white/30 transition-colors font-bold tracking-widest text-center text-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-white">
                Отмена
              </button>
              <button type="submit" disabled={confirmText.toLowerCase() !== 'подтвердить'} className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50 flex justify-center items-center gap-2">
                Продолжить <ArrowRight size={18} />
              </button>
            </div>
          </form>
        </div>
      </LiquidGlassModal>

      <PasswordPromptModal
        isOpen={showPasswordPrompt}
        onClose={() => { setShowPasswordPrompt(false); setConfirmText(''); onClose(); }}
        onConfirm={onConfirmDelete}
        isLoading={isLoading}
        title="Финальное подтверждение"
        message="Введите пароль для безвозвратного удаления."
      />
    </>
  );
}