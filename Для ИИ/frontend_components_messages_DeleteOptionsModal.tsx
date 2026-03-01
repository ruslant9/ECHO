'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface DeleteOptionsModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (type?: 'ME' | 'ALL') => void; 
  isDarkMode: boolean;
  singleAction?: boolean; // Новый проп
}

export default function DeleteOptionsModal({ isOpen, onClose, onConfirm, isDarkMode, singleAction }: DeleteOptionsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" 
          onClick={onClose}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`w-80 p-6 rounded-2xl shadow-xl flex flex-col gap-3 ${isDarkMode ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-900'}`} 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-center mb-2">Удалить сообщение?</h3>
            
            {singleAction ? (
                // Если singleAction=true, показываем одну красную кнопку "Удалить"
                <button onClick={() => onConfirm()} className="p-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                    Удалить
                </button>
            ) : (
                // Старый режим с выбором (для удаления диалога целиком)
                <>
                    <button onClick={() => onConfirm('ME')} className={`p-3 rounded-xl font-medium transition-colors ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`}>Удалить у меня</button>
                    <button onClick={() => onConfirm('ALL')} className="p-3 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Удалить у всех</button>
                </>
            )}
            
            <button onClick={onClose} className={`mt-2 text-sm hover:underline text-center ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Отмена</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}