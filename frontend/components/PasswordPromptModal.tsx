'use client';

import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Loader } from 'lucide-react';
import LiquidGlassModal from './LiquidGlassModal';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  message: string;
  isLoading: boolean;
}

export default function PasswordPromptModal({ isOpen, onClose, onConfirm, title, message, isLoading }: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setPassword(''); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) onConfirm(password);
  };

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-white/20 dark:bg-black/30 rounded-full border border-white/20 shadow-inner">
            <ShieldCheck size={28} className="text-lime-400 drop-shadow-[0_0_10px_rgba(163,230,53,0.8)]" />
          </div>
          <div>
            <h3 className="font-bold text-xl leading-tight">{title}</h3>
            <p className="text-sm opacity-80 mt-1">{message}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите ваш текущий пароль"
            className="w-full p-4 rounded-2xl bg-white/30 dark:bg-black/40 border border-white/30 dark:border-white/10 outline-none focus:border-white/70 dark:focus:border-white/40 placeholder:text-zinc-600 dark:placeholder:text-zinc-400 shadow-inner transition-colors font-medium"
          />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl font-bold transition-all bg-white/20 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/10 border border-white/30 dark:border-white/10 shadow-sm">
              Отмена
            </button>
            <button type="submit" disabled={!password || isLoading} className="flex-1 py-3.5 bg-lime-400 hover:bg-lime-500 text-black rounded-2xl font-bold transition-all border border-lime-300 shadow-[0_0_20px_rgba(163,230,53,0.4)] disabled:opacity-50 flex items-center justify-center">
              {isLoading ? <Loader className="animate-spin" size={20} /> : 'Подтвердить'}
            </button>
          </div>
        </form>
      </div>
    </LiquidGlassModal>
  );
}