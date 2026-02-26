'use client';

import { use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import Avatar from '@/components/Avatar';
import { Loader, Users } from 'lucide-react';
import Cookies from 'js-cookie';

// Запрос информации о приглашении (теперь публичный)
const GET_INVITE_INFO = gql`
  query GetInvite($code: String!) {
    getConversationByInvite(code: $code) {
      id
      title
      avatar
      description
      participantsCount
      type
    }
  }
`;

const GET_MY_CHATS = gql`
  query GetMyChatsForInvite {
    conversations { id }
    archivedConversations { id }
  }
`;

const JOIN_VIA_INVITE = gql`
  mutation JoinInvite($code: String!) {
    joinViaInvite(code: $code)
  }
`;

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const { code } = use(params);

  const cleanCode = decodeURIComponent(code).trim();
  const isAuthenticated = !!Cookies.get('token'); // Проверяем наличие токена

  // 1. Получаем инфо о ссылке (даже без токена)
  const { data, loading, error } = useQuery(GET_INVITE_INFO, {
    variables: { code: cleanCode },
    skip: !cleanCode
  });

  // 2. Если авторизован, проверяем, не участник ли уже
  const { data: myChatsData } = useQuery(GET_MY_CHATS, { 
    skip: !isAuthenticated,
    fetchPolicy: 'cache-first'
  });

  const info = data?.getConversationByInvite;

  const isAlreadyMember = useMemo(() => {
    if (!info || !myChatsData) return false;
    const allChats = [...(myChatsData.conversations || []), ...(myChatsData.archivedConversations || [])];
    return allChats.some((c: any) => c.id === info.id);
  }, [info, myChatsData]);

  const [join, { loading: joining }] = useMutation(JOIN_VIA_INVITE, {
      onCompleted: () => {
          if (info?.id) {
              router.push(`/dashboard/messages?conversationId=${info.id}`);
          } else {
              router.push('/dashboard');
          }
      }
  });

  const handleAction = () => {
      // Если не авторизован -> редирект на логин, потом возврат сюда
      if (!isAuthenticated) {
          // Сохраняем текущий URL как redirect
          // (Убедитесь, что ваша AuthPage обрабатывает redirect query param, 
          // или просто направьте пользователя на главную с параметром)
          router.push(`/?redirect=/invite/${cleanCode}`);
          return;
      }

      // Если уже участник -> открываем чат
      if (isAlreadyMember) {
          router.push(`/dashboard/messages?conversationId=${info.id}`);
          return;
      }

      // Иначе -> пробуем вступить
      join({ variables: { code: cleanCode } });
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isDarkMode ? 'bg-black' : 'bg-zinc-100'}`}>
       <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #84cc16 0%, transparent 50%)' }} />

       <div className={`w-full max-w-sm rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center relative z-10 
           ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}
       >
           {loading ? (
               <Loader className="animate-spin text-lime-500" size={32} />
           ) : error || !info ? (
               <div className="space-y-4">
                   <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto font-bold text-3xl">!</div>
                   <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Ссылка недействительна</h1>
                   <p className="text-zinc-500 text-sm">Приглашение истекло, исчерпан лимит или оно не существует.</p>
                   <button onClick={() => router.push('/dashboard')} className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full text-sm font-bold transition-colors cursor-pointer">На главную</button>
               </div>
           ) : (
               <>
                   <div className="mb-6 relative">
                       <Avatar username={info.title} name={info.title} url={info.avatar} size="2xl" className="w-24 h-24 text-4xl shadow-md" />
                       {info.type === 'CHANNEL' && (
                           <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white dark:border-zinc-900">
                               КАНАЛ
                           </div>
                       )}
                   </div>

                   <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>{info.title}</h1>
                   
                   <div className="flex items-center gap-1 text-sm text-zinc-500 mb-6">
                       <Users size={14} />
                       <span>{info.participantsCount} участников</span>
                   </div>

                   {info.description && (
                       <p className={`text-sm mb-8 line-clamp-3 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{info.description}</p>
                   )}

                   <button 
                       onClick={handleAction}
                       disabled={joining}
                       className="w-full py-3.5 bg-lime-400 text-black rounded-xl font-bold text-lg hover:bg-lime-500 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-lime-500/20"
                   >
                       {joining ? <Loader className="animate-spin" /> : 
                        (!isAuthenticated ? 'Войти и вступить' : 
                         isAlreadyMember ? 'Открыть канал' : 'Вступить')}
                   </button>
               </>
           )}
       </div>
    </div>
  );
}