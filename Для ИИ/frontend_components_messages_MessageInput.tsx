'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Send, X, Reply, Paperclip, Loader2 } from 'lucide-react'; // Image as ImageIcon удален, если не используется
import RichEmojiInput from '@/components/RichEmojiInput';
import { useEmojiPicker } from '@/context/EmojiContext';
import { Message } from '@/types/messages';
import Cookies from 'js-cookie';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (images?: string[]) => void;
  onTyping: () => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  isDarkMode: boolean;
  myId: number;
}

export default function MessageInput({ value, onChange, onSend, onTyping, replyTo, onCancelReply, isDarkMode, myId }: MessageInputProps) {
  const { togglePicker, isOpen: isPickerOpen } = useEmojiPicker();
  const inputRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const handleSend = () => {
    if ((value.trim() || selectedImages.length > 0) && !isUploading) {
        onSend(selectedImages);
        setSelectedImages([]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];
    const token = Cookies.get('token');
    
    // Используем переменную окружения или дефолт
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3400';

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_URL}/upload/message`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                }
            });
            if (res.ok) {
                const data = await res.json();
                newImages.push(data.url);
            }
        } catch (error) {
            console.error('Upload failed', error);
        }
    }

    setSelectedImages(prev => [...prev, ...newImages]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmojiInsert = (emoji: string) => {
    const newValue = valueRef.current + emoji;
    onChange(newValue);
    
    requestAnimationFrame(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(inputRef.current);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            inputRef.current.scrollTop = inputRef.current.scrollHeight;
        }
    });
  };

  const isReplyingToSelf = myId === replyTo?.senderId;

  const handleChange = (newValue: string) => {
    onChange(newValue);
    if (newValue.trim().length > 0) {
        onTyping();
    }
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3400';

  return (
    <div className={`w-full max-w-full p-4 border-t ${isDarkMode ? 'border-zinc-800 bg-black' : 'border-zinc-200 bg-white'}`}>
       <AnimatePresence>
        {selectedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide"
          >
            {selectedImages.map((img, idx) => (
              <div key={idx} className="relative group shrink-0">
                <img
                  src={img.startsWith('http') ? img : `${API_URL}${img}`}
                  alt="upload preview"
                  className="w-20 h-20 object-cover rounded-xl border border-zinc-200 dark:border-zinc-800"
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {isUploading && (
              <div className="w-20 h-20 flex items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                <Loader2 size={24} className="animate-spin text-lime-500" />
              </div>
            )}
          </motion.div>
        )}
        {replyTo && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }} 
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden w-full"
          >
            <div className={`
                flex items-center w-full rounded-xl overflow-hidden border-l-4 border shadow-sm select-none
                ${isDarkMode 
                    ? 'bg-zinc-900 border-zinc-800 border-l-lime-400' 
                    : 'bg-zinc-50 border-zinc-200 border-l-lime-500'
                }
            `}>
                <div className="flex-1 min-w-0 w-0 py-2 pl-3 pr-2 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Reply size={12} className="text-lime-500 shrink-0" />
                        <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-lime-400' : 'text-lime-600'}`}>
                            {isReplyingToSelf ? 'Ответ себе' : (replyTo.sender.name || replyTo.sender.username)}
                        </span>
                    </div>
                    <p className={`text-xs truncate ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {replyTo.content}
                    </p>
                </div>

                <button 
                    onClick={onCancelReply} 
                    className={`
                        p-2 mr-1 rounded-lg transition-colors shrink-0 cursor-pointer
                        ${isDarkMode ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300' : 'text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600'}
                    `}
                >
                    <X size={16} />
                </button>
            </div>
          </motion.div>
        )}
    </AnimatePresence>

    <div className={`flex items-center gap-2 p-1.5 rounded-2xl border transition-colors 
      ${isDarkMode 
        ? 'bg-zinc-900 border-zinc-800' 
        : 'bg-zinc-50 border-zinc-200'
      }`}
    >
      <div className="flex items-center">
          <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              multiple 
              accept="image/*" 
              className="hidden" 
          />
          <button 
              onClick={() => fileInputRef.current?.click()} 
              // Добавлен cursor-pointer
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors shrink-0 cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-lime-400 hover:bg-zinc-800' : 'text-zinc-500 hover:text-lime-600 hover:bg-zinc-100'}`}
              title="Прикрепить фото"
          >
              <Paperclip size={22} />
          </button>

          <button 
              ref={emojiBtnRef} 
              onClick={() => togglePicker(emojiBtnRef, handleEmojiInsert)} 
              // Добавлен cursor-pointer
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors shrink-0 cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-lime-400 hover:bg-zinc-800' : 'text-zinc-500 hover:text-lime-600 hover:bg-zinc-100'}`}
          >
            <Smile size={24} />
          </button>
      </div>
      
      <div className="flex-1 min-w-0 w-0 py-1.5"> 
          <RichEmojiInput 
            ref={inputRef} 
            value={value} 
            onChange={handleChange} 
            onKeyDown={handleKeyDown} 
            placeholder="Напишите сообщение..." 
            isDarkMode={isDarkMode} 
            className="max-h-32" 
          />
      </div>
      
      <button 
        onClick={handleSend} 
        disabled={(!value.trim() && selectedImages.length === 0) || isUploading} 
        // Добавлен cursor-pointer для активного состояния
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 shrink-0 ${(value.trim() || selectedImages.length > 0) && !isUploading ? 'bg-lime-400 text-black hover:scale-105 cursor-pointer' : 'bg-transparent text-zinc-400 cursor-not-allowed'}`}
      >
        <Send size={20} className={(value.trim() || selectedImages.length > 0) ? "ml-0.5" : ""} />
      </button>
    </div>
  </div>
  );
}