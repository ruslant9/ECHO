'use client';

import LiquidGlassModal from './LiquidGlassModal';

interface DeleteOptionsModalProps { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (type?: 'ME' | 'ALL') => void; 
  singleAction?: boolean; 
}

export default function DeleteOptionsModal({ isOpen, onClose, onConfirm, singleAction }: DeleteOptionsModalProps) {
  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-8 flex flex-col gap-3 text-white"> {/* добавлен класс text-white */}
        <h3 className="font-bold text-2xl text-center mb-4 tracking-tight">Удалить сообщение?</h3>
        
        {singleAction ? (
            <button onClick={() => onConfirm()} className="p-4 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                Удалить
            </button>
        ) : (
            <>
                <button onClick={() => onConfirm('ME')} className="p-4 rounded-2xl font-bold transition-all bg-white/20 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/10 border border-white/30 dark:border-white/10 shadow-sm text-white">
                    Удалить у меня
                </button>
                <button onClick={() => onConfirm('ALL')} className="p-4 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors border border-red-400/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                    Удалить у всех
                </button>
            </>
        )}
        
        <button onClick={onClose} className="mt-4 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity text-center text-white">
            Отмена
        </button>
      </div>
    </LiquidGlassModal>
  );
}