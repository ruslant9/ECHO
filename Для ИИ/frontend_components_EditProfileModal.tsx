'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle, Loader, Camera, Mars, Venus, Trash2 } from 'lucide-react';
import { gql, useMutation, useLazyQuery } from '@apollo/client';
import Toast from './Toast';
import Avatar from './Avatar';
import LiquidGlassModal from './LiquidGlassModal';
import { LIQUID_GLASS_NOISE_B64 } from '@/lib/constants'; 
import Tooltip from './Tooltip';

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      username
      name
      bio
      location
      gender
      website
      avatar
    }
  }
`;

const CHECK_USERNAME = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username)
  }
`;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isDarkMode: boolean;
  onSuccess: () => void;
}

export default function EditProfileModal({ isOpen, onClose, user, isDarkMode, onSuccess }: EditProfileModalProps) {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [gender, setGender] = useState('male');
  const [website, setWebsite] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const mouseDownTarget = useRef<EventTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUsernameValid, setIsUsernameValid] = useState(true);
  const [usernameError, setUsernameError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isChanged, setIsChanged] = useState(false);
  
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE);
  const [checkUsernameQuery, { loading: usernameChecking }] = useLazyQuery(CHECK_USERNAME);

  useEffect(() => {
    if (isOpen && user) {
        setUsername(user.username || '');
        setName(user.name || '');
        setBio(user.bio || '');
        setLocation(user.location || '');
        setGender(user.gender || 'male');
        setWebsite(user.website || '');
        setAvatarPreview(user.avatar || null);
        setIsUsernameValid(true);
        setUsernameError('');
        setIsChanged(false);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!user) return;
    const hasChanges = 
        username.trim() !== (user.username || '') ||
        name !== (user.name || '') ||
        bio !== (user.bio || '') ||
        location !== (user.location || '') ||
        gender !== (user.gender || 'male') ||
        website !== (user.website || '') ||
        avatarPreview !== (user.avatar || null);
    
    setIsChanged(hasChanges);
  }, [username, name, bio, location, gender, website, avatarPreview, user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAvatarPreview(null);
    setIsChanged(true);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (username === user?.username) {
        setIsUsernameValid(true);
        setUsernameError('');
        return;
      }
      if (username.trim().length === 0) {
        setIsUsernameValid(false);
        setUsernameError('Имя пользователя не может быть пустым.');
        return;
      }
      if (username.length < 3) {
        setIsUsernameValid(false);
        setUsernameError('Имя пользователя должно содержать не менее 3 символов.');
        return;
      }
      if (username.length > 25) {
        setIsUsernameValid(false);
        setUsernameError('Имя пользователя не должно превышать 25 символов.');
        return;
      }
      try {
        const { data } = await checkUsernameQuery({ variables: { username } });
        if (data?.checkUsername === false) {
          setIsUsernameValid(false);
          setUsernameError('Это имя пользователя уже занято.');
        } else {
          setIsUsernameValid(true);
          setUsernameError('');
        }
      } catch (error) {
        setIsUsernameValid(false);
        setUsernameError('Не удалось проверить имя пользователя.');
      }
    }, 500); 

    return () => clearTimeout(timer);
  }, [username, user?.username, checkUsernameQuery]);

  const handleSubmit = async () => {
    if (!isUsernameValid || loading || usernameChecking || !isChanged) return;

    try {
      await updateProfile({
        variables: {
          input: {
            username: username.trim(),
            name,
            bio,
            location,
            gender,
            website,
            avatar: avatarPreview,
          },
        },
      });
      setToast({ message: 'Профиль успешно обновлен!', type: 'success' });
      onSuccess();
      setTimeout(onClose, 1500);
    } catch (e: any) {
      setToast({ message: e.graphQLErrors?.[0]?.message || 'Ошибка обновления.', type: 'error' });
    }
  };
  
  if (!isOpen) return null;

  const activeGenderIndex = gender === 'male' ? 0 : 1;

  const liquidGlassStyles = {
    '--c-glass': isDarkMode ? '#bbbbbc' : '#bbbbbc',
    '--c-light': isDarkMode ? '#fff' : '#fff',
    '--c-dark': isDarkMode ? '#000' : '#000',
    '--c-content': isDarkMode ? '#e1e1e1' : '#224',
    '--c-action': gender === 'male' ? '#3b82f6' : '#ec4899', 
    '--c-bg': isDarkMode ? '#1b1b1d' : '#E8E8E9',
    '--glass-reflex-dark': isDarkMode ? 2 : 1,
    '--glass-reflex-light': isDarkMode ? 0.3 : 1,
    '--saturation': '150%',
  } as React.CSSProperties;

  return (
    <>
      {toast && <Toast key="edit-profile-toast" message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <style dangerouslySetInnerHTML={{ __html: `
        .gender-switch {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 56px;
          width: 100%;
          box-sizing: border-box;
          padding: 4px;
          border-radius: 16px;
          background-color: color-mix(in srgb, var(--c-glass) 12%, transparent);
          backdrop-filter: blur(8px) url(#gender-switch-filter) saturate(var(--saturation));
          -webkit-backdrop-filter: blur(8px) saturate(var(--saturation));
          box-shadow: 
            inset 0 0 0 1px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 10%), transparent),
            inset 1.8px 3px 0px -2px color-mix(in srgb, var(--c-light) calc(var(--glass-reflex-light) * 90%), transparent);
        }
        .gender-option {
          color: var(--c-content);
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          height: 100%;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: color 200ms;
        }
        .gender-option:hover { color: var(--c-action); }
        .gender-option[data-active="true"] { color: #fff; cursor: default; }
        .gender-blob {
          position: absolute;
          left: 4px;
          top: 4px;
          height: calc(100% - 8px);
          width: calc(50% - 6px);
          border-radius: 12px;
          background-color: var(--c-action);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--c-action) 40%, transparent), inset 0 1px 1px rgba(255,255,255,0.4);
          z-index: 1;
          transition: transform 400ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 400ms;
        }
        .gender-switch[data-active-index="0"] .gender-blob { transform: translateX(0%); }
        .gender-switch[data-active-index="1"] .gender-blob { transform: translateX(calc(100% + 4px)); }
      `}} />

      <div className="absolute w-0 h-0 overflow-hidden -z-10 pointer-events-none">
        <svg>
          <filter id="gender-switch-filter" primitiveUnits="objectBoundingBox">
            <feImage result="map" width="100%" height="100%" x="0" y="0" href={LIQUID_GLASS_NOISE_B64}/>
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur"/>
            <feDisplacementMap id="disp" in="blur" in2="map" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </svg>
      </div>

      <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
        <div className="p-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
          <h2 className="font-bold text-xl tracking-tight text-white">Редактировать профиль</h2>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"><X size={20} className="text-white" /></button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto glass-scrollbar">
          {/* ЛЕВАЯ ЧАСТЬ */}
          <div className="md:w-5/12 flex flex-col items-center p-6 border-b md:border-b-0 md:border-r border-white/20 dark:border-white/10 bg-black/10">
            
            <div className="relative mb-6 flex flex-col items-center">
              <div className="relative group cursor-pointer">
                  <div className="p-1 rounded-full border border-white/30 shadow-xl">
                    <Avatar username={username || '?'} name={name} url={avatarPreview} size="xl" />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Tooltip content="Загрузить фото" position="bottom">
                      <label className="cursor-pointer p-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full transition-transform hover:scale-110 shadow-lg">
                          <Camera size={20} className="text-white" />
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                      </label>
                    </Tooltip>
                    
                    {avatarPreview && (
                      <Tooltip content="Удалить аватар" position="bottom">
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="cursor-pointer p-2 bg-red-500/80 hover:bg-red-500 border border-red-400/50 rounded-full transition-transform hover:scale-110 shadow-lg"
                        >
                          <Trash2 size={20} className="text-white" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                  </div>
              </div>
            </div>

            <div className="w-full mb-4">
              <label className="block text-xs font-bold uppercase mb-1.5 opacity-60 text-white">Имя</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" className="w-full p-3.5 rounded-xl bg-black/20 border border-white/10 outline-none transition-colors text-white placeholder:text-white/50" />
            </div>

            <div className="w-full">
              <label className="block text-xs font-bold uppercase mb-1.5 opacity-60 text-white">Username</label>
              <div className={`flex rounded-xl overflow-hidden border transition-colors ${!isUsernameValid ? 'border-red-500' : 'border-white/10'}`}>
                <div className="bg-white/10 flex items-center justify-center w-12 shrink-0 border-r border-white/10 font-bold text-white">@</div>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="flex-1 p-3.5 bg-black/20 outline-none min-w-0 text-white placeholder:text-white/50" />
                <div className="bg-black/20 px-3 flex items-center justify-center">
                  {usernameChecking ? <Loader size={18} className="animate-spin opacity-50 text-white" /> : (username.length > 0 && username !== user?.username) && (isUsernameValid ? <Check size={18} className="text-green-400" /> : <AlertCircle size={18} className="text-red-500" />)}
                </div>
              </div>
              {usernameError && <p className="text-xs text-red-400 mt-1.5">{usernameError}</p>}
            </div>
          </div>

          {/* ПРАВАЯ ЧАСТЬ */}
          <div className="md:w-7/12 p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase mb-1.5 opacity-60 text-white">О себе</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={150} className="w-full p-3.5 rounded-xl bg-black/20 border border-white/10 outline-none h-24 resize-none glass-scrollbar text-white placeholder:text-white/50" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 opacity-60 text-white">Сайт</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="w-full p-3.5 rounded-xl bg-black/20 border border-white/10 outline-none text-white placeholder:text-white/50" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 opacity-60 text-white">Город</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-3.5 rounded-xl bg-black/20 border border-white/10 outline-none text-white placeholder:text-white/50" />
              </div>
            </div>

            <div>
               <label className="block text-xs font-bold uppercase mb-1.5 opacity-60 text-white">Пол</label>
               <div className="gender-switch" style={liquidGlassStyles} data-active-index={activeGenderIndex}>
                  <div className="gender-blob" />
                  <div className="gender-option" onClick={() => setGender('male')} data-active={gender === 'male'}>
                    <Mars size={18} /> Мужской
                  </div>
                  <div className="gender-option" onClick={() => setGender('female')} data-active={gender === 'female'}>
                    <Venus size={18} /> Женский
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/20 dark:border-white/10 shrink-0 flex gap-4 bg-white/5 dark:bg-black/10">
           <button onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-white cursor-pointer">Отмена</button>
           <button onClick={handleSubmit} disabled={!isUsernameValid || loading || usernameChecking || !isChanged} className="flex-1 py-3.5 bg-lime-400 hover:bg-lime-500 text-black rounded-xl font-bold transition-all border border-lime-300 shadow-[0_0_20px_rgba(163,230,53,0.3)] disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer">
              {loading ? <Loader className="animate-spin" size={20} /> : 'Сохранить изменения'}
           </button>
        </div>
      </LiquidGlassModal>
    </>
  );
}