// frontend/components/EditImagesModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader, Trash2, Image as ImageIcon } from 'lucide-react';
import { gql, useMutation } from '@apollo/client';
import Toast from './Toast';
import LiquidGlassModal from './LiquidGlassModal';
import { getAvatarUrl } from '@/lib/avatar-url'; // 1. ---> ИМПОРТИРУЕМ ХЕЛПЕР

const UPDATE_BANNER = gql`
  mutation UpdateBanner($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      banner
    }
  }
`;

interface EditImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isDarkMode: boolean;
  onSuccess: () => void;
}

export default function EditImagesModal({ isOpen, onClose, user, isDarkMode, onSuccess }: EditImagesModalProps) {
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isChanged, setIsChanged] = useState(false);
  const mouseDownTarget = useRef<EventTarget | null>(null);

  const [updateBanner, { loading }] = useMutation(UPDATE_BANNER);

  useEffect(() => {
    if (isOpen) {
      setBannerPreview(user?.banner || null);
      setIsChanged(false);
    }
  }, [isOpen, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
        setIsChanged(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteBanner = () => {
      setBannerPreview(null);
      setIsChanged(true);
  };

  const handleSubmit = async () => {
    if (!isChanged) return;
    try {
      await updateBanner({
        variables: {
          input: {
            banner: bannerPreview,
          },
        },
      });
      setToast({ message: 'Обложка обновлена!', type: 'success' });
      onSuccess();
      setTimeout(onClose, 1500);
    } catch (e: any) {
      const errorMessage = e.graphQLErrors?.[0]?.message || 'Ошибка обновления.';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    mouseDownTarget.current = e.target;
  };

  const handleModalContentMouseDown = (e: React.MouseEvent) => {
    mouseDownTarget.current = e.target;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
      onClose();
    }
    mouseDownTarget.current = null;
  };

  // 2. ---> СОЗДАЕМ ПЕРЕМЕННУЮ С ПОЛНЫМ URL
  const fullBannerUrl = getAvatarUrl(bannerPreview);

  return (
    <>
      {toast && <Toast key="edit-banner-toast" message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
        <div className="p-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10">
          <h2 className="font-bold text-xl tracking-tight">Изменить обложку</h2>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 bg-black/10">
          <div className="relative h-48 rounded-2xl overflow-hidden group border border-white/20 bg-black/30 flex items-center justify-center shadow-inner">
            {/* 3. ---> ИСПОЛЬЗУЕМ ПЕРЕМЕННУЮ fullBannerUrl */}
            {fullBannerUrl ? (
              <img src={fullBannerUrl} className="w-full h-full object-cover opacity-90" alt="Banner" />
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-50">
                  <ImageIcon size={40} />
                  <span className="text-sm font-medium">Нет обложки</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4">
                <label className="cursor-pointer p-4 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full text-white transition-transform hover:scale-110 shadow-lg">
                    <Camera size={28} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
                {bannerPreview && (
                    <button onClick={handleDeleteBanner} className="p-4 bg-red-500/80 hover:bg-red-500 border border-red-400/50 rounded-full text-white transition-transform hover:scale-110 shadow-lg">
                        <Trash2 size={28} />
                    </button>
                )}
            </div>
          </div>
          <p className="text-center text-xs opacity-60 mt-4 font-medium">Рекомендуемый размер: 1500x500px. Форматы: JPG, PNG.</p>
        </div>

        <div className="p-6 border-t border-white/20 dark:border-white/10 flex gap-4 bg-white/5 dark:bg-black/10">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all">Отмена</button>
            <button onClick={handleSubmit} disabled={loading || !isChanged} className="flex-1 py-3.5 bg-lime-400 hover:bg-lime-500 text-black rounded-xl font-bold transition-all border border-lime-300 shadow-[0_0_20px_rgba(163,230,53,0.3)] disabled:opacity-50 flex justify-center items-center">
              {loading ? <Loader className="animate-spin" size={20} /> : 'Сохранить'}
            </button>
        </div>
      </LiquidGlassModal>
    </>
  );
}