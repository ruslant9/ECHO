// frontend/components/Toast.tsx

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' 
    ? 'bg-green-500/90 dark:bg-green-600/90 border-green-700' 
    : 'bg-red-500/90 dark:bg-red-600/90 border-red-700';

  return (
   <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 20, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        // ИЗМЕНЕНО: z-index поставлен 10001 (выше модалки 9999)
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-[10001] min-w-80 max-w-md p-4 rounded-xl shadow-lg text-white font-semibold flex items-center gap-4 backdrop-blur-sm border ${bgColor}`}
      >
        {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
        
        <span className="flex-1">{message}</span>
        
        {/* ДОБАВЛЕНО: cursor-pointer */}
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
            <X size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}