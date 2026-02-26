'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, Users, UserPlus, Inbox, ArrowUpRight, Loader, 
  SlidersHorizontal, MapPin, Calendar, Users as GenderIcon 
} from 'lucide-react';
import { gql, useQuery, useMutation, useApolloClient } from '@apollo/client';
import FriendCard from '@/components/FriendCard';
import { useTheme } from '@/context/ThemeContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import Toast from '@/components/Toast';
import { useSocket } from '@/context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants';
import CustomSelect from '@/components/CustomSelect';

const GET_DATA = gql`
  query GetFriendsData {
    myFriends { id score friend { id username name avatar location isOnline lastOnlineAt } } 
    incomingRequests { id sender { id username name avatar location isOnline lastOnlineAt } } 
    outgoingRequests { id receiver { id username name avatar location isOnline lastOnlineAt } }
  }
`;

const SEARCH_USERS = gql`
    query SearchUsers($query: String, $city: String, $gender: String, $registeredAfter: String) {
        searchUsers(query: $query, city: $city, gender: $gender, registeredAfter: $registeredAfter) { 
            id username name avatar location gender createdAt isOnline lastOnlineAt 
        }
    }
`;

const SEND_REQUEST = gql`mutation Send($targetId: Int!) { sendFriendRequest(targetId: $targetId) }`;
const ACCEPT_REQUEST = gql`mutation Accept($requestId: Int!) { acceptFriendRequest(requestId: $requestId) }`;
const REJECT_REQUEST = gql`mutation Reject($requestId: Int!) { rejectFriendRequest(requestId: $requestId) }`;
const REMOVE_FRIEND = gql`mutation Remove($friendId: Int!) { removeFriend(friendId: $friendId) }`;
const CANCEL_REQUEST = gql`mutation Cancel($requestId: Int!) { cancelFriendRequest(requestId: $requestId) }`;

const genderOptions = [
  { value: 'all', label: 'Любой' },
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
];

