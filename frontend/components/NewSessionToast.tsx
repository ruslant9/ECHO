'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import { gql, useMutation } from '@apollo/client';
import Toast from './Toast';
import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext'; // 1. Импортируем тему

const TERMINATE_SESSION = gql`
  mutation TerminateSession($sessionId: Int!) {
    terminateSession(sessionId: $sessionId)
  }
`;

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export default function NewSessionToast({ session, onClose }: { session: any; onClose: () => void }) {
  const { isDarkMode } = useTheme(); // 2. Получаем состояние темы
  const [toast, setToast] = useState<ToastState | null>(null);

  const [terminateSession, { loading }] = useMutation(TERMINATE_SESSION);

  const handleTerminate = async () => {
    try {
      // Здесь мы удаляем session.id — это ID ИМЕННО НОВОЙ сессии, данные о которой пришли в сокете.
      await terminateSession({ variables: { sessionId: session.id } });
      setToast({ message: 'Сессия заблокирована', type: 'success' });
      
      // Закрываем окно через 1.5 секунды
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  return (
    <>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <motion.div
        layout
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 20, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        // 3. ОБНОВЛЕННЫЕ СТИЛИ: Теперь они соответствуют общей теме приложения
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-60 w-full max-w-lg p-5 rounded-2xl shadow-2xl flex flex-col gap-4 backdrop-blur-xl border
          ${isDarkMode 
            ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100' 
            : 'bg-white/95 border-zinc-200 text-zinc-900'
          }
        `}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full shrink-0 ${isDarkMode ? 'bg-yellow-500/10 text-yellow-500' : 'bg-yellow-100 text-yellow-600'}`}>
             <AlertTriangle size={24} />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg leading-tight mb-1">Обнаружен новый вход</h3>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Устройство: <span className="font-medium text-zinc-900 dark:text-zinc-200">{session.os}, {session.browser}</span>
              <br />
              Локация: {session.city || 'Неизвестно'} ({session.ip})
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-1">
          {/* Кнопка ЗАВЕРШИТЬ (Красная) */}
          <button 
            onClick={handleTerminate} 
            disabled={loading} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50
              ${isDarkMode 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
          >
            <X size={18} /> 
            {loading ? 'Завершение...' : 'Это не я, выкинуть'}
          </button>

          {/* Кнопка ЭТО Я (Нейтральная/Зеленая) */}
          <button 
            onClick={onClose} 
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors
               ${isDarkMode
                 ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                 : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
               }`}
          >
            <Check size={18} /> 
            Это я
          </button>
        </div>
      </motion.div>
    </>
  );
}