'use client';

import { useTheme } from '@/context/ThemeContext';
import { ImageIcon } from 'lucide-react';
import { getAvatarUrl } from '@/lib/avatar-url';

interface ProfileBannerProps {
  user: any;
  isMyProfile?: boolean;
  onEditBannerClick?: () => void;
  isUploadingBanner?: boolean;
}

export default function ProfileBanner({ user, isMyProfile, onEditBannerClick, isUploadingBanner }: ProfileBannerProps) {
  const { isDarkMode } = useTheme();
  const bannerUrl = getAvatarUrl(user?.banner);

  return (
    <div className="h-48 md:h-64 w-full relative px-4 pt-4 md:px-0 md:pt-0">
      {bannerUrl ? (
        <div className="relative w-full h-full group rounded-xl md:rounded-none overflow-hidden">
          <img src={bannerUrl} className="w-full h-full object-cover shadow-sm" alt="Banner" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          {isMyProfile && (
             <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
               <button 
                 onClick={onEditBannerClick} 
                 className="cursor-pointer flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-bold transition-all text-white bg-black/40 backdrop-blur-md hover:scale-105 active:scale-95 border border-white/20"
               >
                 <ImageIcon size={18} className="opacity-80" /> 
                 <span className="tracking-wide">Изменить</span>
               </button>
             </div>
          )}
        </div>
      ) : (
        isMyProfile ? (
          <button
            onClick={onEditBannerClick}
            disabled={isUploadingBanner}
            className={`cursor-pointer disabled:cursor-not-allowed w-full h-full flex items-center justify-center border-2 border-dashed rounded-xl md:rounded-none transition-colors
                ${isDarkMode ? 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'}`}
          >
             <div className="text-center text-zinc-500 flex flex-col items-center gap-2">
                  <ImageIcon size={32} />
                  <span className="font-semibold text-sm">Загрузить обложку</span>
              </div>
          </button>
        ) : (
          <div className={`w-full h-full rounded-xl md:rounded-none ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
        )
      )}
    </div>
  );
}