const regDateOptions = [
  { value: 'all', label: 'За всё время' },
  { value: 'last_year', label: 'Не более года' },
  { value: 'last_month', label: 'Новенькие (до 1 мес)' },
];

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'outgoing' | 'search'>('friends');
  const { isDarkMode } = useTheme();
  const { socket } = useSocket();
  const client = useApolloClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterRegDate, setFilterRegDate] = useState('all');

  const [filterOverflow, setFilterOverflow] = useState('overflow-hidden');

  const [debouncedFilters, setDebouncedFilters] = useState({ 
      query: '', city: '', gender: 'all', registeredAfter: null as string | null 
  });
  
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam && ['friends', 'requests', 'outgoing', 'search'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  useEffect(() => {
    const handler = setTimeout(() => {
        let dateStr = null;
        if (filterRegDate === 'last_month') {
            const d = new Date(); d.setMonth(d.getMonth() - 1); dateStr = d.toISOString();
        } else if (filterRegDate === 'last_year') {
            const d = new Date(); d.setFullYear(d.getFullYear() - 1); dateStr = d.toISOString();
        }

        setDebouncedFilters({
            query: searchQuery,
            city: filterCity,
            gender: filterGender,
            registeredAfter: dateStr
        });
    }, 500); 
    return () => clearTimeout(handler);
  }, [searchQuery, filterCity, filterGender, filterRegDate]);

  const [sentRequests, setSentRequests] = useState<Set<number>>(new Set());
  const [confirmation, setConfirmation] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data, loading, refetch } = useQuery(GET_DATA, { pollInterval: 5000, fetchPolicy: 'cache-and-network' });
  
  const shouldSkipSearch = activeTab !== 'search' || 
      (debouncedFilters.query.length < 2 && !debouncedFilters.city && debouncedFilters.gender === 'all' && !debouncedFilters.registeredAfter);

  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_USERS, { 
      variables: debouncedFilters, 
      skip: shouldSkipSearch,
      fetchPolicy: 'network-only'
  });

  const [sendReq] = useMutation(SEND_REQUEST);
  const [acceptReq] = useMutation(ACCEPT_REQUEST, { onCompleted: () => refetch() });
  const [rejectReq] = useMutation(REJECT_REQUEST, { onCompleted: () => refetch() });
  const [removeFriend] = useMutation(REMOVE_FRIEND, { onCompleted: () => refetch() });
  const [cancelReq] = useMutation(CANCEL_REQUEST, { onCompleted: () => refetch() });

  const handleAction = async (action: string, id: number) => {
    try {
        if (action === 'add') {
            setSentRequests(prev => new Set(prev).add(id));
            await sendReq({ variables: { targetId: id } });
            await refetch();
            setToast({ message: 'Заявка отправлена', type: 'success' }); 
        }
        if (action === 'accept') {
          await acceptReq({ variables: { requestId: id } });
          setToast({ message: 'Заявка принята', type: 'success' });
        }
        if (action === 'reject') {
          await rejectReq({ variables: { requestId: id } });
          setToast({ message: 'Заявка отклонена', type: 'success' });
        }
        if (action === 'cancel') {
          const outgoing = data?.outgoingRequests || [];
          const requestObj = outgoing.find((r: any) => r.id === id);
          const targetUserId = requestObj?.receiver?.id;
          
          await cancelReq({ variables: { requestId: id } });
          
          if (targetUserId) {
              setSentRequests(prev => {
              const next = new Set(prev);
              next.delete(targetUserId);
              return next;
              });
          }
          setToast({ message: 'Заявка отменена', type: 'success' });
      }
        if (action === 'remove') {
            setConfirmation({
                isOpen: true,
                title: 'Удалить друга?',
                message: 'Это действие нельзя будет отменить. Вы уверены?',
                onConfirm: async () => {
                    try {
                      await removeFriend({ variables: { friendId: id } });
                      setToast({ message: 'Пользователь удален из друзей', type: 'success' });
                    } catch (e) {
                      setToast({ message: 'Ошибка при удалении', type: 'error' });
                    }
                }
            });
        }
    } catch (e: any) {
        const errorMsg = e.graphQLErrors?.[0]?.message || e.message || 'Ошибка действия';
        if (action === 'add' && (errorMsg.includes('уже существует') || errorMsg.includes('уже друзья'))) {
           setToast({ message: 'Заявка уже отправлена', type: 'success' });
           await refetch();
        } else if (action === 'cancel' && (errorMsg.includes('не найдена') || errorMsg.includes('нет прав'))) {
           setToast({ message: 'Заявка уже была отменена или не существует', type: 'error' });
           await refetch(); 
        } else {
           setToast({ message: errorMsg, type: 'error' });
           if (action === 'add') setSentRequests(prev => { const next = new Set(prev); next.delete(id); return next; });
        }
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
        refetch(); 
        if (activeTab === 'search') client.refetchQueries({ include: ['SearchUsers'] });
    };
    socket.on('friendship_update', handleUpdate);
    socket.on('profile_update_required', handleUpdate);
    return () => {
        socket.off('friendship_update', handleUpdate);
        socket.off('profile_update_required', handleUpdate);
    };
  }, [socket, refetch, activeTab, client]);

  const friends = data?.myFriends || [];
  const incoming = data?.incomingRequests || [];
  const outgoing = data?.outgoingRequests || [];
  const searchResults = searchData?.searchUsers || [];
  const outgoingIds = new Set(outgoing.map((req: any) => req.receiver.id));
  const friendIds = new Set(friends.map((f: any) => f.friend.id));

  const tabs = useMemo(() => [
    { id: 'friends', label: 'Мои друзья', icon: Users, count: friends.length },
    { id: 'requests', label: 'Входящие', icon: Inbox, count: incoming.length },
    { id: 'outgoing', label: 'Исходящие', icon: ArrowUpRight, count: outgoing.length },
    { id: 'search', label: 'Поиск', icon: UserPlus, count: 0 },
  ], [friends.length, incoming.length, outgoing.length]);

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': isDarkMode ? '#a3e635' : '#0052f5',
    '--c-bg': isDarkMode ? '#1b1b1d' : '#E8E8E9',
    '--glass-reflex-dark': isDarkMode ? 2 : 1,
    '--glass-reflex-light': isDarkMode ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;

  if (loading && !data) {
    return (
      <div className={`min-h-[calc(100vh-64px)] flex items-center justify-center transition-colors ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
        <div className="flex flex-col items-center gap-4 opacity-50">
           <Loader className="animate-spin text-lime-500" size={40} />
           <p className="text-sm font-medium">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* === ДОБАВЛЕНО: Скрытие скроллбара для контейнера === */
        .friends-liquid-switcher::-webkit-scrollbar { display: none; }
        .friends-liquid-switcher { -ms-overflow-style: none; scrollbar-width: none; }
        
        .friends-liquid-switcher {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          height: 60px;
          box-sizing: border-box;
          padding: 6px;
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#friends-switcher-filter) saturate(var(--saturation));
          -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent), 
            inset -2px -2px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 80%), transparent), 
            inset -3px -8px 1px -6px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 60%), transparent), 
            inset -0.3px -1px 4px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 12%), transparent), 
            inset -1.5px 2.5px 0px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
            inset 0px 3px 4px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
            inset 2px -6.5px 1px -4px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 10%), transparent), 
            0px 1px 5px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 10%), transparent), 
            0px 6px 16px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 8%), transparent);
          transition: background-color 400ms cubic-bezier(1, 0.0, 0.4, 1), box-shadow 400ms cubic-bezier(1, 0.0, 0.4, 1);
        }

        .friends-liquid-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 0 20px;
          border-radius: 99em;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: color 160ms;
        }

        .friends-liquid-option:hover { color: var(--c-action); }
        .friends-liquid-option[data-active="true"] { color: var(--c-content); cursor: default; }

        .friends-liquid-icon {
          margin-right: 8px;
          transition: scale 200ms cubic-bezier(0.5, 0, 0, 1);
        }

        .friends-liquid-option:hover .friends-liquid-icon { scale: 1.2; }
        .friends-liquid-option[data-active="true"] .friends-liquid-icon { scale: 1; }

        .friends-liquid-blob {
          border-radius: 99em;
          background-color: color-mix(in srgb, var(--c-glass) 36%, transparent);
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 2px 1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent), 
            inset -1.5px -1px 0px -1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 80%), transparent), 
            inset -2px -6px 1px -5px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 60%), transparent), 
            inset -1px 2px 3px -1px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 20%), transparent), 
            inset 0px -4px 1px -2px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 10%), transparent), 
            0px 3px 6px 0px color-mix(in srgb, var(--c-dark) calc(var(--glass-reflex-dark) * 8%), transparent);
        }
      `}} />

      <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
        <svg>
          <filter id="friends-switcher-filter" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64} />
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap 
              id="disp" 
              in="blur" 
              in2="map" 
              scale="0.5" 
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </svg>
      </div>

       <div className={`min-h-full p-6 md:p-8 font-sans transition-colors relative z-10 ${isDarkMode ? 'bg-black text-zinc-100' : 'bg-white text-zinc-900'}`}>
        
        <div className="max-w-5xl mx-auto mb-8">
            <h1 className="text-3xl font-bold mb-2">Друзья</h1>
            <p className="text-zinc-500">Управляйте своим кругом общения</p>
        </div>

        <div className="max-w-5xl mx-auto mb-8">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
                
                {/* overflow-x-auto добавлен здесь, но сам скроллбар скрыт через CSS выше */}
                <div className="friends-liquid-switcher overflow-x-auto w-full xl:w-auto" style={liquidGlassStyles}>
                    {tabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button 
                          key={tab.id}
                          onClick={() => {
                              setActiveTab(tab.id as any);
                              if (tab.id !== 'search') {
                                  setShowFilters(false);
                                  setSearchQuery('');
                              }
                          }}
                          className="friends-liquid-option relative"
                          data-active={isActive}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="friends-active-blob"
                              className="friends-liquid-blob absolute inset-0 z-0"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          
                          <div className="relative z-10 flex items-center justify-center">
                            <tab.icon size={18} className="friends-liquid-icon" />
                            <span className="whitespace-nowrap">{tab.label}</span>
                            {((tab.id === 'requests' || tab.id === 'outgoing') && tab.count > 0) && (
                                <span className="inline-flex items-center justify-center min-w-[20px] h-6 px-2 text-sm bg-lime-400 text-black rounded-full font-bold shadow ml-1.5">
                                    {tab.count}
                                </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>

                <div className="flex items-center gap-2 w-full xl:w-auto mt-4 xl:mt-0">
                    <div className="relative w-full xl:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Поиск по имени или нику..." 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (activeTab !== 'search') setActiveTab('search');
                            }}
                            className={`w-full pl-10 pr-4 py-3 rounded-2xl outline-none text-sm font-medium transition-colors
                                ${isDarkMode 
                                    ? 'bg-zinc-900 focus:bg-zinc-800 text-white placeholder:text-zinc-600' 
                                    : 'bg-zinc-100 focus:bg-white border border-transparent focus:border-zinc-200 text-zinc-900'}`}
                        />
                    </div>
                    
                    <button 
                        onClick={() => {
                            setShowFilters(!showFilters);
                            if (activeTab !== 'search') setActiveTab('search');
                        }}
                        className={`p-3 rounded-2xl transition-all border cursor-pointer
                            ${showFilters 
                                ? 'bg-lime-400 border-lime-500 text-black shadow-lg shadow-lime-500/20' 
                                : (isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-black')
                            }`}
                    >
                        <SlidersHorizontal size={20} />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        onAnimationStart={() => setFilterOverflow('overflow-hidden')}
                        onAnimationComplete={() => setFilterOverflow('overflow-visible')}
                        className={`${filterOverflow}`}
                    >
                        <div className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-4 
                            ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                            
                            <div className="flex-1">
                                <label className={`block text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    <MapPin size={12} className="inline mr-1" /> Город
                                </label>
                                <input 
                                    type="text"
                                    placeholder="Введите город"
                                    value={filterCity}
                                    onChange={(e) => setFilterCity(e.target.value)}
                                    className={`w-full p-3 rounded-xl text-sm outline-none transition-colors border
                                        ${isDarkMode ? 'bg-zinc-900 border-zinc-700 focus:border-lime-500' : 'bg-white border-zinc-200 focus:border-lime-500'}`}
                                />
                            </div>

                            <div className="flex-1 relative z-20">
                                <label className={`block text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    <GenderIcon size={12} className="inline mr-1" /> Пол
                                </label>
                                <CustomSelect 
                                    options={genderOptions}
                                    value={filterGender}
                                    onChange={setFilterGender}
                                    isDarkMode={isDarkMode}
                                />
                            </div>

                            <div className="flex-1 relative z-10">
                                <label className={`block text-xs font-bold uppercase mb-2 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    <Calendar size={12} className="inline mr-1" /> На сайте
                                </label>
                                <CustomSelect 
                                    options={regDateOptions}
                                    value={filterRegDate}
                                    onChange={setFilterRegDate}
                                    isDarkMode={isDarkMode}
                                />
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <div className="max-w-5xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            <ConfirmationModal
              isOpen={confirmation.isOpen}
              onClose={() => setConfirmation(prev => ({ ...prev, isOpen: false }))}
              onConfirm={confirmation.onConfirm}
              title={confirmation.title}
              message={confirmation.message}
            />

            {activeTab === 'search' && searchLoading && (
                 <div className="flex justify-center py-20 opacity-50"><Loader className="animate-spin text-lime-500" size={40} /></div>
            )}

            {activeTab === 'friends' && (
                friends.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friends.map((f: any) => (
                            <FriendCard 
                                key={f.id} 
                                user={f.friend} 
                                type="friend" 
                                isDarkMode={isDarkMode} 
                                onAction={handleAction} 
                                isTop={f.score > 0} 
                                isHighlighted={f.friend.id === Number(highlightId)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-50"><Users size={48} className="mx-auto mb-4" /><p>У вас пока нет друзей. Найдите их в поиске!</p></div>
                )
            )}

            {activeTab === 'requests' && (
                incoming.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {incoming.map((req: any) => (
                            <FriendCard 
                                key={req.id} 
                                user={{ ...req.sender, requestId: req.id }} 
                                type="request" 
                                isDarkMode={isDarkMode} 
                                onAction={handleAction}
                                isHighlighted={req.sender.id === Number(highlightId)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-50"><Inbox size={48} className="mx-auto mb-4" /><p>Входящих заявок нет</p></div>
                )
            )}

            {activeTab === 'outgoing' && (
                outgoing.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {outgoing.map((req: any) => (
                            <FriendCard key={req.id} user={{ ...req.receiver, requestId: req.id }} type="outgoing" isDarkMode={isDarkMode} onAction={handleAction} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 opacity-50"><ArrowUpRight size={48} className="mx-auto mb-4" /><p>Вы никому не отправляли заявок</p></div>
                )
            )}

            {activeTab === 'search' && !searchLoading && (
                <div>
                    {shouldSkipSearch ? (
                        <div className="text-center py-20 opacity-50">
                            <Search size={48} className="mx-auto mb-4" />
                            <p>Введите имя или настройте фильтры для поиска пользователей</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResults.map((u: any) => {
                                const cardType = friendIds.has(u.id)
                                  ? 'friend'
                                  : (outgoingIds.has(u.id) || sentRequests.has(u.id))
                                    ? 'outgoing'
                                    : 'search';

                                return (
                                    <FriendCard 
                                        key={u.id} 
                                        user={{ ...u, requestId: outgoing.find((r: any) => r.receiver.id === u.id)?.id }} 
                                        type={cardType} 
                                        isDarkMode={isDarkMode} 
                                        onAction={handleAction} 
                                    />
                                );
                            })}
                            {searchResults.length === 0 && (
                                <div className="text-center col-span-full opacity-50 py-20">
                                    <p className="text-lg font-bold mb-2">Никого не найдено</p>
                                    <p className="text-sm">Попробуйте изменить параметры фильтрации или запрос</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </>
  );
}