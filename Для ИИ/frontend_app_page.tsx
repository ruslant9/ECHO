'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSmiley, { Mood } from '@/components/AnimatedSmiley';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

type AuthView = 'login' | 'register' | 'reset';

export default function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const [mood, setMood] = useState<Mood>('neutral');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [title, setTitle] = useState('С возвращением!');
  const [subtitle, setSubtitle] = useState('Введите данные для входа.');

  // Для передачи данных из логина в регистрацию при неподтвержденном email
  const [unverifiedUserId, setUnverifiedUserId] = useState<number | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const handleSetTitle = (t: string, s: string) => {
    setTitle(t); setSubtitle(s);
  };

  const switchView = (newView: AuthView) => {
    setErrorMsg('');
    setMood('neutral');
    setView(newView);
    if (newView === 'login') handleSetTitle('С возвращением!', 'Введите данные для входа.');
  };

  const handleUnverified = (userId: number, email: string) => {
    setUnverifiedUserId(userId);
    setUnverifiedEmail(email);
    setErrorMsg('Ваш аккаунт не верифицирован. Код отправлен.');
    setView('register');
  };

  return (
    <div className="min-h-screen w-full flex font-sans text-zinc-900 bg-white">
      <style jsx global>{`@keyframes backgroundGradientAnimation {0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; }}`}</style>

      {/* Левая панель с кляксой */}
      <div className="hidden lg:flex w-1/2 bg-zinc-50 relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-200">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-225 h-225 bg-lime-400/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full">
          <motion.div className="text-center mb-40 flex gap-1" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            {['E', 'C', 'H', 'O'].map((letter, i) => <span key={i} className="text-6xl font-black text-zinc-900 tracking-tighter uppercase">{letter}</span>)}
          </motion.div>
          <AnimatedSmiley mood={mood} onMoodChange={setMood} isLoading={false} />
        </div>
      </div>

      {/* Правая панель с формами */}
      <div className="w-full lg:w-1/2 flex flex-col relative overflow-hidden" style={{ backgroundImage: 'linear-gradient(135deg, #f7fee7, #ffffff, #f0fdf4)', backgroundSize: '200% 200%', animation: 'backgroundGradientAnimation 10s ease infinite' }}>
        
        <div className="absolute top-0 right-0 p-8 flex gap-6 z-20 text-sm font-medium text-zinc-500">
          <span className="hover:text-lime-600 transition-colors cursor-pointer">Помощь</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-105">
            
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">{title}</h1>
              <p className="text-zinc-500 text-sm">{subtitle}</p>
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
                  <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl flex items-center gap-2 border border-red-100">
                    <X size={16} /> {errorMsg}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {view === 'login' && (
              <LoginForm 
                onSwitchToRegister={() => switchView('register')} 
                onSwitchToReset={() => switchView('reset')} 
                onUnverifiedUser={handleUnverified}
                setMood={setMood} 
                onError={setErrorMsg} 
              />
            )}

            {view === 'register' && (
              <RegisterForm 
                onSwitchToLogin={() => switchView('login')} 
                setMood={setMood} 
                onError={setErrorMsg} 
                setTitle={handleSetTitle}
                initialStep={unverifiedUserId ? 'confirm_email' : 'profile_info'}
                initialEmail={unverifiedEmail}
                initialUserId={unverifiedUserId}
              />
            )}

            {view === 'reset' && (
              <ResetPasswordForm 
                onSwitchToLogin={() => switchView('login')} 
                setMood={setMood} 
                onError={setErrorMsg} 
                setTitle={handleSetTitle}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}