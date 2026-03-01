'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader, ListTodo, Plus, Trash2, Check, UploadCloud, Smile, Clock } from 'lucide-react';
import { gql, useMutation } from '@apollo/client';
import Toast from './Toast';
import Avatar from './Avatar';
import { useTheme } from '@/context/ThemeContext';
import CustomCalendar from './CustomCalendar'; 
import ToggleSwitch from './ToggleSwitch';
import RichEmojiInput from './RichEmojiInput';
import { useEmojiPicker } from '@/context/EmojiContext';
import LiquidGlassModal from './LiquidGlassModal';

const CREATE_POST = gql`
  mutation CreatePost($createPostInput: CreatePostInput!) {
    createPost(createPostInput: $createPostInput) {
      id
    }
  }
`;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: CreatePostModalProps) {
  const { isDarkMode } = useTheme();
  const { togglePicker, closePicker, isOpen: isPickerOpen } = useEmojiPicker();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- Настройки опроса ---
  const [showPollInput, setShowPollInput] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<{ id: number; text: string }[]>([ { id: 1, text: '' }, { id: 2, text: '' } ]);
  const [isPollAnonymous, setIsPollAnonymous] = useState(false);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [allowRevote, setAllowRevote] = useState(true);
  const [nextOptionId, setNextOptionId] = useState(3);
  
  const [pollEndDate, setPollEndDate] = useState<Date>(new Date());
  const [showPollCalendar, setShowPollCalendar] = useState(false);
  const pollDateRef = useRef<HTMLButtonElement>(null); 

  // --- Настройки отложенного постинга ---
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date>(new Date());
  const [showScheduleCalendar, setShowScheduleCalendar] = useState(false);
  const scheduleDateRef = useRef<HTMLButtonElement>(null); 

  const contentInputRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null); 

  const [createPost, { loading }] = useMutation(CREATE_POST);

  useEffect(() => {
    return () => closePicker();
  }, [closePicker]);

  useEffect(() => {
    if (isOpen) {
      setToast(null);
      if (showScheduleInput) {
        const futureTime = new Date();
        futureTime.setHours(futureTime.getHours() + 1);
        setScheduledAt(futureTime);
      }
      if (showPollInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        setPollEndDate(tomorrow);
      }
    } else {
      setTimeout(() => {
        resetState();
      }, 300);
    }
  }, [isOpen, showScheduleInput, showPollInput]);

  const handleFileChange = (files: FileList | null) => { 
    if (!files) return; 
    Array.from(files).forEach((file) => { 
        const reader = new FileReader(); 
        reader.onloadend = () => setImages((prev) => [...prev, reader.result as string]); 
        reader.readAsDataURL(file); 
    }); 
  };
  const removeImage = (index: number) => { setImages((prev) => prev.filter((_, i) => i !== index)); };
  
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFileChange(e.dataTransfer.files); };

  const resetState = () => { 
    setContent(''); setImages([]); setCommentsDisabled(false); setShowPollInput(false); 
    setPollQuestion(''); setPollOptions([{ id: 1, text: '' }, { id: 2, text: '' }]); 
    setIsPollAnonymous(false); setAllowMultipleVotes(false); setAllowRevote(true); 
    setNextOptionId(3); 
    setPollEndDate(new Date());
    setShowPollCalendar(false);
    setShowScheduleInput(false);
    setScheduledAt(new Date());
    setShowScheduleCalendar(false);
  };

  const handleAddOption = () => { if (pollOptions.length < 10) { setPollOptions((prev) => [...prev, { id: nextOptionId, text: '' }]); setNextOptionId((prev) => prev + 1); } };
  const handleRemoveOption = (id: number) => { if (pollOptions.length > 2) setPollOptions((prev) => prev.filter((option) => option.id !== id)); };
  const handleOptionChange = (id: number, text: string) => setPollOptions((prev) => prev.map((option) => (option.id === id ? { ...option, text } : option)));

  const handleSubmit = async () => { 
    if (!content.trim() && images.length === 0 && !showPollInput) { setToast({ message: 'Напишите что-нибудь, добавьте фото или опрос', type: 'error' }); return; } 
    
    const createPostInput: any = {
      content,
      images,
      commentsDisabled,
    };

    if (showScheduleInput) {
      if (scheduledAt <= new Date()) {
        setToast({ message: 'Дата отложенной публикации должна быть в будущем', type: 'error' });
        return;
      }
      createPostInput.scheduledAt = scheduledAt;
    }

    if (showPollInput) { 
      if (!pollQuestion.trim()) { setToast({ message: 'Введите вопрос для опроса', type: 'error' }); return; } 
      const filledOptions = pollOptions.filter((opt) => opt.text.trim() !== ''); 
      if (filledOptions.length < 2) { setToast({ message: 'Опрос должен содержать минимум два варианта ответа', type: 'error' }); return; } 
      
      if (pollEndDate <= new Date()) { setToast({ message: 'Дата окончания опроса должна быть в будущем', type: 'error' }); return; } 
      
      createPostInput.poll = { 
        question: pollQuestion.trim(), 
        options: filledOptions.map((opt) => ({ text: opt.text.trim() })), 
        endDate: pollEndDate, 
        isAnonymous: isPollAnonymous, 
        allowMultipleVotes, 
        allowRevote 
      };
    }
    
    try { 
      await createPost({ variables: { createPostInput } }); 
      setToast({ message: showScheduleInput ? 'Пост запланирован!' : 'Пост опубликован!', type: 'success' }); 
      onSuccess(); 
      onClose(); 
    } catch (e) { 
      console.error("Error creating post:", e); setToast({ message: 'Ошибка публикации', type: 'error' }); 
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
      
      <LiquidGlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-7xl">
        <div className="p-6 border-b border-white/20 dark:border-white/10 flex justify-between items-center bg-white/5 dark:bg-black/10 shrink-0">
          <h2 className="font-bold text-xl tracking-tight text-white">Создать публикацию</h2>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"><X size={20} className="text-white"/></button>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col md:flex-row flex-1 min-h-0">
            <div className="flex flex-col md:w-3/5 p-6 gap-6 border-b md:border-b-0 md:border-r border-white/20 dark:border-white/10 bg-black/5 overflow-y-auto">
              <div className="flex gap-4 relative">
                <div className="shrink-0 pt-1">
                  <Avatar username={user?.username} name={user?.name} url={user?.avatar} size="md" />
                </div>
                
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
                      onDragOver={handleDragOver} 
                      onDragLeave={handleDragLeave} 
                      onDrop={handleDrop} 
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

            <div className="md:w-2/5 p-6 space-y-4 overflow-y-auto glass-scrollbar bg-black/10">
              <h3 className="font-bold text-sm uppercase opacity-60 tracking-wider text-white">Настройки поста</h3>
              
              <div className="p-2 bg-black/20 border border-white/10 rounded-2xl">
                <ToggleSwitch label="Комментарии" enabled={!commentsDisabled} setEnabled={(value) => setCommentsDisabled(!value)} isDarkMode={true} />
              </div>

              <button onClick={() => setShowPollInput(prev => !prev)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${showPollInput ? 'bg-black/40 border-white/20 shadow-inner' : 'bg-black/20 border-white/10 hover:bg-white/10'}`}>
                  <div className={`p-2 rounded-xl ${showPollInput ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]' : 'bg-white/10 text-white'}`}><ListTodo size={20} /></div>
                  <div className="text-left"><p className="font-bold text-sm text-white">Опрос</p><p className="text-xs opacity-60 text-white">{showPollInput ? 'Настроен' : 'Добавить голосование'}</p></div>
              </button>

              <button onClick={() => setShowScheduleInput(prev => !prev)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${showScheduleInput ? 'bg-black/40 border-white/20 shadow-inner' : 'bg-black/20 border-white/10 hover:bg-white/10'}`}>
                  <div className={`p-2 rounded-xl ${showScheduleInput ? 'bg-lime-400 text-black shadow-[0_0_15px_rgba(163,230,53,0.4)]' : 'bg-white/10 text-white'}`}><Clock size={20} /></div>
                  <div className="text-left"><p className="font-bold text-sm text-white">Отложенный пост</p><p className="text-xs opacity-60 text-white">{showScheduleInput ? 'Запланирован' : 'Выбрать время'}</p></div>
              </button>

              <AnimatePresence>
                  {showPollInput && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-2">
                          <div>
                            <label className="block text-xs font-bold uppercase mb-2 opacity-60 text-white">Вопрос</label>
                            <input type="text" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Задайте вопрос..." className="w-full p-4 rounded-xl bg-black/30 border border-white/10 outline-none transition-colors font-medium text-white placeholder:text-white/50"/>
                          </div>
                          <div className="space-y-2">
                              <label className="block text-xs font-bold uppercase mb-2 opacity-60 text-white">Варианты ответа</label>
                              {pollOptions.map((option) => (
                                <div key={option.id} className="flex items-center gap-2">
                                  <input type="text" value={option.text} onChange={(e) => handleOptionChange(option.id, e.target.value)} placeholder={`Вариант ${option.id}`} className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10 outline-none transition-colors font-medium text-white placeholder:text-white/50"/>
                                  {pollOptions.length > 2 && (
                                    <button onClick={() => handleRemoveOption(option.id)} className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-500 transition-colors border border-white/5 hover:border-red-500/30 cursor-pointer">
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {pollOptions.length < 10 && (
                                <button onClick={handleAddOption} className="w-full py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-colors font-bold text-sm text-white cursor-pointer">
                                  <Plus size={18} /> Добавить вариант
                                </button>
                              )}
                          </div>
                          
                          <div className="mb-4 relative">
                              <label className="block text-xs font-bold uppercase mb-2 opacity-60 text-white">Окончание опроса</label>
                              <button
                                  type="button"
                                  ref={pollDateRef}
                                  onClick={() => setShowPollCalendar(!showPollCalendar)}
                                  className="w-full p-4 rounded-xl bg-black/30 border border-white/10 outline-none transition-colors font-medium text-white flex items-center justify-between cursor-pointer hover:bg-black/40"
                              >
                                  <span className="flex items-center gap-2">
                                      <Clock size={16} className="text-zinc-500"/> 
                                      {pollEndDate.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                              </button>

                              {showPollCalendar && (
                                  <CustomCalendar 
                                      value={pollEndDate} 
                                      onChange={(d) => { setPollEndDate(d);}} 
                                      minDate={new Date()} 
                                      timeLabel="Время окончания"
                                      anchorRef={pollDateRef}
                                      onClose={() => setShowPollCalendar(false)}
                                  />
                              )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2 bg-black/20 p-4 rounded-xl border border-white/10">
                              <label className="flex items-center cursor-pointer group select-none">
                                <div className="relative">
                                  <input type="checkbox" checked={isPollAnonymous} onChange={(e) => setIsPollAnonymous(e.target.checked)} className="peer sr-only" />
                                  <div className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center ${isPollAnonymous ? 'bg-lime-400 border-lime-400' : 'bg-black/40 border-white/30'}`}>
                                    {isPollAnonymous && <Check size={14} className="text-zinc-900 stroke-3" />}
                                  </div>
                                </div>
                                <span className="ml-2 text-sm font-medium text-white">Анонимно</span>
                              </label>
                              
                              <label className="flex items-center cursor-pointer group select-none">
                                <div className="relative">
                                  <input type="checkbox" checked={allowMultipleVotes} onChange={(e) => setAllowMultipleVotes(e.target.checked)} className="peer sr-only" />
                                  <div className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center ${allowMultipleVotes ? 'bg-lime-400 border-lime-400' : 'bg-black/40 border-white/30'}`}>
                                    {allowMultipleVotes && <Check size={14} className="text-zinc-900 stroke-3" />}
                                  </div>
                                </div>
                                <span className="ml-2 text-sm font-medium text-white">Мультивыбор</span>
                              </label>

                              <label className="flex items-center cursor-pointer group select-none">
                                <div className="relative">
                                  <input type="checkbox" checked={allowRevote} onChange={(e) => setAllowRevote(e.target.checked)} className="peer sr-only" />
                                  <div className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center ${allowRevote ? 'bg-lime-400 border-lime-400' : 'bg-black/40 border-white/30'}`}>
                                    {allowRevote && <Check size={14} className="text-zinc-900 stroke-3" />}
                                  </div>
                                </div>
                                <span className="ml-2 text-sm font-medium text-white">Переголосование</span>
                              </label>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>

              <AnimatePresence>
                  {showScheduleInput && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-2">
                          <div className="relative">
                              <label className="block text-xs font-bold uppercase mb-2 opacity-60 text-white">Дата и время публикации</label>
                              
                              <button
                                  type="button"
                                  ref={scheduleDateRef}
                                  onClick={() => setShowScheduleCalendar(!showScheduleCalendar)}
                                  className="w-full p-4 rounded-xl bg-black/30 border border-white/10 outline-none transition-colors font-medium text-white flex items-center justify-between cursor-pointer hover:bg-black/40"
                              >
                                  <span className="flex items-center gap-2">
                                      <Clock size={16} className="text-zinc-500"/> 
                                      {scheduledAt.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                              </button>

                              {showScheduleCalendar && (
                                  <CustomCalendar 
                                      value={scheduledAt} 
                                      onChange={(d) => { setScheduledAt(d);}} 
                                      minDate={new Date()} 
                                      timeLabel="Время публикации" 
                                      anchorRef={scheduleDateRef}
                                      onClose={() => setShowScheduleCalendar(false)}
                                  />
                              )}
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/20 dark:border-white/10 flex justify-end gap-4 bg-white/5 dark:bg-black/10 shrink-0">
           <button onClick={onClose} className="px-6 py-3.5 rounded-2xl font-bold bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-white cursor-pointer">Отмена</button>
           <button 
             onClick={handleSubmit} 
             disabled={loading || (!content.trim() && images.length === 0 && !showPollInput) || (showPollInput && pollOptions.filter(opt => opt.text.trim() !== '').length < 2)} 
             className="cursor-pointer disabled:cursor-not-allowed px-8 py-3.5 bg-lime-400 hover:bg-lime-500 text-black rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(163,230,53,0.4)] disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 min-w-[180px]"
           >
              {loading ? <Loader className="animate-spin" size={20} /> : (showScheduleInput ? 'Запланировать' : 'Опубликовать')}
           </button>
        </div>
      </LiquidGlassModal>
    </>
  );
}