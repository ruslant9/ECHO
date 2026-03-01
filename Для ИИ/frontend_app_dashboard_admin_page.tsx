'use client';

import { useState, useId } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UsersRound, Newspaper, Heart, MessageSquare, MessagesSquare,
  Power, PowerOff, RefreshCw, AlertTriangle, ChevronLeft, Activity,
  Music, Server, HardDrive, DownloadCloud, Play, Trash2, Loader
} from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import ConfirmationModal from '@/components/ConfirmationModal';
import Toast from '@/components/Toast';
import { notFound, useRouter } from 'next/navigation';
import AdminMusicPanel from '@/components/admin/AdminMusicPanel';
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
type AdminSection = 'server' | 'music';

/* ================= UI COMPONENTS ================= */

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

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Байт';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Если данных нет и мы точно знаем, что юзер не админ — тогда 404
if (data && data.me && !data.me.isAdmin) {
    notFound();
}

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

      {/* Стили для вкладок */}
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 56px;
          padding: 5px;
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
          transition: color 200ms;
        }
        .admin-option:hover { color: var(--c-action); }
        .admin-option[data-active="true"] { color: ${isDarkMode ? '#000' : '#000'}; cursor: default; }
        
        .admin-blob {
          border-radius: 99em;
          background-color: #a3e635;
          box-shadow: 0 0 15px rgba(163,230,53,0.5);
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
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <button onClick={() => router.back()} className={`mb-4 px-4 py-2 rounded-full flex items-center gap-2 transition-colors cursor-pointer w-fit ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-zinc-200 hover:bg-zinc-300'}`}>
                    <ChevronLeft size={16} /> Назад
                </button>
                <h1 className="text-4xl font-black tracking-tight">Панель администратора</h1>
            </div>

            {/* ВКЛАДКИ (ПЕРЕКЛЮЧАТЕЛЬ) */}
          <div className="admin-switcher" style={liquidGlassStyles}>
                {[
                    { id: 'server', label: 'Система', icon: Activity },
                    { id: 'music', label: 'Медиатека', icon: Music },
                    { id: 'import', label: 'Автозагрузка', icon: DownloadCloud }
                ].map((tab) => (
                    <button key={tab.id} onClick={() => setActiveSection(tab.id as AdminSection)} className="admin-option gap-2" data-active={activeSection === tab.id}>
                        {activeSection === tab.id && <motion.div layoutId="admin-active-blob" className="admin-blob" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                        <tab.icon size={18} /> <span className="relative z-10">{tab.label}</span>
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
                            {error && (
                                <div className="mt-6 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm flex items-center gap-3 border border-red-500/20">
                                    <AlertTriangle size={20} />
                                    <span>Ошибка соединения с API статистики. Проверьте логи сервера.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Карточки статистики */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard icon={UsersRound} title="Всего пользователей" value={stats?.totalUsers} color="blue" />
                        <StatCard icon={Users} title="Онлайн сейчас" value={stats?.onlineUsers} color="green" />
                        <StatCard icon={Newspaper} title="Опубликовано постов" value={stats?.totalPosts} color="purple" />
                        <StatCard icon={Heart} title="Поставлено лайков" value={stats?.totalLikes} color="red" />
                        <StatCard icon={MessageSquare} title="Написано комментов" value={stats?.totalComments} color="yellow" />
                        <StatCard icon={MessagesSquare} title="Сообщений в чатах" value={stats?.totalMessages} color="indigo" />
                    </div>

                    {/* Секция хранилищ Cloudinary */}
                    <div className={`mt-8 p-8 rounded-3xl border overflow-hidden relative ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><HardDrive size={24} className="text-zinc-500"/> Состояние облачных хранилищ</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {stats?.storageStats?.map((storage: any, idx: number) => (
                                <div key={idx} className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-sm flex items-center gap-2">
                                            Диск {idx + 1} 
                                            <span className="text-xs font-normal opacity-50">({storage.cloudName})</span>
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${storage.isFull ? 'bg-red-500/20 text-red-500' : 'bg-lime-400/20 text-lime-600 dark:text-lime-400'}`}>
                                            {storage.isFull ? 'Переполнен' : 'Активен'}
                                        </span>
                                    </div>
                                    
                                    {/* Прогресс-бар */}
                                    <div className="w-full h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-2 relative">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(storage.percentage, 100)}%` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className={`h-full rounded-full relative ${storage.percentage > 90 ? 'bg-red-500' : storage.percentage > 75 ? 'bg-yellow-500' : 'bg-lime-400'}`}
                                        >
                                            {/* Полосатая текстура */}
                                            <div className="absolute inset-0 w-full h-full opacity-20" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%, transparent 50%, #fff 50%, #fff 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }} />
                                        </motion.div>
                                    </div>
                                    
<div className="flex justify-between text-xs font-medium opacity-60">
    <span>Занято: {formatBytes(storage.usage)} ({storage.percentage.toFixed(1)}%)</span>
    <span>Всего: {formatBytes(storage.limit)}</span>
</div>                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div 
                    key="music"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                     <AdminMusicPanel />
                </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </>
  );
}