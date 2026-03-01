import { useState, useMemo, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, RefreshCcw, ArrowRight, Loader, ChevronLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gql, useMutation } from '@apollo/client';
import PasswordChecklist from './PasswordChecklist';
import OTPInput from './OTPInput';
import { Mood } from '@/components/AnimatedSmiley';
import { stepVariants } from './LoginForm';

const REQUEST_RESET = gql`mutation ReqReset($email: String!) { requestPasswordReset(requestPasswordResetInput: { email: $email }) { emailSent } }`;
const RESET_PASSWORD = gql`mutation Reset($email: String!, $code: String!, $newPassword: String!) { resetPassword(resetPasswordInput: { email: $email, code: $code, newPassword: $newPassword }) }`;

type ResetStep = 'request_email' | 'enter_code' | 'reset_success';

interface ResetPasswordFormProps {
  onSwitchToLogin: () => void;
  setMood: (mood: Mood) => void;
  onError: (msg: string) => void;
  setTitle: (title: string, sub: string) => void;
}

export default function ResetPasswordForm({ onSwitchToLogin, setMood, onError, setTitle }: ResetPasswordFormProps) {
  const [step, setStep] = useState<ResetStep>('request_email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [codeExpirationTimer, setCodeExpirationTimer] = useState(30 * 60);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [requestReset, { loading: requesting }] = useMutation(REQUEST_RESET);
  const [resetPass, { loading: resetting }] = useMutation(RESET_PASSWORD);
  const loading = requesting || resetting;

  useEffect(() => {
    if (step === 'request_email') setTitle('Забыли пароль?', 'Введите email для восстановления.');
    else setTitle('Сброс пароля', 'Введите код и новый пароль.');
  }, [step, setTitle]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) timer = setTimeout(() => setResendCooldown(p => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'enter_code' && codeExpirationTimer > 0) timer = setTimeout(() => setCodeExpirationTimer(p => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeExpirationTimer, step]);

  const passwordValidation = useMemo(() => ({
    hasLength: password.length >= 6,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasSymbol: /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(password),
    hasMatch: password !== '' && password === confirmPassword,
  }), [password, confirmPassword]);

  const handleNext = async () => {
    onError('');
    if (step === 'request_email') {
      if (!email.includes('@')) return onError('Введите корректный email.');
      try {
        await requestReset({ variables: { email } });
        setStep('enter_code');
        setMood('shield');
        setCodeExpirationTimer(30 * 60);
        setResendCooldown(60);
      } catch (err: any) { onError(err.message || 'Ошибка'); }
    } else if (step === 'enter_code') {
      if (code.length !== 6) return onError('Введите код');
      if (!Object.values(passwordValidation).every(Boolean)) return onError('Пароль не надежен');
      try {
        await resetPass({ variables: { email, code, newPassword: password } });
        setStep('reset_success');
        setMood('laugh');
        setTimeout(() => onSwitchToLogin(), 2000);
      } catch (err: any) { onError(err.message || 'Ошибка сброса'); }
    }
  };

  const handleBack = () => {
    onError('');
    if (step === 'enter_code') setStep('request_email');
    else onSwitchToLogin();
  };

  return (
    <>
      <button onClick={handleBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4 cursor-pointer">
        <ChevronLeft size={16} /> Назад
      </button>

      <div className="relative min-h-55">
        <AnimatePresence mode="wait">
          {step === 'request_email' && (
            <motion.div key="req" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1 cursor-pointer">Ваш Email</label>
              <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all cursor-pointer hover:shadow-md">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
                <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none cursor-pointer focus:cursor-text" />
              </div>
            </motion.div>
          )}

          {step === 'enter_code' && (
            <motion.div key="code" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
               <RefreshCcw size={48} className="mx-auto mb-4 text-zinc-400" />
               <OTPInput value={code} onChange={setCode} expirationTimer={codeExpirationTimer} resendCooldown={resendCooldown} onResend={() => {}} onError={onError} />
               <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all mt-4 cursor-pointer hover:shadow-md">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
                 <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Новый пароль" className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none cursor-pointer focus:cursor-text" />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-lime-600 cursor-pointer"><Eye size={20} /></button>
               </div>
               <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all cursor-pointer hover:shadow-md">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
                 <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Повторите пароль" className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none cursor-pointer focus:cursor-text" />
               </div>
               <PasswordChecklist validation={passwordValidation} />
            </motion.div>
          )}

          {step === 'reset_success' && (
             <motion.div key="success" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="text-center py-8">
               <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={32} /></div>
               <p className="font-bold text-lg">Пароль успешно сброшен!</p>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={handleNext} disabled={loading || step === 'reset_success'} className="w-full bg-lime-400 text-zinc-900 font-bold text-lg py-4 rounded-xl hover:bg-lime-500 transition-all flex items-center justify-center gap-2 mt-6 shadow-lg disabled:opacity-50 cursor-pointer">
        {loading ? <Loader className="animate-spin" /> : step === 'request_email' ? 'Отправить код' : 'Сбросить пароль'}
      </button>
    </>
  );
}