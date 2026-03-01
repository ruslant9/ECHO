'use client';

import { useTheme } from '@/context/ThemeContext';
import { Lock } from 'lucide-react';

export default function PrivacySettings() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center py-20
      ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
    >
      <div className={`p-4 rounded-full mb-4 ${isDarkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'}`}>
        <Lock size={48} />
      </div>
      <h3 className="text-xl font-bold mb-2">Раздел в разработке</h3>
      <p className="text-zinc-500 max-w-sm">
        Скоро здесь появятся настройки видимости профиля, черного списка и управления данными.
      </p>
    </div>
  );
}