import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, ArrowRight, Github, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { gql, useMutation } from '@apollo/client';
import Cookies from 'js-cookie';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { Mood } from '@/components/AnimatedSmiley';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(loginUserInput: { email: $email, password: $password }) {
      access_token user { id username email } emailSent userId
    }
  }
`;

export const stepVariants = {
  initial: { x: 20, opacity: 0, position: 'absolute' as const, width: '100%' },
  animate: { x: 0, opacity: 1, position: 'relative' as const, width: '100%' },
  exit: { x: -20, opacity: 0, position: 'absolute' as const, width: '100%' },
};

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
  onUnverifiedUser: (userId: number, email: string) => void;
  setMood: (mood: Mood) => void;
  onError: (msg: string) => void;
}

export default function LoginForm({ onSwitchToRegister, onSwitchToReset, onUnverifiedUser, setMood, onError }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connectSocket } = useSocket();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [login, { loading }] = useMutation(LOGIN_MUTATION);

  useEffect(() => {
    setRememberMe(localStorage.getItem('rememberMe') === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('rememberMe', String(rememberMe));
  }, [rememberMe]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    onError('');
    
    if (!email || !password) {
      onError('Заполните все поля');
      setMood('sad');
      return;
    }

    try {
      const { data } = await login({ variables: { email, password } });
      if (data?.login?.emailSent && data?.login?.userId) {
        onUnverifiedUser(data.login.userId, email);
      } else if (data?.login?.access_token && data?.login?.user) {
        setMood('laugh');
        const opts = rememberMe ? { expires: 30 } : {};
        Cookies.set('token', data.login.access_token, opts);
        Cookies.set('user', JSON.stringify(data.login.user), opts);
        connectSocket();
        router.push(searchParams.get('redirect') || '/dashboard');
      }
    } catch (err: any) {
      setMood('sad');
      onError(err.message || 'Ошибка входа. Проверьте данные.');
    }
  };

  return (
    <motion.form key="login" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button type="button" className="flex items-center justify-center gap-2 py-3 px-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-sm font-semibold text-zinc-700 border border-zinc-100 group cursor-pointer">
          <Github size={20} /> GitHub
        </button>
        <button type="button" className="flex items-center justify-center gap-2 py-3 px-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-sm font-semibold text-zinc-700 border border-zinc-100 cursor-pointer">
          Google
        </button>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200/60"></div></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white/50 px-2 text-zinc-400 font-medium relative z-10 backdrop-blur-sm">или через email</span></div>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1 cursor-pointer">Email</label>
        {/* Убрали focus-within:ring... и добавили cursor-pointer */}
        <div className="group relative rounded-xl bg-white shadow-sm transition-all border border-transparent focus-within:border-zinc-300 cursor-pointer hover:shadow-md">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent rounded-xl pl-12 pr-4 py-3.5 text-zinc-900 outline-none cursor-pointer focus:cursor-text" />
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2 ml-1">
          <label className="block text-xs font-bold text-zinc-700 uppercase cursor-pointer">Пароль</label>
          <button type="button" onClick={onSwitchToReset} className="text-xs text-zinc-500 hover:text-lime-600 transition-colors cursor-pointer">Забыли?</button>
        </div>
        {/* Убрали focus-within:ring... и добавили cursor-pointer */}
        <div className="group relative rounded-xl bg-white shadow-sm transition-all border border-transparent focus-within:border-zinc-300 cursor-pointer hover:shadow-md">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5 pointer-events-none" />
          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 text-zinc-900 outline-none cursor-pointer focus:cursor-text" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-lime-600 transition-colors cursor-pointer">
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div className="flex items-center ml-1 mt-2">
        <label className="flex items-center cursor-pointer group select-none">
          <div className="relative cursor-pointer">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer sr-only" />
            <div className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center cursor-pointer ${rememberMe ? 'bg-lime-400 border-lime-400' : 'bg-white border-zinc-300 peer-focus:border-zinc-400'}`}>
              {rememberMe && <Check size={14} className="text-zinc-900 stroke-3" />}
            </div>
          </div>
          <span className="ml-2 text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">Запомнить меня</span>
        </label>
      </div>

      <button disabled={loading} className="w-full bg-lime-400 text-zinc-900 font-bold text-lg py-4 rounded-xl hover:bg-lime-500 transition-all flex items-center justify-center gap-2 mt-6 shadow-lg disabled:opacity-50 cursor-pointer">
        {loading ? <Loader className="animate-spin" /> : 'Войти'} {!loading && <ArrowRight size={20} />}
      </button>

      <div className="mt-8 text-center">
        <p className="text-sm text-zinc-500">Нет аккаунта? <button type="button" onClick={onSwitchToRegister} className="text-zinc-900 font-bold hover:text-lime-600 hover:underline cursor-pointer">Зарегистрироваться</button></p>
      </div>
    </motion.form>
  );
}