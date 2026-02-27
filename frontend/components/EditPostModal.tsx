// frontend/components/EditPostModal.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader, Clock, UploadCloud, Plus, Trash2, ListTodo, Smile } from 'lucide-react';
import { gql, useMutation } from '@apollo/client';
import Toast from './Toast';
import { useTheme } from '@/context/ThemeContext';
import Tooltip from './Tooltip';
import ToggleSwitch from './ToggleSwitch';
import RichEmojiInput from './RichEmojiInput';
import { useEmojiPicker } from '@/context/EmojiContext';
import LiquidGlassModal from './LiquidGlassModal';

const UPDATE_POST = gql`
  mutation UpdatePost($postId: Int!, $updatePostInput: UpdatePostInput!) {
    updatePost(postId: $postId, updatePostInput: $updatePostInput) {
      id
      content
      images 
      commentsDisabled
      poll {
        id
        endDate
      }
    }
  }
`;

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post: any; 
}

export default function EditPostModal({ isOpen, onClose, onSuccess, post }: EditPostModalProps) {
  const { isDarkMode } = useTheme();
  const { togglePicker, closePicker, isOpen: isPickerOpen } = useEmojiPicker();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const contentInputRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mouseDownTarget = useRef<EventTarget | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null); 

  const [updatePost, { loading }] = useMutation(UPDATE_POST);

  useEffect(() => {
    return () => closePicker();
  }, [closePicker]);

 useEffect(() => {
    if (isOpen) {
      setToast(null);
      if (post) {
        setContent(post.content || '');
        setImages(post.images || []);
        setCommentsDisabled(post.commentsDisabled || false);
      }
    } else {
      setTimeout(() => {
        setContent('');
        setImages([]);
      }, 300);
    }
  }, [isOpen, post]);

  const isPollActive = post?.poll && new Date(post.poll.endDate) > new Date();

   const hasChanges = 
    content !== (post?.content || '') ||
    commentsDisabled !== (post?.commentsDisabled || false) ||
    JSON.stringify(images) !== JSON.stringify(post?.images || []);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      setToast({ message: 'Напишите что-нибудь или добавьте фото', type: 'error' });
      return;
    }
    try {
      await updatePost({
        variables: {
          postId: post.id,
          updatePostInput: { 
            content, 
            commentsDisabled,
            images,
          },
        },
      });
      setToast({ message: 'Пост обновлен!', type: 'success' });
      onSuccess();
      onClose();
    } catch (e: any) {
      setToast({ message: e.graphQLErrors?.[0]?.message || 'Ошибка обновления', type: 'error' });
    }
  };

  const handleEndPoll = async () => {
    try {
      await updatePost({
        variables: {
          postId: post.id,
          updatePostInput: { endPoll: true },
        },
      });
      setToast({ message: 'Голосование завершено!', type: 'success' });
      onSuccess();
      onClose();
    } catch (e: any) {
      setToast({ message: e.graphQLErrors?.[0]?.message || 'Ошибка при завершении опроса', type: 'error' });
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const editor = contentInputRef.current;
    if (editor) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
          setContent(prev => prev + emoji);
      } else {
          const range = selection.getRangeAt(0);
          const frag = document.createDocumentFragment();
          const textNode = document.createTextNode(emoji);
          frag.appendChild(textNode);
          range.deleteContents();
          range.insertNode(frag);

          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          
          const event = new Event('input', { bubbles: true });
          editor.dispatchEvent(event);
      }
      editor.focus();
    } else {
        setContent(prev => prev + emoji);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
        <div className="p-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
          <h2 className="font-bold text-xl tracking-tight text-white">Редактировать публикацию</h2>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"><X size={20} className="text-white"/></button>
        </div>

        <div className="flex flex-col md:flex-row">
          
          <div className="flex flex-col md:w-2/3 p-6 gap-6 border-b md:border-b-0 md:border-r border-white/20 dark:border-white/10 bg-black/5">
              <div className="flex gap-4 relative">
                  <div className="flex-1 bg-black/20 border border-white/10 rounded-2xl overflow-hidden transition-colors">
                      <RichEmojiInput
                          ref={contentInputRef}
                          value={content}
                          onChange={setContent}
                          placeholder="Что у вас нового?"
                          isDarkMode={true}
                          className="w-full text-lg min-h-[120px] text-white"
                          onKeyDown={handleKeyDown}
                      />
                  </div>

                  <button 
                      ref={emojiButtonRef}
                      onClick={() => togglePicker(emojiButtonRef, handleEmojiClick)}
                      className={`absolute right-3 top-3 h-10 w-10 flex items-center justify-center rounded-xl transition-all cursor-pointer backdrop-blur-md ${isPickerOpen ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'bg-white/10 hover:bg-white/20 border border-transparent'}`}
                  >
                      <Smile size={22} className="text-white" />
                  </button>
              </div>

              <div className="flex-1 flex flex-col min-h-[150px]">
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files)} />
                  {images.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto glass-scrollbar p-1">
                          {images.map((img, index) => (
                              <div key={index} className="relative aspect-square group rounded-xl overflow-hidden border border-white/20 shadow-md">
                                  <img src={img} className="w-full h-full object-cover" alt="preview" />
                                  <button onClick={() => removeImage(index)} className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-red-500 hover:scale-110">
                                      <X size={16} />
                                  </button>
                              </div>
                          ))}
                          <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl flex items-center justify-center border-2 border-dashed border-white/30 hover:border-lime-400 cursor-pointer hover:bg-lime-400/10 transition-colors text-white/50 hover:text-lime-400">
                              <Plus size={36} />
                          </button>
                      </div>
                  ) : (
                      <div 
                          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${isDragging ? 'border-lime-400 bg-lime-400/10 scale-[1.02]' : 'border-white/20 hover:border-white/40 bg-black/20 shadow-inner'}`}
                      >
                          <div className="p-4 bg-white/5 rounded-full mb-3 shadow-lg"><UploadCloud size={36} className={isDragging ? 'text-lime-400' : 'text-white/70'} /></div>
                          <p className={`font-bold text-lg mb-1 ${isDragging ? 'text-lime-400' : 'text-white'}`}>Перетащите фото сюда</p>
                          <p className="text-sm opacity-50 font-medium text-white">или нажмите для выбора с устройства</p>
                      </div>
                  )}
              </div>
          </div>

          <div className="md:w-1/3 p-6 space-y-6 overflow-y-auto glass-scrollbar bg-black/10" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              <h3 className="font-bold text-sm uppercase opacity-60 tracking-wider text-white">Настройки публикации</h3>
              
              <div className="p-2 bg-black/20 border border-white/10 rounded-2xl">
                <ToggleSwitch
                  label="Комментарии"
                  enabled={!commentsDisabled}
                  setEnabled={(value) => setCommentsDisabled(!value)}
                  isDarkMode={true}
                />
              </div>

              {post?.poll && (
                  <div className="bg-black/20 border border-white/10 p-4 rounded-2xl space-y-3">
                      <p className="text-sm font-bold opacity-80 flex items-center gap-2 text-white">
                        <ListTodo size={16} /> Опрос
                      </p>
                      <button
                          onClick={handleEndPoll}
                          disabled={loading || !isPollActive}
                          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border cursor-pointer
                              ${!isPollActive 
                                ? 'bg-white/5 border-white/5 text-white/40 cursor-not-allowed' 
                                : 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                              }
                          `}
                      >
                          <Clock size={18} />
                          {isPollActive ? 'Завершить досрочно' : 'Голосование завершено'}
                      </button>
                  </div>
              )}
          </div>
        </div>

        <div className="p-6 border-t border-white/20 dark:border-white/10 flex justify-end gap-4 bg-white/5 dark:bg-black/10 shrink-0">
           <button onClick={onClose} className="px-6 py-3.5 rounded-2xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-white cursor-pointer">Отмена</button>
          <button 
               onClick={handleSubmit} 
               disabled={loading || (!content.trim() && images.length === 0) || !hasChanges}
               className="px-8 py-3.5 bg-lime-400 hover:bg-lime-500 text-black rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(163,230,53,0.4)] cursor-pointer disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 min-w-[160px]"
           >
               {loading ? <Loader className="animate-spin" size={20} /> : 'Сохранить'}
           </button>
        </div>
      </LiquidGlassModal>
    </>
  );
}