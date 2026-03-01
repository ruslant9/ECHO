'use client';

import { useState, useId } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UsersRound,
  Newspaper,
  Heart,
  MessageSquare,
  MessagesSquare,
  Power,
  PowerOff,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  Activity,
  Music,
  Server,
  HardDrive,
  DownloadCloud
} from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmationModal from '@/components/ConfirmationModal';
import Toast from '@/components/Toast';
import { notFound, useRouter } from 'next/navigation';
import AdminMusicPanel from '@/components/admin/AdminMusicPanel';
import AdminAutoImport from '@/components/admin/AdminAutoImport';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';

/* ================= GRAPHQL ================= */

const GET_SERVER_STATS = gql`
  query GetServerStats {
    serverStats {
      totalUsers
      onlineUsers
      totalPosts
      totalLikes
      totalComments
      totalMessages
      totalStorageUsage
      totalStorageLimit
      storageStats {
        cloudName
        usage
        limit
        percentage
        isFull
      }
    }
    me {
      id
      isAdmin
    }
  }
`;

const PING_SERVER = gql`
  query PingServer {
    sayHello 
  }
`;

const START_SERVER = gql`mutation StartServer { startServer }`;
const STOP_SERVER = gql`mutation StopServer { stopServer }`;
const RESTART_SERVER = gql`mutation RestartServer { restartServer }`;

/* ================= TYPES ================= */

type ToastState = { message: string; type: 'success' | 'error'; };
type ConfirmationState = { isOpen: boolean; title: string; message: string; onConfirm: () => void; };
type AdminSection = 'server' | 'music' | 'import';

