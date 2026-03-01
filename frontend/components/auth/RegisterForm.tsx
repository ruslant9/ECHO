import { useState, useMemo, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Mars, Venus, Check, ArrowRight, Loader, ChevronLeft, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gql, useMutation, useLazyQuery } from '@apollo/client';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import PasswordChecklist from './PasswordChecklist';
import OTPInput from './OTPInput';
import { Mood } from '@/components/AnimatedSmiley';
import { stepVariants } from './LoginForm';

const CHECK_USERNAME = gql`query CheckUsername($username: String!) { checkUsername(username: $username) }`;
const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $username: String!, $password: String!, $name: String, $gender: String) {
    register(registerUserInput: { email: $email, username: $username, password: $password, name: $name, gender: $gender }) {
      access_token user { id username email } emailSent userId
    }
  }
`;
const CONFIRM_EMAIL = gql`
  mutation ConfirmEmail($userId: Int!, $code: String!) {
    confirmEmail(confirmEmailInput: { userId: $userId, code: $code }) {
      access_token user { id username email }
    }
  }
`;

type RegStep = 'profile_info' | 'password' | 'email' | 'confirm_email' | 'success';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  setMood: (mood: Mood) => void;
  onError: (msg: string) => void;
  initialStep?: RegStep;
  initialUserId?: number | null;
  initialEmail?: string;
  setTitle: (title: string, sub: string) => void;
}

export default function RegisterForm({ onSwitchToLogin, setMood, onError, initialStep = 'profile_info', initialUserId = null, initialEmail = '', setTitle }: RegisterFormProps) {
  const router = useRouter();
  const { connectSocket } = useSocket();

  const [step, setStep] = useState<RegStep>(initialStep);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<number | null>(initialUserId);

  const [code, setCode] = useState('');
  const [codeExpirationTimer, setCodeExpirationTimer] = useState(15 * 60);
  const [resendCooldown, setResendCooldown] = useState(initialStep === 'confirm_email' ? 60 : 0);

  const [checkUsernameQuery] = useLazyQuery(CHECK_USERNAME);
  const [register, { loading: registering }] = useMutation(REGISTER_MUTATION);
  const [confirmEmail, { loading: confirming }] = useMutation(CONFIRM_EMAIL);

  const loading = registering || confirming;

  useEffect(() => { setTitle('Создать аккаунт', 'Присоединяйтесь к сообществу ECHO.'); }, [setTitle]);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) timer = setTimeout(() => setResendCooldown(p => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'confirm_email' && codeExpirationTimer > 0) timer = setTimeout(() => setCodeExpirationTimer(p => p - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeExpirationTimer, step]);

  useEffect(() => {
    if (code.length === 6 && step === 'confirm_email' && !loading) {
      setTimeout(() => handleNext(), 300);
    }
  }, [code]);

  const passwordValidation = useMemo(() => ({
    hasLength: password.length >= 6,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasSymbol: /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(password),
    hasMatch: password !== '' && password === confirmPassword,
  }), [password, confirmPassword]);

  const handleNext = async () => {
    onError('');
    if (step === 'profile_info') {
      if (username.length < 3) return onError('Никнейм должен быть длиннее 3 символов.');
      const { data } = await checkUsernameQuery({ variables: { username } });
      if (data && data.checkUsername === false) return onError('Это имя пользователя уже занято.');
      setStep('password');
    } else if (step === 'password') {
      if (!Object.values(passwordValidation).every(Boolean)) return onError('Пароль не соответствует требованиям.');
      setStep('email');
    } else if (step === 'email') {
      if (!email.includes('@')) return onError('Введите корректный email.');
      try {
        const { data } = await register({ variables: { email, username, password, name, gender } });
        if (data?.register.emailSent) {
          setRegisteredUserId(data.register.userId!);
          setStep('confirm_email');
          setMood('phone');
          setCodeExpirationTimer(15 * 60);
          setResendCooldown(60);
        }
      } catch (err: any) {
        setMood('explode');
        onError(err.message || 'Ошибка регистрации.');
      }
    } else if (step === 'confirm_email') {
      if (code.length !== 6 || !registeredUserId) return onError('Введите полный код.');
      try {
        const { data } = await confirmEmail({ variables: { userId: registeredUserId, code } });
        if (data?.confirmEmail.access_token) {
          Cookies.set('token', data.confirmEmail.access_token, { expires: 7 });
          Cookies.set('user', JSON.stringify(data.confirmEmail.user), { expires: 7 });
          connectSocket();
          setStep('success');
          setMood('dance');
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } catch (err: any) {
        setMood('explode');
        onError('Неверный код.');
      }
    }
  };

  const handleBack = () => {
    onError('');
    if (step === 'email') setStep('password');
    else if (step === 'password') setStep('profile_info');
    else if (step === 'confirm_email') { setStep('email'); setRegisteredUserId(null); setCode(''); }
    else onSwitchToLogin();
  };

  return (
    <>
      {step !== 'success' && (
        <button onClick={handleBack} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4 cursor-pointer">
          <ChevronLeft size={16} /> Назад
        </button>
      )}
      
      <div className="relative min-h-55">
        <AnimatePresence mode="wait">
          {step === 'profile_info' && (
            <motion.div key="profile" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1 cursor-pointer">Никнейм</label>
                <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all cursor-pointer hover:shadow-md">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
                  <input autoFocus value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="username" className="w-full bg-transparent rounded-xl pl-12 pr-4 py-3.5 outline-none cursor-pointer focus:cursor-text" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1 cursor-pointer">Имя (опционально)</label>
                <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all cursor-pointer hover:shadow-md">
                   <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Имя Фамилия" className="w-full bg-transparent rounded-xl px-4 py-3.5 outline-none cursor-pointer focus:cursor-text" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1 cursor-pointer">Пол</label>
                <div className="relative w-full h-14 rounded-2xl flex p-1 cursor-pointer select-none transition-colors border bg-zinc-100 border-zinc-200">
                    <motion.div layout transition={{ type: 'spring', stiffness: 300, damping: 30 }} initial={false} animate={{ x: gender === 'male' ? '0%' : '100%', backgroundColor: gender === 'male' ? '#3b82f6' : '#ec4899' }} className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl shadow-sm z-0 pointer-events-none" />
                    <div onClick={() => setGender('male')} className={`flex-1 z-10 flex items-center justify-center gap-2 transition-colors duration-300 cursor-pointer ${gender === 'male' ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'}`}><Mars size={20} /><span className="font-bold text-sm">Мужской</span></div>
                    <div onClick={() => setGender('female')} className={`flex-1 z-10 flex items-center justify-center gap-2 transition-colors duration-300 cursor-pointer ${gender === 'female' ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'}`}><Venus size={20} /><span className="font-bold text-sm">Женский</span></div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div key="password" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
              <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all cursor-pointer hover:shadow-md">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
                <input autoFocus type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none cursor-pointer focus:cursor-text" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-lime-600 cursor-pointer"><Eye size={20} /></button>
              </div>
              <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all cursor-pointer hover:shadow-md">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Повторите пароль" className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none cursor-pointer focus:cursor-text" />
              </div>
              <PasswordChecklist validation={passwordValidation} />
            </motion.div>
          )}

          {step === 'email' && (
            <motion.div key="email" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1 cursor-pointer">Ваш Email</label>
              <div className="group relative rounded-xl bg-white shadow-sm border border-transparent focus-within:border-zinc-300 transition-all cursor-pointer hover:shadow-md">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
                <input autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 text-zinc-900 outline-none cursor-pointer focus:cursor-text" />
              </div>
            </motion.div>
          )}

          {step === 'confirm_email' && (
            <motion.div key="confirm" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="text-center">
              <MessageCircle size={48} className="mx-auto mb-4 text-zinc-400" />
              <h3 className="text-xl font-bold mb-2">Подтвердите почту</h3>
              <p className="text-zinc-500 mb-4">Код отправлен на <span className="font-bold">{email}</span></p>
              <OTPInput value={code} onChange={setCode} expirationTimer={codeExpirationTimer} resendCooldown={resendCooldown} onResend={() => {}} onError={onError} />
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} /></div>
              <p className="font-bold text-lg">Аккаунт создан!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={handleNext} disabled={loading || step === 'success'} className="w-full bg-lime-400 text-zinc-900 font-bold text-lg py-4 rounded-xl hover:bg-lime-500 transition-all flex items-center justify-center gap-2 mt-6 shadow-lg disabled:opacity-50 cursor-pointer">
        {loading ? <Loader className="animate-spin" /> : step === 'confirm_email' ? 'Подтвердить' : 'Далее'}
        {!loading && step !== 'success' && <ArrowRight size={20} />}
      </button>

      {step === 'profile_info' && (
        <p className="text-sm text-zinc-500 mt-8 text-center cursor-pointer">Уже есть аккаунт? <button type="button" onClick={onSwitchToLogin} className="text-zinc-900 font-bold hover:text-lime-600 hover:underline cursor-pointer">Войти</button></p>
      )}
    </>
  );
}