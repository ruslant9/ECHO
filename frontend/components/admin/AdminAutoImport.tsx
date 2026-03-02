'use client';

import { useState, useEffect, useRef } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useSocket } from '@/context/SocketContext';
import { useTheme } from '@/context/ThemeContext'; // Добавили тему
import { Play, Trash2, Loader, ListOrdered, X, User, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const START_IMPORT = gql`
  mutation StartImport($artistName: String!) {
    startMusicImport(artistName: $artistName)
  }
`;

const CLEAR_QUEUE = gql`
  mutation ClearQueue {
    clearImportQueue
  }
`;

export default function AdminAutoImport() {
  const { isDarkMode } = useTheme(); // Получаем состояние темы
  const [inputValue, setInputValue] = useState('');
  const [logs, setLogs] = useState<{message: string, type: string}[]>([]);
  const [queueStatus, setQueueStatus] = useState<{queue: string[], isProcessing: boolean, currentArtist: string | null}>({
    queue: [],
    isProcessing: false,
    currentArtist: null
  });
  
  const { socket } = useSocket();
  const logEndRef = useRef<HTMLDivElement>(null);

  const [startImport, { loading }] = useMutation(START_IMPORT);
  const [clearQueue] = useMutation(CLEAR_QUEUE);

  useEffect(() => {
    if (!socket) return;
    socket.on('admin_import_log', (data: {message: string, type: string}) => {
      setLogs(prev => [...prev.slice(-200), data]);
    });
    socket.on('admin_import_queue_update', (data: any) => {
      setQueueStatus(data);
    });
    return () => { 
        socket.off('admin_import_log'); 
        socket.off('admin_import_queue_update');
    };
  }, [socket]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStart = async () => {
    if (!inputValue.trim()) return;
    await startImport({ variables: { artistName: inputValue } });
    setInputValue('');
  };

  // Динамические стили для контейнеров
  const containerClass = isDarkMode 
    ? "bg-zinc-900/50 border-zinc-800" 
    : "bg-white border-zinc-200 shadow-sm";
    
  const inputClass = isDarkMode
    ? "bg-black/50 border-zinc-700 text-white focus:border-lime-500"
    : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-lime-600";

  const cardSubClass = isDarkMode
    ? "bg-white/5 border-zinc-800"
    : "bg-zinc-100/50 border-zinc-200";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* ЛЕВАЯ КОЛОНКА: УПРАВЛЕНИЕ */}
      <div className="lg:col-span-1 space-y-6">
        <div className={`p-6 rounded-3xl border space-y-4 ${containerClass}`}>
          <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <Plus size={16}/> Добавить задачи
          </h3>
          <div className="relative">
            <textarea 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Скриптонит, Pharaoh, Пошлая Молли (через запятую)"
              className={`w-full h-32 p-4 rounded-2xl outline-none transition-all text-sm resize-none border ${inputClass}`}
            />
          </div>
          <button 
            onClick={handleStart}
            disabled={loading || !inputValue.trim()}
            className="w-full py-4 bg-lime-400 text-black font-black rounded-2xl hover:bg-lime-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-lime-500/10"
          >
            {loading ? <Loader className="animate-spin" /> : <Play size={18} fill="black" />}
            В ОЧЕРЕДЬ
          </button>
        </div>

        {/* СПИСОК ОЧЕРЕДИ */}
        <div className={`p-6 rounded-3xl border space-y-4 ${containerClass}`}>
          <div className="flex justify-between items-center">
            <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <ListOrdered size={16}/> Очередь ({queueStatus.queue.length})
            </h3>
            {queueStatus.queue.length > 0 && (
                <button onClick={() => clearQueue()} className="text-red-500 hover:text-red-400 cursor-pointer p-1">
                    <Trash2 size={14}/>
                </button>
            )}
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {queueStatus.currentArtist && (
                <div className="p-3 bg-lime-400/10 border border-lime-400/30 rounded-xl flex items-center gap-3 animate-pulse">
                    <Loader size={14} className="text-lime-400 animate-spin" />
                    <span className="text-xs font-bold text-lime-400 truncate">{queueStatus.currentArtist}</span>
                </div>
            )}
            
            <AnimatePresence>
                {queueStatus.queue.map((name, i) => (
                    <motion.div 
                        key={name + i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={`p-3 border rounded-xl flex items-center gap-3 ${cardSubClass}`}
                    >
                        <User size={14} className={isDarkMode ? "text-zinc-600" : "text-zinc-400"} />
                        <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{name}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
            
            {!queueStatus.currentArtist && queueStatus.queue.length === 0 && (
                <p className="text-center py-4 text-xs text-zinc-400 font-medium italic">Очередь пуста</p>
            )}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА: ТЕРМИНАЛ */}
      <div className={`lg:col-span-3 rounded-3xl border shadow-2xl overflow-hidden flex flex-col h-[600px] ${isDarkMode ? 'bg-black border-zinc-800' : 'bg-zinc-900 border-zinc-800'}`}>
        {/* Шапка терминала всегда темная для стиля */}
        <div className="px-6 py-3 bg-black/40 border-b border-white/5 flex justify-between items-center">
           <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
           </div>
           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Yandex Music Console</span>
           <button onClick={() => setLogs([])} className="text-zinc-500 hover:text-white transition-colors cursor-pointer"><X size={14}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-1 custom-scrollbar">
          {logs.length === 0 && <p className="text-zinc-700">Ожидание запуска...</p>}
          {logs.map((log, i) => (
            <p key={i} className={`leading-relaxed
              ${log.type === 'success' ? 'text-lime-400' : 
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'warn' ? 'text-yellow-400' : 'text-zinc-300'}
            `}>
              <span className="opacity-40 mr-2">{i+1}</span>
              {log.message}
            </p>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}