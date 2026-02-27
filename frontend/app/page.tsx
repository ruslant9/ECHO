'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Github, Check, X, Loader, ChevronLeft, User, MessageCircle, RefreshCcw, ShieldCheck, ClipboardPaste, Mars, Venus } from 'lucide-react';
import { gql, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useSocket } from '@/context/SocketContext';
import { useLazyQuery } from '@apollo/client';
import { useSearchParams } from 'next/navigation';

// Импортируем новый компонент и тип Mood
import AnimatedSmiley, { Mood } from '@/components/AnimatedSmiley';

// ... все интерфейсы и мутации остаются без изменений
interface LoginData {
  login: {
    access_token?: string;
    user?: {
      id: number;
      username: string;
      email: string;
    };
    emailSent?: boolean;
    userId?: number;
  };
}

interface RegisterResponse {
  register: {
    access_token?: string;
    user?: {
      id: number;
      username: string;
      email: string;
    };
    emailSent?: boolean;
    userId?: number;
  };
}

interface ConfirmEmailResponse {
  confirmEmail: {
    access_token: string;
    user: {
      id: number;
      username: string;
      email: string;
    };
  };
}

interface RequestPasswordResetResponse {
  requestPasswordReset: {
    emailSent: boolean;
  };
}

interface ResetPasswordResponse {
  resetPassword: boolean;
}

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(loginUserInput: { email: $email, password: $password }) {
      access_token
      user {
        id
        username
        email
      }
      emailSent
      userId
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $username: String!, $password: String!, $name: String, $gender: String) {
    register(registerUserInput: { email: $email, username: $username, password: $password, name: $name, gender: $gender }) {
      access_token
      user {
        id
        username
        email
      }
      emailSent
      userId
    }
  }
