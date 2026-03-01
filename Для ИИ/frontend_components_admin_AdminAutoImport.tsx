'use client';

import { useState, useEffect, useRef } from 'react';
import { gql, useMutation } from '@apollo/client';
import { useSocket } from '@/context/SocketContext';
import { Search, Play, Trash2, Loader } from 'lucide-react';

const START_IMPORT = gql`
  mutation StartImport($artistName: String!) {
    startMusicImport(artistName: $artistName)
  }
`;

export default function AdminAutoImport() {
  const [artistName, setArtistName] = useState('');
  const [logs, setLogs] = useState<{message: string, type: string}[]>([]);
  const { socket } = useSocket();
  const logEndRef = useRef<HTMLDivElement>(null);

  const [startImport, { loading }] = useMutation(START_IMPORT);

  useEffect(() => {
    if (!socket) return;

    socket.on('admin_import_log', (data: {message: string, type: string}) => {
      setLogs(prev => [...prev, data]);
    });

    return () => { socket.off('admin_import_log'); };
  }, [socket]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStart = async () => {
    if (!artistName.trim()) return;
    setLogs([{ message: '--- Инициализация сессии ---', type: 'info' }]);
    await startImport({ variables: { artistName } });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input 
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Введите имя артиста (например: Скриптонит)"
            className="w-full pl-12 pr-4 py-4 bg-black/50 border border-zinc-700 rounded-2xl outline-none focus:border-lime-500 transition-all text-white"
          />
        </div>
        <button 
          onClick={handleStart}
          disabled={loading || !artistName}
          className="px-8 py-4 bg-lime-400 text-black font-black rounded-2xl hover:bg-lime-500 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-lime-500/20"
        >
          {loading ? <Loader className="animate-spin" /> : <Play size={20} fill="black" />}
          ЗАПУСТИТЬ ИМПОРТ
        </button>
      </div>

      {/* TERMINAL WINDOW */}
      <div className="bg-black rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[500px]">
        <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
           <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
           </div>
           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Yandex Music Importer Console</span>
           <button onClick={() => setLogs([])} className="text-zinc-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-1 custom-scrollbar">
          {logs.length === 0 && <p className="text-zinc-700">Ожидание запуска...</p>}
          {logs.map((log, i) => (
            <p key={i} className={`
              ${log.type === 'success' ? 'text-lime-400' : 
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'warn' ? 'text-yellow-400' : 'text-zinc-300'}
            `}>
              {log.message}
            </p>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}