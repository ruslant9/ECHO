'use client';

import { useState, useRef, useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';
import { X, Camera, Loader, Image as ImageIcon, Trash2 } from 'lucide-react'; // Добавили Trash2
import LiquidGlassModal from '@/components/LiquidGlassModal';
import { getAvatarUrl } from '@/lib/avatar-url';
import Cookies from 'js-cookie';

const CREATE_ARTIST = gql`mutation CreateArtist($input: CreateArtistInput!) { createArtistAdmin(input: $input) { id name } }`;
const UPDATE_ARTIST = gql`mutation AdminUpdateArtist($input: UpdateArtistInput!) { adminUpdateArtist(input: $input) { id name } }`;

const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400'}/upload/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Cookies.get('token')}` },
        body: formData
    });
    const data = await res.json();
    return data.url;
};

export default function AdminArtistEditor({ isOpen, onClose, artist, onSuccess }: any) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createArtist, { loading: creating }] = useMutation(CREATE_ARTIST);
  const [updateArtist, { loading: updating }] = useMutation(UPDATE_ARTIST);

  useEffect(() => {
    if (isOpen) {
      setName(artist?.name || '');
      setBio(artist?.bio || '');
      setAvatar(artist?.avatar || null);
      setNewFile(null);
    }
  }, [isOpen, artist]);

  const handleSave = async () => {
    try {
      let avatarUrl = avatar;
      if (newFile) avatarUrl = await uploadImage(newFile);

      if (artist) {
        // Передаем null, если удалили
        await updateArtist({ variables: { input: { id: artist.id, name, bio, avatar: avatarUrl } }});
      } else {
        await createArtist({ variables: { input: { name, bio, avatar: avatarUrl } }});
      }
      onSuccess(artist ? 'Артист обновлен' : 'Артист создан');
    } catch (e) {
      console.error(e);
    }
  };

  const loading = creating || updating;
  
  const inputClass = "w-full p-3 rounded-xl border outline-none text-sm transition-colors bg-zinc-100 border-zinc-300 text-zinc-900 focus:border-zinc-500 placeholder:text-zinc-500";

  return (
    <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{artist ? 'Редактировать артиста' : 'Новый артист'}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"><X size={20}/></button>
        </div>
        
        <div className="space-y-5">
            <div className="flex flex-col items-center gap-2">
                
                {/* ИСПРАВЛЕННЫЙ БЛОК АВАТАРКИ */}
                <div className="relative group w-32 h-32 flex justify-center items-center">
                    
                    {/* Контейнер картинки с чистой рамкой */}
                    <div className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-400/30 shadow-md">
                        {newFile ? (
                            <img src={URL.createObjectURL(newFile)} className="w-full h-full object-cover"/>
                        ) : avatar ? (
                            <img src={getAvatarUrl(avatar)!} className="w-full h-full object-cover"/>
                        ) : (
                            <ImageIcon size={32} className="text-zinc-500"/>
                        )}
                    </div>
                    
                    {/* Оверлей с кнопками (вынесен поверх рамки) */}
                    <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity backdrop-blur-[2px]">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors cursor-pointer"
                            title="Изменить"
                        >
                            <Camera size={20} />
                        </button>
                        
                        {(newFile || avatar) && (
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setNewFile(null); 
                                    setAvatar(null); 
                                    if(fileInputRef.current) fileInputRef.current.value=''; 
                                }}
                                className="p-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors cursor-pointer"
                                title="Удалить"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>

                </div>
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setNewFile(e.target.files[0])} />
                <span className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-lime-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    Изменить фото
                </span>
            </div>

            <div>
                <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Имя артиста</label>
                <input className={inputClass} placeholder="Например: Скриптонит" value={name} onChange={e => setName(e.target.value)} />
            </div>
            
            <div>
                <label className="text-xs font-bold uppercase text-zinc-500 mb-1.5 block">Биография</label>
                <textarea className={inputClass} placeholder="Пару слов об артисте..." value={bio} onChange={e => setBio(e.target.value)} rows={3} />
            </div>

            <button onClick={handleSave} disabled={loading || !name} className="w-full mt-2 p-3.5 bg-lime-400 text-black font-bold rounded-xl hover:bg-lime-500 transition-colors cursor-pointer disabled:opacity-50">
                {loading ? <Loader className="animate-spin mx-auto" size={20}/> : 'Сохранить'}
            </button>
        </div>
      </div>
    </LiquidGlassModal>
  );
}