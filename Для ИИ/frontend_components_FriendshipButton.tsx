'use client';

import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { UserPlus, UserMinus, Check, X, LogOut, Loader } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import Toast from './Toast';

// --- GraphQL mutations ---
const SEND_REQUEST = gql`
  mutation SendFriendRequest($targetId: Int!) {
    sendFriendRequest(targetId: $targetId)
  }
`;

const ACCEPT_REQUEST = gql`
  mutation AcceptFriendRequest($requestId: Int!) {
    acceptFriendRequest(requestId: $requestId)
  }
`;

const REJECT_REQUEST = gql`
  mutation RejectFriendRequest($requestId: Int!) {
    rejectFriendRequest(requestId: $requestId)
  }
`;

const REMOVE_FRIEND = gql`
  mutation RemoveFriend($friendId: Int!) {
    removeFriend(friendId: $friendId)
  }
`;

const CANCEL_REQUEST = gql`
  mutation CancelFriendRequest($requestId: Int!) {
    cancelFriendRequest(requestId: $requestId)
  }
`;

interface FriendshipButtonProps {
  status: 'FRIEND' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE' | null;
  targetUserId: number;
  sentRequestId?: number;
  receivedRequestId?: number;
  onUpdate: () => void;
  className?: string; // Добавлен пропс для кастомных классов
  iconSize?: number;  // Добавлен пропс для размера иконки
}

export default function FriendshipButton({
  status,
  targetUserId,
  sentRequestId,
  receivedRequestId,
  onUpdate,
  className = '',   // Значение по умолчанию
  iconSize = 16,    // Значение по умолчанию
}: FriendshipButtonProps) {
  const { isDarkMode } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleCompleted = (message: string) => {
    setToast({ message, type: 'success' });
    onUpdate();
    setIsLoading(false);
  };

  const handleError = (error: any) => {
    setToast({ message: error.message, type: 'error' });
    setIsLoading(false);
  };

  const [sendReq] = useMutation(SEND_REQUEST, {
    onCompleted: () => handleCompleted('Заявка отправлена'),
    onError: handleError,
  });

  const [acceptReq] = useMutation(ACCEPT_REQUEST, {
    onCompleted: () => handleCompleted('Заявка принята'),
    onError: handleError,
  });

  const [rejectReq] = useMutation(REJECT_REQUEST, {
    onCompleted: () => handleCompleted('Заявка отклонена'),
    onError: handleError,
  });

  const [removeFriend] = useMutation(REMOVE_FRIEND, {
    onCompleted: () => handleCompleted('Пользователь удален из друзей'),
    onError: handleError,
  });

  const [cancelReq] = useMutation(CANCEL_REQUEST, {
    onCompleted: () => handleCompleted('Заявка отменена'),
    onError: handleError,
  });

  const handleAction = (action: string) => {
    setIsLoading(true);

    switch (action) {
      case 'add':
        sendReq({ variables: { targetId: targetUserId } });
        break;
      case 'accept':
        if (receivedRequestId)
          acceptReq({ variables: { requestId: receivedRequestId } });
        break;
      case 'reject':
        if (receivedRequestId)
          rejectReq({ variables: { requestId: receivedRequestId } });
        break;
      case 'remove':
        removeFriend({ variables: { friendId: targetUserId } });
        break;
      case 'cancel':
        if (sentRequestId)
          cancelReq({ variables: { requestId: sentRequestId } });
        break;
    }
  };

  // Комбинируем базовые классы с переданными через props
   const buttonBaseClass =
    `w-full py-2.5 px-4 rounded-full font-bold text-sm transition-all border flex items-center justify-center gap-2 cursor-pointer ${className}`;

  if (isLoading) {
    return (
      <>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <button
          disabled
          className={`${buttonBaseClass} ${
            isDarkMode
              ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
              : 'bg-zinc-100 border-zinc-300 text-zinc-400'
          } cursor-not-allowed`}
        >
          <Loader size={iconSize} className="animate-spin" />
        </button>
      </>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {(() => {
        switch (status) {
          case 'FRIEND':
            return (
              <button
                onClick={() => handleAction('remove')}
                className={`${buttonBaseClass} border-red-500/50 text-red-500 hover:bg-red-500/10`}
              >
                <UserMinus size={iconSize} />
                Удалить из друзей
              </button>
            );

          case 'REQUEST_SENT':
            return (
              <button
                onClick={() => handleAction('cancel')}
                className={`${buttonBaseClass} ${
                  isDarkMode
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800'
                    : 'bg-zinc-100 border-zinc-300 text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                <LogOut size={iconSize} />
                Отменить заявку
              </button>
            );

          case 'REQUEST_RECEIVED':
            return (
              <div className="w-full space-y-2"> {/* Изменено: flex на w-full space-y-2 для вертикального стека */}
                <button
                  onClick={() => handleAction('accept')}
                  // Кнопка "Принять" теперь будет занимать всю ширину
                  className={`w-full py-2.5 px-4 bg-lime-400 text-zinc-900 rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-lime-500`}
                >
                  <Check size={iconSize} />
                  Принять
                </button>

                <button
                  onClick={() => handleAction('reject')}
                  // Кнопка "Отклонить" также будет занимать всю ширину
                  className={`w-full py-2.5 px-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition ${
                    isDarkMode
                      ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                      : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                  }`}
                >
                  <X size={iconSize} />
                  Отклонить
                </button>
              </div>
            );

          case 'NONE':
            return (
              <button
                onClick={() => handleAction('add')}
                className={`${buttonBaseClass} bg-lime-400 text-zinc-900 border-lime-400 hover:bg-lime-500`}
              >
                <UserPlus size={iconSize} />
                Добавить в друзья
              </button>
            );

          default:
            return null;
        }
      })()}
    </>
  );
}