`;

const CONFIRM_EMAIL_MUTATION = gql`
  mutation ConfirmEmail($userId: Int!, $code: String!) {
    confirmEmail(confirmEmailInput: { userId: $userId, code: $code }) {
      access_token
      user {
        id
        username
        email
      }
    }
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(requestPasswordResetInput: { email: $email }) {
      emailSent
    }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($email: String!, $code: String!, $newPassword: String!) {
    resetPassword(resetPasswordInput: { email: $email, code: $code, newPassword: $newPassword })
  }
`;

// Типы шагов остаются
type RegStep = 'profile_info' | 'password' | 'email' | 'confirm_email' | 'success';
type ResetStep = 'request_email' | 'enter_code' | 'reset_success';

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_EXPIRATION_SECONDS = 15 * 60;

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const { connectSocket } = useSocket();

  const [isLoginView, setIsLoginView] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPasswordResetFlow, setIsPasswordResetFlow] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Состояние настроения – остаётся, т.к. управляется из многих мест
  const [mood, setMood] = useState<Mood>('neutral');

  const CHECK_USERNAME = gql`
    query CheckUsername($username: String!) {
      checkUsername(username: $username)
    }
  `;

  const [checkUsernameQuery, { loading: checkingUsername }] = useLazyQuery(CHECK_USERNAME);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRememberMe = localStorage.getItem('rememberMe');
      if (savedRememberMe !== null) {
        setRememberMe(savedRememberMe === 'true');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rememberMe', String(rememberMe));
  }, [rememberMe]);

  const [regStep, setRegStep] = useState<RegStep>('profile_info');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('male');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [registeredUserId, setRegisteredUserId] = useState<number | null>(null);

  const [codeInputs, setCodeInputs] = useState<string[]>(Array(6).fill(''));
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeExpirationTimer, setCodeExpirationTimer] = useState(CODE_EXPIRATION_SECONDS);
  const [codeExpirationTimestamp, setCodeExpirationTimestamp] = useState<number | null>(null);

  const [resetStep, setResetStep] = useState<ResetStep>('request_email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [login, { loading: loginLoading }] = useMutation<LoginData>(LOGIN_MUTATION);
  const [register, { loading: registerLoading }] = useMutation<RegisterResponse>(REGISTER_MUTATION);
  const [confirmEmail, { loading: confirmEmailLoading }] = useMutation<ConfirmEmailResponse>(CONFIRM_EMAIL_MUTATION);
  const [requestPasswordReset, { loading: requestResetLoading }] = useMutation<RequestPasswordResetResponse>(REQUEST_PASSWORD_RESET_MUTATION);
  const [resetPassword, { loading: resetPasswordLoading }] = useMutation<ResetPasswordResponse>(RESET_PASSWORD_MUTATION);

  const isLoading = loginLoading || registerLoading || confirmEmailLoading || requestResetLoading || resetPasswordLoading;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (codeExpirationTimestamp) {
      timer = setTimeout(() => {
        const now = Date.now();
        const remaining = Math.floor((codeExpirationTimestamp - now) / 1000);
        if (remaining <= 0) {
          setCodeExpirationTimer(0);
          setCodeExpirationTimestamp(null);
          if (regStep === 'confirm_email') {
            setErrorMsg('Срок действия кода истек. Запросите новый.');
          }
        } else {
          setCodeExpirationTimer(remaining);
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [codeExpirationTimer, codeExpirationTimestamp, regStep]);

  useEffect(() => {
    const fullCode = codeInputs.join('');
    if (fullCode.length === 6 && regStep === 'confirm_email' && !isLoading) {
      const timer = setTimeout(() => {
        handleNextStep(fullCode);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [codeInputs, regStep, isLoading]);

  const passwordValidation = useMemo(() => {
    const hasLength = password.length >= 6;
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasSymbol = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(password);
    const hasMatch = password !== '' && password === confirmPassword;
    return { hasLength, hasLowercase, hasUppercase, hasSymbol, hasMatch };
  }, [password, confirmPassword]);

  const isPasswordStepValid =
    passwordValidation.hasLength &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasSymbol &&
    passwordValidation.hasMatch;

  const newPasswordValidation = useMemo(() => {
    const hasLength = newPassword.length >= 6;
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(newPassword);
    const hasMatch = newPassword !== '' && newPassword === confirmNewPassword;
    return { hasLength, hasLowercase, hasUppercase, hasSymbol, hasMatch };
  }, [newPassword, confirmNewPassword]);

  const isNewPasswordValid =
    newPasswordValidation.hasLength &&
    newPasswordValidation.hasLowercase &&
    newPasswordValidation.hasUppercase &&
    newPasswordValidation.hasSymbol &&
    newPasswordValidation.hasMatch;

  const handleNextStep = async (fullCodeFromAutoConfirm?: string) => {
    setErrorMsg('');

    if (isPasswordResetFlow) {
      if (resetStep === 'request_email') {
        if (!resetEmail.includes('@')) {
          setErrorMsg('Введите корректный email.');
          setMood('sad');
          return;
        }
        try {
          const { data } = await requestPasswordReset({ variables: { email: resetEmail } });
          if (data?.requestPasswordReset.emailSent) {
            setResetStep('enter_code');
            setMood('shield');
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setCodeExpirationTimestamp(Date.now() + 30 * 60 * 1000);
          } else {
            setErrorMsg('Не удалось отправить код. Попробуйте еще раз.');
            setMood('sad');
          }
        } catch (err: any) {
          setMood('sad');
          setErrorMsg(err.message || 'Ошибка запроса сброса пароля.');
        }
      } else if (resetStep === 'enter_code') {
        if (!resetCode || !newPassword || !confirmNewPassword) {
          setErrorMsg('Заполните все поля.');
          setMood('sad');
          return;
        }
        if (!isNewPasswordValid) {
          setErrorMsg('Пароль не соответствует требованиям.');
          setMood('sad');
          return;
        }
        if (codeExpirationTimer === 0) {
          setErrorMsg('Срок действия кода истек. Запросите новый.');
          setMood('sad');
          return;
        }
        try {
          const { data } = await resetPassword({ variables: { email: resetEmail, code: resetCode, newPassword: newPassword } });
          if (data?.resetPassword) {
            setResetStep('reset_success');
            setMood('laugh');
            setTimeout(() => {
              setIsPasswordResetFlow(false);
              setIsLoginView(true);
              setResetStep('request_email');
              setMood('neutral');
              setEmail(resetEmail);
            }, 2000);
          } else {
            setErrorMsg('Не удалось сбросить пароль. Проверьте код.');
            setMood('sad');
          }
        } catch (err: any) {
          setMood('sad');
          setErrorMsg(err.message || 'Ошибка сброса пароля.');
        }
      }
      return;
    }

    if (isLoginView) {
      if (!email || !password) {
        setErrorMsg('Заполните все поля');
        setMood('sad');
        return;
      }
      try {
        const { data } = await login({ variables: { email, password } });
        if (data?.login?.emailSent && data?.login?.userId) {
          setIsLoginView(false);
          setErrorMsg('Ваш аккаунт не верифицирован. Новый код подтверждения отправлен на вашу почту.');
          setRegisteredUserId(data.login.userId);
          setEmail(email);
          setRegStep('confirm_email');
          setMood('phone');
          setCodeInputs(Array(6).fill(''));
          setCodeExpirationTimestamp(Date.now() + CODE_EXPIRATION_SECONDS * 1000);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } else if (data?.login?.access_token && data?.login?.user) {
          setMood('laugh');

          const cookieOptions = rememberMe ? { expires: 30 } : {};

          Cookies.set('token', data.login.access_token, cookieOptions);
          Cookies.set('user', JSON.stringify(data.login.user), cookieOptions);

          connectSocket();

          if (redirectUrl) {
            router.push(redirectUrl);
          } else {
            router.push('/dashboard');
          }
        } else {
          setErrorMsg('Неизвестная ошибка входа.');
          setMood('sad');
        }
      } catch (err: any) {
        setMood('sad');
        setErrorMsg(err.message || 'Ошибка входа. Проверьте данные.');
      }
      return;
    }

    if (regStep === 'profile_info') {
      if (username.length < 3) {
        setErrorMsg('Имя пользователя должно быть длиннее 3 символов.');
        return;
      }

      try {
        const { data } = await checkUsernameQuery({ variables: { username } });
        if (data && data.checkUsername === false) {
          setErrorMsg('Это имя пользователя уже занято.');
          setMood('sad');
          return;
        }
      } catch (e) {
        console.error(e);
      }

      setRegStep('password');
      setMood('neutral');
    } else if (regStep === 'password') {
      if (!isPasswordStepValid) {
        setMood('sad');
        setErrorMsg('Пароль не соответствует требованиям.');
        return;
      }
      setRegStep('email');
    } else if (regStep === 'email') {
      if (!email.includes('@')) {
        setErrorMsg('Введите корректный email.');
        setMood('sad');
        return;
      }
      try {
        const { data } = await register({ variables: { email, username, password, name, gender } });
        if (data?.register.emailSent && data.register.userId) {
          setRegisteredUserId(data.register.userId);
          setRegStep('confirm_email');
          setMood('phone');
          setCodeExpirationTimestamp(Date.now() + CODE_EXPIRATION_SECONDS * 1000);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } else if (data?.register.access_token && data.register.user) {
          Cookies.set('token', data.register.access_token, { expires: 7 });
          Cookies.set('user', JSON.stringify(data.register.user), { expires: 7 });
          setRegStep('success');
          setMood('dance');
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } catch (err: any) {
        setMood('explode');
        setErrorMsg(err.message || 'Ошибка регистрации. Возможно, email занят.');
      }
    } else if (regStep === 'confirm_email') {
      const currentCode = fullCodeFromAutoConfirm || codeInputs.join('');
      if (!currentCode || currentCode.length !== 6) {
        setErrorMsg('Пожалуйста, введите полный код подтверждения.');
        setMood('sad');
        return;
      }
      if (registeredUserId === null) {
        setErrorMsg('Произошла ошибка, ID пользователя не найден.');
        setMood('sad');
        return;
      }
      if (codeExpirationTimer === 0) {
        setErrorMsg('Срок действия кода истек. Запросите новый.');
        setMood('sad');
        return;
      }

      try {
        const { data } = await confirmEmail({ variables: { userId: registeredUserId, code: currentCode } });
        if (data?.confirmEmail.access_token && data.confirmEmail.user) {
          Cookies.set('token', data.confirmEmail.access_token, { expires: 7 });
          Cookies.set('user', JSON.stringify(data.confirmEmail.user), { expires: 7 });
          connectSocket();
          setRegStep('success');
          setMood('dance');
          setTimeout(() => router.push('/dashboard'), 2000);
        }
      } catch (err: any) {
        setMood('explode');
        setErrorMsg(err.message || 'Неверный или просроченный код подтверждения.');
      }
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    if (!email && !resetEmail) {
      setErrorMsg('Email для повторной отправки не найден.');
      return;
    }
    const targetEmail = isPasswordResetFlow ? resetEmail : email;

    try {
      if (isPasswordResetFlow) {
        await requestPasswordReset({ variables: { email: targetEmail } });
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setCodeExpirationTimestamp(Date.now() + 30 * 60 * 1000);
        setErrorMsg('Новый код сброса пароля отправлен на вашу почту!');
      } else {
        if (registeredUserId) {
          await register({ variables: { email: targetEmail, username: "dummy_username", password: "dummy_password" } });
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setCodeExpirationTimestamp(Date.now() + CODE_EXPIRATION_SECONDS * 1000);
          setCodeInputs(Array(6).fill(''));
          setErrorMsg('Новый код отправлен на вашу почту!');
        } else {
          setErrorMsg('Не удалось повторно отправить код. Пожалуйста, попробуйте войти снова или зарегистрироваться.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Не удалось повторно отправить код.');
    }
  };

  const handleBackStep = () => {
    setErrorMsg('');
    if (isPasswordResetFlow) {
      if (resetStep === 'enter_code') {
        setResetStep('request_email');
        setCodeInputs(Array(6).fill(''));
        setCodeExpirationTimestamp(null);
        setResendCooldown(0);
      } else if (resetStep === 'request_email') {
        setIsPasswordResetFlow(false);
        setIsLoginView(true);
        setMood('neutral');
      }
    } else {
      if (regStep === 'email') setRegStep('password');
      if (regStep === 'password') setRegStep('profile_info');
      if (regStep === 'confirm_email') {
        setRegStep('email');
        setRegisteredUserId(null);
        setMood('neutral');
        setCodeInputs(Array(6).fill(''));
        setCodeExpirationTimestamp(null);
        setResendCooldown(0);
      }
    }
  };

  const switchToLogin = () => {
    setIsLoginView(true);
    setRegStep('profile_info');
    setIsPasswordResetFlow(false);
    setResetStep('request_email');
    setErrorMsg('');
    setMood('neutral');
    setCodeInputs(Array(6).fill(''));
    setCodeExpirationTimestamp(null);
    setResendCooldown(0);
  };

  const switchToRegister = () => {
    setIsLoginView(false);
    setRegStep('profile_info');
    setIsPasswordResetFlow(false);
    setResetStep('request_email');
    setErrorMsg('');
    setMood('neutral');
    setCodeInputs(Array(6).fill(''));
    setCodeExpirationTimestamp(null);
    setResendCooldown(0);
  };

  const switchToPasswordReset = () => {
    setIsPasswordResetFlow(true);
    setIsLoginView(false);
    setRegStep('profile_info');
    setResetStep('request_email');
    setErrorMsg('');
    setMood('shield');
    setResetEmail(email);
    setCodeInputs(Array(6).fill(''));
    setCodeExpirationTimestamp(null);
    setResendCooldown(0);
  };

  const handleCodeDigitChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 1) {
      const newCodeInputs = [...codeInputs];
      newCodeInputs[index] = value;
      setCodeInputs(newCodeInputs);

      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digits = pastedData.replace(/\D/g, '').substring(0, 6);

    const newCodeInputs = [...Array(6).fill('')];
    for (let i = 0; i < digits.length; i++) {
      newCodeInputs[i] = digits[i];
    }
    setCodeInputs(newCodeInputs);

    if (digits.length > 0) {
      const lastFilledIndex = Math.min(digits.length - 1, 5);
      codeInputRefs.current[lastFilledIndex]?.focus();
    }
  }, [codeInputs]);

  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const digits = text.replace(/\D/g, '').substring(0, 6);
        const newCodeInputs = [...Array(6).fill('')];
        for (let i = 0; i < digits.length; i++) {
          newCodeInputs[i] = digits[i];
        }
        setCodeInputs(newCodeInputs);

        if (digits.length > 0) {
          const lastFilledIndex = Math.min(digits.length - 1, 5);
          codeInputRefs.current[lastFilledIndex]?.focus();
        }
      } else {
        setErrorMsg('Ваш браузер не поддерживает автоматическую вставку.');
      }
    } catch (err) {
      setErrorMsg('Не удалось прочитать из буфера обмена.');
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  // stepVariants остаются (используются для анимации форм)
  const stepVariants = {
    initial: { x: 20, opacity: 0, position: 'absolute' as const, width: '100%' },
    animate: { x: 0, opacity: 1, position: 'relative' as const, width: '100%' },
    exit: { x: -20, opacity: 0, position: 'absolute' as const, width: '100%' },
  };

  const currentTitle = isPasswordResetFlow
    ? (resetStep === 'request_email' ? 'Забыли пароль?' : 'Сброс пароля')
    : (isLoginView ? 'С возвращением!' : 'Создать аккаунт');

  const currentSubtitle = isPasswordResetFlow
    ? (resetStep === 'request_email' ? 'Введите email для восстановления.' : 'Введите код и новый пароль.')
    : (isLoginView ? 'Введите данные для входа.' : 'Присоединяйтесь к сообществу ECHO.');

  return (
    <div className="min-h-screen w-full flex font-sans text-zinc-900 bg-white">
      <style jsx global>{`@keyframes backgroundGradientAnimation {0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; }}`}</style>

      {/* Левая панель с шариком */}
      <div className="hidden lg:flex w-1/2 bg-zinc-50 relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-200">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-225 h-225 bg-lime-400/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full">
          <motion.div
            className="text-center mb-40 flex gap-1"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {['E', 'C', 'H', 'O'].map((letter, index) => (
              <span
                key={index}
                className="text-6xl font-black text-zinc-900 tracking-tighter uppercase inline-block"
              >
                {letter}
              </span>
            ))}
          </motion.div>

          {/* Вместо старого кода шарика используем новый компонент */}
          <AnimatedSmiley mood={mood} onMoodChange={setMood} isLoading={isLoading} />
        </div>
      </div>

      {/* Правая панель с формами (остаётся без изменений) */}
      <div
        className="w-full lg:w-1/2 flex flex-col relative overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(135deg, #f7fee7, #ffffff, #f0fdf4)',
          backgroundSize: '200% 200%',
          animation: 'backgroundGradientAnimation 10s ease infinite',
        }}
      >
        <div className="absolute top-0 right-0 p-8 flex gap-6 z-20 text-sm font-medium text-zinc-500">
          <span className="hover:text-lime-600 transition-colors cursor-pointer">Помощь</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-105">
            <div className="mb-6 text-center">
              <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-3">{currentTitle}</h1>
              <p className="text-zinc-500 text-sm">{currentSubtitle}</p>
            </div>

            <AnimatePresence>
              {(!isLoginView || isPasswordResetFlow) &&
                ((isPasswordResetFlow && resetStep !== 'request_email') ||
                  (!isLoginView &&
                    (regStep === 'password' || regStep === 'email' || regStep === 'confirm_email'))) && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onClick={handleBackStep}
                    className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
                  >
                    <ChevronLeft size={16} /> Назад
                  </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl flex items-center gap-2 border border-red-100">
                    <X size={16} /> {errorMsg}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoginView && !isPasswordResetFlow && (
              <div className="grid grid-cols-2 gap-3 mb-8">
                <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-sm font-semibold text-zinc-700 border border-zinc-100 group">
                  <Github size={20} /> GitHub
                </button>
                <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-sm font-semibold text-zinc-700 border border-zinc-100">
                  Google
                </button>
              </div>
            )}

            {isLoginView && !isPasswordResetFlow && (
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200/60"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/50 px-2 text-zinc-400 font-medium relative z-10 backdrop-blur-sm">
                    или через email
                  </span>
                </div>
              </div>
            )}

            <div className="relative min-h-55">
              <AnimatePresence mode="wait">
                {isLoginView && !isPasswordResetFlow && (
                  <motion.form
                    key="login"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleNextStep();
                    }}
                  >
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">Email</label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          type="email"
                          name="email"
                          autoComplete="username"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-transparent rounded-xl pl-12 pr-4 py-3.5 text-zinc-900 outline-none placeholder:text-zinc-300"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2 ml-1">
                        <label className="block text-xs font-bold text-zinc-700 uppercase">Пароль</label>
                        <button
                          type="button"
                          onClick={switchToPasswordReset}
                          className="text-xs text-zinc-500 hover:text-lime-600 transition-colors"
                        >
                          Забыли?
                        </button>
                      </div>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 text-zinc-900 outline-none placeholder:text-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-lime-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center ml-1 mt-2">
                      <label className="flex items-center cursor-pointer group select-none">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div
                            className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center
                                    ${
                                      rememberMe
                                        ? 'bg-lime-400 border-lime-400'
                                        : 'bg-white border-zinc-300 peer-focus:border-lime-400 group-hover:border-zinc-400'
                                    }`}
                          >
                            {rememberMe && <Check size={14} className="text-zinc-900 stroke-3" />}
                          </div>
                        </div>
                        <span className="ml-2 text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">
                          Запомнить меня
                        </span>
                      </label>
                    </div>
                  </motion.form>
                )}

                {!isLoginView && !isPasswordResetFlow && regStep === 'profile_info' && (
                  <motion.div
                    key="profile_info"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">
                        Придумайте никнейм (обязательно)
                      </label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          autoFocus
                          name="username"
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          type="text"
                          placeholder="username"
                          className="w-full bg-transparent rounded-xl pl-12 pr-4 py-3.5 text-zinc-900 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">
                        Ваше имя (опционально)
                      </label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <input
                          name="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          type="text"
                          placeholder="Имя Фамилия"
                          className="w-full bg-transparent rounded-xl px-4 py-3.5 text-zinc-900 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">
                        Пол (опционально)
                      </label>
                      <div className="relative w-full h-14 rounded-2xl flex p-1 cursor-pointer select-none transition-colors border bg-zinc-100 border-zinc-200">
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          initial={false}
                          animate={{
                            x: gender === 'male' ? '0%' : '100%',
                            backgroundColor: gender === 'male' ? '#3b82f6' : '#ec4899',
                          }}
                          className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl shadow-sm z-0"
                        />
                        <div
                          onClick={() => setGender('male')}
                          className={`flex-1 z-10 flex items-center justify-center gap-2 transition-colors duration-300 ${
                            gender === 'male' ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          <Mars size={20} className={gender === 'male' ? 'fill-current' : ''} />
                          <span className="font-bold text-sm">Мужской</span>
                        </div>
                        <div
                          onClick={() => setGender('female')}
                          className={`flex-1 z-10 flex items-center justify-center gap-2 transition-colors duration-300 ${
                            gender === 'female' ? 'text-white' : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          <Venus size={20} className={gender === 'female' ? 'fill-current' : ''} />
                          <span className="font-bold text-sm">Женский</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!isLoginView && !isPasswordResetFlow && regStep === 'password' && (
                  <motion.div
                    key="password"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">Пароль</label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          autoFocus
                          name="new-password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-lime-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">
                        Повторите пароль
                      </label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          name="confirm-password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none"
                        />
                      </div>
                    </div>
                    <div className="text-xs space-y-1 pt-1 ml-1">
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          passwordValidation.hasLength ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 6 символов
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          passwordValidation.hasLowercase ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 1 строчная буква
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          passwordValidation.hasUppercase ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 1 заглавная буква
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          passwordValidation.hasSymbol ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 1 спец. символ
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          passwordValidation.hasMatch ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Пароли совпадают
                      </p>
                    </div>
                  </motion.div>
                )}

                {!isLoginView && !isPasswordResetFlow && regStep === 'email' && (
                  <motion.div
                    key="email"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-5"
                  >
                    <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">Ваш Email</label>
                    <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                      <input
                        autoFocus
                        name="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="name@example.com"
                        className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 text-zinc-900 outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                {!isLoginView && !isPasswordResetFlow && regStep === 'confirm_email' && registeredUserId !== null && (
                  <motion.div
                    key="confirm_email"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-5 text-center"
                  >
                    <MessageCircle size={48} className="mx-auto mb-4 text-zinc-400" />
                    <h3 className="text-xl font-bold mb-2">Подтвердите вашу почту</h3>
                    <p className="text-zinc-500 mb-4">
                      Мы отправили код на адрес <span className="font-bold text-zinc-700">{email}</span>. Пожалуйста,
                      введите его ниже.
                    </p>

                    <div className="flex justify-center gap-2 mb-4">
                      {codeInputs.map((digit, index) => (
                        <input
                          key={`code-input-${index}`}
                          ref={(el: HTMLInputElement | null) => {
                            codeInputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeDigitChange(index, e)}
                          onKeyDown={(e) => handleCodeKeyDown(index, e)}
                          onPaste={index === 0 ? handleCodePaste : undefined}
                          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-zinc-300 bg-white shadow-sm focus:border-lime-400 focus:ring-2 focus-within:ring-lime-400/50 outline-none transition-all"
                          autoFocus={index === 0}
                        />
                      ))}
                    </div>

                    {codeExpirationTimestamp && codeExpirationTimer > 0 && (
                      <p className="text-sm text-zinc-500 mb-4">
                        Код истечет через:{' '}
                        <span className="font-bold text-red-500">
                          {Math.floor(codeExpirationTimer / 60)
                            .toString()
                            .padStart(2, '0')}
                          :{(codeExpirationTimer % 60).toString().padStart(2, '0')}
                        </span>
                      </p>
                    )}
                    {codeExpirationTimer === 0 && (
                      <p className="text-sm text-red-500 mb-4 font-bold">Срок действия кода истек!</p>
                    )}

                    <div className="flex justify-center items-center gap-4">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendCooldown > 0}
                        className={`text-sm font-medium transition-colors flex items-center gap-2
                                    ${
                                      resendCooldown > 0
                                        ? 'text-zinc-400 cursor-not-allowed'
                                        : 'text-lime-600 hover:underline'
                                    }`}
                      >
                        {resendCooldown > 0
                          ? `Отправить код повторно через ${resendCooldown}с`
                          : 'Отправить код повторно'}
                      </button>
                      <button
                        type="button"
                        onClick={handlePasteButtonClick}
                        className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <ClipboardPaste size={16} /> Вставить код
                      </button>
                    </div>
                  </motion.div>
                )}

                {!isLoginView && !isPasswordResetFlow && regStep === 'success' && (
                  <motion.div
                    key="success"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                      className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <Check size={32} />
                    </motion.div>
                    <p className="font-bold text-lg">Аккаунт создан!</p>
                    <p className="text-zinc-500 text-sm">Перенаправляем в профиль...</p>
                  </motion.div>
                )}

                {isPasswordResetFlow && resetStep === 'request_email' && (
                  <motion.div
                    key="reset_request_email"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-5"
                  >
                    <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">Ваш Email</label>
                    <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                      <input
                        autoFocus
                        name="reset-email"
                        autoComplete="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        type="email"
                        placeholder="name@example.com"
                        className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 text-zinc-900 outline-none"
                      />
                    </div>
                  </motion.div>
                )}

                {isPasswordResetFlow && resetStep === 'enter_code' && (
                  <motion.div
                    key="reset_enter_code"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4"
                  >
                    <div className="text-center mb-4">
                      <RefreshCcw size={48} className="mx-auto mb-4 text-zinc-400" />
                      <h3 className="text-xl font-bold mb-2">Введите код и новый пароль</h3>
                      <p className="text-zinc-500">
                        Мы отправили код восстановления на адрес{' '}
                        <span className="font-bold text-zinc-700">{resetEmail}</span>.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-2 ml-1">
                        Код восстановления
                      </label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          autoFocus
                          name="reset-code"
                          value={resetCode}
                          onChange={(e) => setResetCode(e.target.value)}
                          type="text"
                          placeholder="••••••"
                          className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Новый пароль</label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          name="new-password-reset"
                          autoComplete="new-password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-lime-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">
                        Повторите новый пароль
                      </label>
                      <div className="group relative rounded-xl bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-lime-400/50">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5" />
                        <input
                          name="confirm-new-password-reset"
                          autoComplete="new-password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="w-full bg-transparent rounded-xl pl-12 pr-12 py-3.5 outline-none"
                        />
                      </div>
                    </div>
                    <div className="text-xs space-y-1 pt-1 ml-1">
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          newPasswordValidation.hasLength ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 6 символов
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          newPasswordValidation.hasLowercase ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 1 строчная буква
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          newPasswordValidation.hasUppercase ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 1 заглавная буква
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          newPasswordValidation.hasSymbol ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Минимум 1 спец. символ
                      </p>
                      <p
                        className={`flex items-center gap-2 transition-colors ${
                          newPasswordValidation.hasMatch ? 'text-green-600' : 'text-zinc-400'
                        }`}
                      >
                        <Check size={14} /> Пароли совпадают
                      </p>
                    </div>
                  </motion.div>
                )}

                {isPasswordResetFlow && resetStep === 'reset_success' && (
                  <motion.div
                    key="reset_success"
                    variants={stepVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                      className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <ShieldCheck size={32} />
                    </motion.div>
                    <p className="font-bold text-lg">Пароль успешно сброшен!</p>
                    <p className="text-zinc-500 text-sm">Теперь вы можете войти с новым паролем.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              onClick={() => handleNextStep()}
              disabled={
                isLoading ||
                (!isLoginView && regStep === 'success') ||
                (isPasswordResetFlow && resetStep === 'reset_success') ||
                (regStep === 'confirm_email' && codeInputs.join('').length !== 6)
              }
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-lime-400 text-zinc-900 font-bold text-lg py-4 rounded-xl hover:bg-lime-500 transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-lime-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="animate-spin" />
              ) : isPasswordResetFlow ? (
                resetStep === 'request_email'
                  ? 'Отправить код'
                  : resetStep === 'enter_code'
                  ? 'Сбросить пароль'
                  : 'Готово'
              ) : isLoginView ? (
                'Войти'
              ) : regStep === 'confirm_email' ? (
                'Подтвердить'
              ) : regStep === 'email' ? (
                'Создать аккаунт'
              ) : regStep === 'success' ? (
                'Готово'
              ) : (
                'Далее'
              )}
              {!isLoading &&
                ((isLoginView && !isPasswordResetFlow) ||
                  (!isLoginView && regStep !== 'success' && regStep !== 'confirm_email')) && (
                  <ArrowRight size={20} />
                )}
            </motion.button>

            <div className="mt-8 text-center">
              <p className="text-sm text-zinc-500">
                {isLoginView && !isPasswordResetFlow
                  ? 'Нет аккаунта? '
                  : isPasswordResetFlow
                  ? 'Вспомнили пароль? '
                  : 'Уже есть аккаунт? '}
                <button
                  onClick={isLoginView && !isPasswordResetFlow ? switchToRegister : switchToLogin}
                  className="text-zinc-900 font-bold hover:text-lime-600 hover:underline transition-colors"
                >
                  {isLoginView && !isPasswordResetFlow
                    ? 'Зарегистрироваться'
                    : isPasswordResetFlow
                    ? 'Войти'
                    : 'Войти'}
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 text-center text-xs text-zinc-400 relative z-10">
          ECHO © 2026. <a href="#" className="underline hover:text-lime-600 transition-colors">Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}