/* ================= HELPERS ================= */

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Байт';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const StatCard = ({ icon: Icon, title, value, color }: any) => {
  const { isDarkMode } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-6 rounded-3xl border transition-all hover:scale-[1.02] ${
        isDarkMode
          ? 'bg-zinc-900/50 border-zinc-800'
          : 'bg-white border-zinc-200 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-2xl bg-${color}-500/10 text-${color}-500`}>
          <Icon size={28} />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black mt-1">
            {value?.toLocaleString('ru-RU') ?? '...'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

/* ================= PAGE ================= */

export default function AdminDashboardPage() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const filterId = `admin-tabs-filter-${useId()}`;

  const [activeSection, setActiveSection] = useState<AdminSection>('server');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const [pingStatus, setPingStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [pingTime, setPingTime] = useState<number | null>(null);

  const { data, loading, error, refetch: refetchStats } = useQuery(GET_SERVER_STATS, {
    pollInterval: 5000,
    fetchPolicy: 'network-only',
  });

  const { refetch: refetchPing } = useQuery(PING_SERVER, {
    pollInterval: 2000,
    fetchPolicy: 'network-only',
    onCompleted: () => { setPingStatus('online'); setPingTime(null); },
    onError: () => { setPingStatus('offline'); setPingTime(null); }
  });

  const [startServer, { loading: starting }] = useMutation(START_SERVER);
  const [stopServer, { loading: stopping }] = useMutation(STOP_SERVER);
  const [restartServer, { loading: restarting }] = useMutation(RESTART_SERVER);

  const serverIsOnline = pingStatus === 'online';

  if (loading && !data) return <LoadingScreen />;
  if ((data && !data.me?.isAdmin) || error) notFound();

  const stats = data?.serverStats;

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    const mutation = action === 'start' ? startServer : action === 'stop' ? stopServer : restartServer;
    try {
      await mutation();
      setToast({ message: `Команда "${action}" отправлена`, type: 'success' });
      refetchStats(); 
      refetchPing();
    } catch (e: any) { 
       setToast({ message: e.message || 'Ошибка выполнения команды', type: 'error' });
    }
  };

  const openConfirmation = (action: 'stop' | 'restart') => {
    setConfirmation({
      isOpen: true,
      title: action === 'stop' ? 'Остановить сервер?' : 'Перезагрузить сервер?',
      message: 'Это действие может повлиять на всех пользователей онлайн.',
      onConfirm: () => handleAction(action)
    });
  };

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--saturation': '150%',
  } as React.CSSProperties;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmationModal {...confirmation} onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))} />

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 56px;
          padding: 6px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#${filterId}) saturate(var(--saturation));
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c-light) 10%, transparent);
        }
        .admin-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 24px;
          border-radius: 99em;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 200ms;
          border: 2px solid transparent;
        }
        .admin-option:hover { color: var(--c-action); }
        
        /* Исправлено: Обводка активной кнопки */
        .admin-option[data-active="true"] { 
          color: #fff; 
          cursor: default; 
          border-color: #a3e635;
          background: rgba(163, 230, 53, 0.1);
        }
        
        .admin-blob {
          border-radius: 99em;
          background-color: #a3e635;
          box-shadow: 0 0 15px rgba(163,230,53,0.5);
          opacity: 0.9;
        }
      `}} />

      <svg className="absolute w-0 h-0">
        <filter id={filterId} primitiveUnits="objectBoundingBox">
          <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64} />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
          <feDisplacementMap in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>

      <div className={`min-h-screen p-6 md:p-10 transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-gray-50 text-zinc-900'}`}>
        <div className="max-w-7xl mx-auto">
          
          {/* HEADER: Изменен на flex-col для опускания вкладок */}
          <div className="flex flex-col items-start gap-8 mb-10">
            <div>
                <button onClick={() => router.back()} className={`mb-4 px-4 py-2 rounded-full flex items-center gap-2 transition-colors cursor-pointer w-fit ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-zinc-200 hover:bg-zinc-300'}`}>
                    <ChevronLeft size={16} /> Назад
                </button>
                <h1 className="text-4xl font-black tracking-tight uppercase">Панель управления</h1>
            </div>

            {/* ВКЛАДКИ ТЕПЕРЬ ПОД ЗАГОЛОВКОМ */}
            <div className="admin-switcher" style={liquidGlassStyles}>
                {[
                    { id: 'server', label: 'Система', icon: Activity },
                    { id: 'music', label: 'Музыка', icon: Music },
                    { id: 'import', label: 'Импорт', icon: DownloadCloud }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id as AdminSection)}
                        className="admin-option gap-2"
                        data-active={activeSection === tab.id}
                    >
                        {activeSection === tab.id && (
                            <motion.div layoutId="admin-active-blob" className="admin-blob absolute inset-0 z-0" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                        )}
                        <tab.icon size={18} className="relative z-10" />
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeSection === 'server' ? (
                <motion.div 
                    key="server"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                >
                    {/* ОБЩИЙ ОБЪЕМ ХРАНИЛИЩА (НОВЫЙ БЛОК) */}
                    <div className={`p-8 rounded-[40px] border flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden ${isDarkMode ? 'bg-lime-400/5 border-lime-400/20' : 'bg-lime-50 border-lime-200'}`}>
                         <div className="flex items-center gap-6 relative z-10">
                            <div className="p-5 bg-lime-400 text-black rounded-3xl shadow-xl shadow-lime-500/20">
                                <HardDrive size={36} />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-1">Суммарное облако</p>
                                <h3 className="text-3xl font-black tabular-nums">
                                    {formatBytes(stats?.totalStorageUsage)} 
                                    <span className="text-xl font-medium opacity-40 mx-2">/</span>
                                    {formatBytes(stats?.totalStorageLimit)}
                                </h3>
                            </div>
                         </div>
                         
                         <div className="text-right relative z-10">
                             <div className="text-5xl font-black text-lime-500 mb-1">
                                {stats?.totalStorageLimit ? ((stats.totalStorageUsage / stats.totalStorageLimit) * 100).toFixed(1) : 0}%
                             </div>
                             <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Общая заполненность</p>
                         </div>

                         {/* Прогресс-бар на всю ширину */}
                         <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-200 dark:bg-white/5">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(stats?.totalStorageUsage / stats?.totalStorageLimit) * 100}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-lime-400 shadow-[0_0_20px_#a3e635]"
                             />
                         </div>
                    </div>

                    {/* Секция управления сервером */}
                    <div className={`p-8 rounded-3xl border overflow-hidden relative ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Server size={24} className="text-zinc-500"/> Управление процессом</h2>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold border ${pingStatus === 'online' ? 'bg-green-500/10 text-green-500 border-green-500/20' : pingStatus === 'offline' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                    <span className={`relative flex h-3 w-3`}>
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                      <span className={`relative inline-flex rounded-full h-3 w-3 ${pingStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </span>
                                    {pingStatus === 'online' ? 'Сервер онлайн' : pingStatus === 'offline' ? 'Сервер недоступен' : 'Проверка...'}
                                </div>

                                <div className="h-8 w-px bg-zinc-700 mx-2 hidden sm:block" />

                                <button onClick={() => handleAction('start')} disabled={starting || serverIsOnline} className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 transition-all text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 active:scale-95 cursor-pointer">
                                    <Power size={18} /> Запустить
                                </button>
                                <button onClick={() => openConfirmation('restart')} disabled={restarting || !serverIsOnline} className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 transition-all text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer">
                                    <RefreshCw size={18} /> Перезагрузить
                                </button>
                                <button onClick={() => openConfirmation('stop')} disabled={stopping || !serverIsOnline} className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 transition-all text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 active:scale-95 cursor-pointer">
                                    <PowerOff size={18} /> Остановить
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Карточки статистики */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard icon={UsersRound} title="Пользователи" value={stats?.totalUsers} color="blue" />
                        <StatCard icon={Users} title="В сети" value={stats?.onlineUsers} color="green" />
                        <StatCard icon={Newspaper} title="Посты" value={stats?.totalPosts} color="purple" />
                        <StatCard icon={Heart} title="Лайки" value={stats?.totalLikes} color="red" />
                        <StatCard icon={MessageSquare} title="Комментарии" value={stats?.totalComments} color="yellow" />
                        <StatCard icon={MessagesSquare} title="Сообщения" value={stats?.totalMessages} color="indigo" />
                    </div>

                    {/* Детализация хранилищ */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 opacity-50 px-2">
                             Аккаунты Cloudinary
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {stats?.storageStats?.map((storage: any, idx: number) => (
                                <div key={idx} className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${storage.isFull ? 'bg-red-500/10 text-red-500' : 'bg-lime-400/10 text-lime-500'}`}>
                                                <HardDrive size={20} />
                                             </div>
                                             <span className="font-bold text-sm">{storage.cloudName}</span>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${storage.isFull ? 'bg-red-500 text-white' : 'bg-zinc-100 dark:bg-white/5 text-zinc-500'}`}>
                                            {storage.isFull ? 'Full' : 'Active'}
                                        </span>
                                    </div>
                                    
                                    <div className="w-full h-3 bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden mb-3">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(storage.percentage, 100)}%` }}
                                            className={`h-full rounded-full ${storage.percentage > 90 ? 'bg-red-500' : storage.percentage > 70 ? 'bg-yellow-500' : 'bg-lime-400'}`}
                                        />
                                    </div>
                                    
                                    <div className="flex justify-between text-[11px] font-bold opacity-40 uppercase tracking-tighter">
                                        <span>{formatBytes(storage.usage)}</span>
                                        <span>{formatBytes(storage.limit)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            ) : activeSection === 'music' ? (
                <motion.div 
                    key="music"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                     <AdminMusicPanel />
                </motion.div>
            ) : (
                <motion.div
                    key="import"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    <AdminAutoImport />
                </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </>
  );
}