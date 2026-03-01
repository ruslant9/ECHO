'use client';

import { useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useTheme } from '@/context/ThemeContext';
import ToggleSwitch from '@/components/ToggleSwitch';
import SoundSelector from '@/components/SoundSelector';
import Toast from '@/components/Toast';
import { Loader, Bell, Volume2, Heart, MessageSquare, Repeat, Send, UserPlus } from 'lucide-react';

const GET_SETTINGS = gql`
  query MyNotificationSettings {
    myNotificationSettings {
      notifyOnLikes
      notifyOnComments
      notifyOnReposts
      notifyOnMessages
      notifyOnFriendRequests
      notificationSound
      muteAllUntil
    }
  }
`;

const UPDATE_SETTINGS = gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input)
  }
`;

const SOUND_OPTIONS = [
  { value: 'default', label: 'По умолчанию' },
  { value: 'pop', label: 'Pop' },
  { value: 'ding', label: 'Ding' },
  { value: 'notification', label: 'Smooth' },
];

export default function NotificationsSettings() {
  const { isDarkMode } = useTheme();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [settings, setSettings] = useState({
    notifyOnLikes: true,
    notifyOnComments: true,
    notifyOnReposts: true,
    notifyOnMessages: true,
    notifyOnFriendRequests: true,
    notificationSound: 'default',
    muteAllUntil: null as string | null,
  });

  const { loading, error } = useQuery(GET_SETTINGS, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.myNotificationSettings) {
        setSettings({
          notifyOnLikes: data.myNotificationSettings.notifyOnLikes ?? true,
          notifyOnComments: data.myNotificationSettings.notifyOnComments ?? true,
          notifyOnReposts: data.myNotificationSettings.notifyOnReposts ?? true,
          notifyOnMessages: data.myNotificationSettings.notifyOnMessages ?? true,
          notifyOnFriendRequests: data.myNotificationSettings.notifyOnFriendRequests ?? true,
          notificationSound: data.myNotificationSettings.notificationSound || 'default',
          muteAllUntil: data.myNotificationSettings.muteAllUntil || null,
        });
      }
    }
  });

  const [updateSettings, { loading: saving }] = useMutation(UPDATE_SETTINGS, {
    onCompleted: () => {
      setToast({ message: 'Настройки сохранены', type: 'success' });
    },
    onError: () => {
      setToast({ message: 'Ошибка сохранения', type: 'error' });
    }
  });

  const handleChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings({
      variables: {
        input: settings
      }
    });
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader className="animate-spin text-lime-400" size={32} /></div>;
  if (error) return <div className="p-8 text-center text-red-500">Ошибка загрузки настроек</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Звуки */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Volume2 size={20} className="text-lime-500" />
          Звуки уведомлений
        </h2>
        <div className={`p-2 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
           <SoundSelector 
             options={SOUND_OPTIONS}
             value={settings.notificationSound}
             onChange={(val) => handleChange('notificationSound', val)}
             isDarkMode={isDarkMode}
           />
        </div>
      </section>

      {/* Типы уведомлений */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Bell size={20} className="text-lime-500" />
          Типы уведомлений
        </h2>
        <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
           <ToggleSwitch 
             label="Лайки" 
             enabled={settings.notifyOnLikes} 
             setEnabled={(val) => handleChange('notifyOnLikes', val)} 
             isDarkMode={isDarkMode} 
             icon={Heart}
           />
           <ToggleSwitch 
             label="Комментарии" 
             enabled={settings.notifyOnComments} 
             setEnabled={(val) => handleChange('notifyOnComments', val)} 
             isDarkMode={isDarkMode} 
             icon={MessageSquare}
           />
           <ToggleSwitch 
             label="Репосты" 
             enabled={settings.notifyOnReposts} 
             setEnabled={(val) => handleChange('notifyOnReposts', val)} 
             isDarkMode={isDarkMode} 
             icon={Repeat}
           />
           <ToggleSwitch 
             label="Сообщения" 
             enabled={settings.notifyOnMessages} 
             setEnabled={(val) => handleChange('notifyOnMessages', val)} 
             isDarkMode={isDarkMode} 
             icon={Send}
           />
           <ToggleSwitch 
             label="Заявки в друзья" 
             enabled={settings.notifyOnFriendRequests} 
             setEnabled={(val) => handleChange('notifyOnFriendRequests', val)} 
             isDarkMode={isDarkMode} 
             icon={UserPlus}
           />
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="cursor-pointer px-8 py-3 bg-lime-400 text-black rounded-xl font-bold hover:bg-lime-500 transition-all shadow-lg shadow-lime-500/20 disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader size={18} className="animate-spin" /> : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  );
}