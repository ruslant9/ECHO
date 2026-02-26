'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { gql, useQuery, useMutation } from '@apollo/client';
import { Laptop, Smartphone, MapPin, Clock, ShieldCheck, KeyRound, Check, AlertCircle, Loader, LogOut, Trash2, ShieldAlert } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import Toast from '@/components/Toast';
import { formatTimeAgo } from '@/lib/time-ago';
import PasswordPromptModal from '@/components/PasswordPromptModal'; 
import DeleteAccountModal from '@/components/DeleteAccountModal';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// ... (GraphQL Queries & Mutations остаются без изменений)
const GET_MY_SESSIONS = gql`
  query GetMySessions {
    mySessions { id ip city device os browser lastActive isCurrent }
    me { id email }
  }
`;
const CHANGE_PASSWORD = gql`mutation ChangePassword($input: ChangePasswordInput!) { changePassword(input: $input) }`;
const REQUEST_RESET = gql`mutation RequestPasswordResetSettings($email: String!) { requestPasswordReset(requestPasswordResetInput: { email: $email }) { emailSent } }`;
const RESET_PASSWORD = gql`mutation ResetPasswordSettings($email: String!, $code: String!, $newPassword: String!) { resetPassword(resetPasswordInput: { email: $email, code: $code, newPassword: $newPassword }) }`;
const TERMINATE_SESSION = gql`mutation TerminateSession($sessionId: Int!, $password: String!) { terminateSession(sessionId: $sessionId, password: $password) }`;
const TERMINATE_ALL_OTHERS = gql`mutation TerminateAllOtherSessions($password: String!) { terminateAllOtherSessions(password: $password) }`;
const DELETE_MY_ACCOUNT = gql`mutation DeleteMyAccount($password: String!) { deleteMyAccount(password: $password) }`;

type PasswordMode = 'remember' | 'forgot' | null;
type ResetStep = 'email_confirm' | 'code_enter';

const PasswordChecklist = ({ validation }: { validation: any }) => (
  <div className="text-xs space-y-1 pt-3 ml-1">
    <p className={`flex items-center gap-2 transition-colors ${validation.hasLength ? 'text-green-600' : 'text-zinc-400'}`}><Check size={14}/> Минимум 6 символов</p>
    <p className={`flex items-center gap-2 transition-colors ${validation.hasLowercase ? 'text-green-600' : 'text-zinc-400'}`}><Check size={14}/> Минимум 1 строчная буква</p>
    <p className={`flex items-center gap-2 transition-colors ${validation.hasUppercase ? 'text-green-600' : 'text-zinc-400'}`}><Check size={14}/> Минимум 1 заглавная буква</p>
    <p className={`flex items-center gap-2 transition-colors ${validation.hasSymbol ? 'text-green-600' : 'text-zinc-400'}`}><Check size={14}/> Минимум 1 спец. символ</p>
    <p className={`flex items-center gap-2 transition-colors ${validation.hasMatch ? 'text-green-600' : 'text-zinc-400'}`}><Check size={14}/> Пароли совпадают</p>
  </div>
);

export default function SecuritySettings() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [authAction, setAuthAction] = useState<{ type: 'SINGLE' | 'ALL'; sessionId?: number; isOpen: boolean; }>({ type: 'SINGLE', isOpen: false });
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [passMode, setPassMode] = useState<PasswordMode>(null);
  
  // "I remember" state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // "I forgot" state
  const [resetStep, setResetStep] = useState<ResetStep>('email_confirm');
  const [inputEmail, setInputEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_MY_SESSIONS, { fetchPolicy: 'network-only' });
  
  const [changePassword, { loading: changing }] = useMutation(CHANGE_PASSWORD);
  const [requestReset, { loading: requesting }] = useMutation(REQUEST_RESET);
  const [resetPass, { loading: resetting }] = useMutation(RESET_PASSWORD);
  const [terminateSession, { loading: termLoading }] = useMutation(TERMINATE_SESSION);
  const [terminateAllOthers, { loading: termAllLoading }] = useMutation(TERMINATE_ALL_OTHERS);
  const [deleteMyAccount, { loading: deletingAccount }] = useMutation(DELETE_MY_ACCOUNT);

  const passwordValidation = useMemo(() => {
    const hasLength = newPassword.length >= 6;
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(newPassword);
    const hasMatch = newPassword !== '' && newPassword === confirmPassword;
    return { hasLength, hasLowercase, hasUppercase, hasSymbol, hasMatch };
  }, [newPassword, confirmPassword]);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const resetPasswordValidation = useMemo(() => {
    const hasLength = resetNewPass.length >= 6;
    const hasLowercase = /[a-z]/.test(resetNewPass);
    const hasUppercase = /[A-Z]/.test(resetNewPass);
    const hasSymbol = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\-]/.test(resetNewPass);
    const hasMatch = resetNewPass !== '' && resetNewPass === resetConfirmPass;
    return { hasLength, hasLowercase, hasUppercase, hasSymbol, hasMatch };
  }, [resetNewPass, resetConfirmPass]);
  const isResetPasswordValid = Object.values(resetPasswordValidation).every(Boolean);

  const sessions = data?.mySessions || [];
  const userEmail = data?.me?.email || '';

  const getMaskedEmail = (email: string) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (name.length <= 2) return email;
    return `${name[0]}.......${name[name.length - 1]}@${domain}`;
  };

  const onTerminateClick = (sessionId: number) => { setAuthAction({ type: 'SINGLE', sessionId, isOpen: true }); };
  const onTerminateAllClick = () => { setAuthAction({ type: 'ALL', isOpen: true }); };

  const handleAuthConfirm = async (password: string) => {
    try {
      if (authAction.type === 'SINGLE' && authAction.sessionId) {
        await terminateSession({ variables: { sessionId: authAction.sessionId, password } });
        setToast({ message: 'Сессия успешно завершена', type: 'success' });
      } else {
        await terminateAllOthers({ variables: { password } });
        setToast({ message: 'Все остальные сессии завершены', type: 'success' });
      }
      setAuthAction({ ...authAction, isOpen: false });
      refetch();
    } catch (e: any) {
      setToast({ message: e.message || 'Неверный пароль', type: 'error' });
    }
  };

  const handleChangePassword = async () => {
    if (!isPasswordValid) { setToast({ message: 'Новый пароль не соответствует требованиям', type: 'error' }); return; }
    try {
      await changePassword({ variables: { input: { oldPassword, newPassword } } });
      setToast({ message: 'Пароль успешно изменен', type: 'success' });
      setPassMode(null);
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      setToast({ message: e.message || 'Ошибка смены пароля', type: 'error' });
    }
  };

  const handleRequestReset = async () => {
    if (inputEmail.toLowerCase() !== userEmail.toLowerCase()) { setToast({ message: 'Email не совпадает с вашим текущим email', type: 'error' }); return; }
    try {
      await requestReset({ variables: { email: userEmail } });
      setResetStep('code_enter');
      setToast({ message: 'Код отправлен на вашу почту', type: 'success' });
    } catch (e: any) {
      setToast({ message: e.message, type: 'error' });
    }
  };

  const handleResetSubmit = async () => {
    if (!isResetPasswordValid) { setToast({ message: 'Новый пароль не соответствует требованиям', type: 'error' }); return; }
    try {
        await resetPass({ variables: { email: userEmail, code: resetCode, newPassword: resetNewPass } });
        setToast({ message: 'Пароль успешно восстановлен и изменен', type: 'success' });
        setPassMode(null);
        setResetStep('email_confirm');
        setResetCode(''); setResetNewPass(''); setResetConfirmPass(''); setInputEmail('');
    } catch (e: any) {
        setToast({ message: e.message || 'Ошибка сброса', type: 'error' });
    }
  };

  const handleConfirmDeleteAccount = async (password: string) => {
    try {
      await deleteMyAccount({ variables: { password } });
      setToast({ message: 'Аккаунт успешно удален.', type: 'success' });
      Cookies.remove('token'); Cookies.remove('user'); router.push('/');
    } catch (e: any) {
      setToast({ message: e.message || 'Ошибка удаления аккаунта', type: 'error' });
    } finally {
      setIsDeleteAccountModalOpen(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <PasswordPromptModal 
        isOpen={authAction.isOpen}
        onClose={() => setAuthAction({ ...authAction, isOpen: false })}
        onConfirm={handleAuthConfirm}
        isLoading={termLoading || termAllLoading}
        title="Требуется подтверждение"
        message={authAction.type === 'ALL' ? "Для завершения всех сессий введите ваш пароль." : "Для завершения этой сессии введите ваш пароль."}
      />
      
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirmDelete={handleConfirmDeleteAccount}
        isLoading={deletingAccount}
      />

      {/* --- ACTIVE SESSIONS --- */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
            <Laptop size={20} className="text-lime-500" />
            Активные сессии
            </h2>
            
            {sessions.length > 1 && (
                // Кнопка "Завершить все другие" -> cursor-pointer
                <button 
                    onClick={onTerminateAllClick} 
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-2 cursor-pointer
                    ${isDarkMode ? 'border-red-900/50 bg-red-900/10 text-red-400 hover:bg-red-900/30' : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'}`}
                >
                    <Trash2 size={14} />
                    Завершить все другие
                </button>
            )}
        </div>

        <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          {sessions.length === 0 ? (
             <div className="p-6 text-center text-zinc-500">Нет данных о сессиях</div>
          ) : (
             sessions.map((session: any) => (
                <div key={session.id} className={`p-4 flex items-center justify-between border-b last:border-0 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                         {session.device === 'Mobile' ? <Smartphone size={24} /> : <Laptop size={24} />}
                      </div>
                      <div>
                         <div className="font-bold text-sm flex items-center gap-2">
                            {session.os || 'Unknown OS'} • {session.browser || 'Unknown Browser'}
                            {session.isCurrent && (
                                <span className="bg-lime-400 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">ЭТО УСТРОЙСТВО</span>
                            )}
                         </div>
                         <div className="text-xs text-zinc-500 flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1"><MapPin size={12} /> {session.city || 'Неизвестно'}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> Активен {formatTimeAgo(session.lastActive)}</span>
                            <span className="hidden sm:inline text-zinc-600">IP: {session.ip}</span>
                         </div>
                      </div>
                   </div>
                   
                   {!session.isCurrent && (
                       // Кнопка завершения сессии -> cursor-pointer
                       <button 
                           onClick={() => onTerminateClick(session.id)}
                           className={`p-2 rounded-xl transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-500 hover:bg-zinc-800 hover:text-red-400' : 'text-zinc-400 hover:bg-zinc-100 hover:text-red-500'}`}
                           title="Завершить сессию"
                       >
                           <LogOut size={18} />
                       </button>
                   )}
                </div>
             ))
          )}
        </div>
      </section>

      {/* --- CHANGE PASSWORD --- */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-lime-500" />
          Смена пароля
        </h2>
        
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
           {!passMode ? (
               <div className="flex flex-col sm:flex-row gap-4">
                   {/* Кнопки выбора режима смены пароля -> cursor-pointer */}
                   <button 
                      onClick={() => setPassMode('remember')}
                      className={`flex-1 p-4 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all cursor-pointer
                        ${isDarkMode ? 'border-zinc-700 hover:border-lime-500 hover:bg-zinc-800' : 'border-zinc-300 hover:border-lime-500 hover:bg-zinc-50'}
                      `}
                   >
                       <KeyRound size={32} className="text-lime-500" />
                       <span className="font-bold">Я помню текущий пароль</span>
                   </button>
                   <button 
                      onClick={() => setPassMode('forgot')}
                      className={`flex-1 p-4 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all cursor-pointer
                        ${isDarkMode ? 'border-zinc-700 hover:border-red-500 hover:bg-zinc-800' : 'border-zinc-300 hover:border-red-500 hover:bg-zinc-50'}
                      `}
                   >
                       <AlertCircle size={32} className="text-red-500" />
                       <span className="font-bold">Я забыл пароль</span>
                   </button>
               </div>
           ) : (
               <div className="max-w-md">
                   {/* ... поля ввода паролей ... */}
                   {passMode === 'remember' && (
                       <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                           <h3 className="font-bold text-lg mb-2">Изменение пароля</h3>
                           <div>
                               <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Старый пароль</label>
                               <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={`w-full p-3 rounded-xl border bg-transparent outline-none ${isDarkMode ? 'border-zinc-700 focus:border-lime-400' : 'border-zinc-200 focus:border-lime-500'}`} />
                           </div>
                           <div>
                               <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Новый пароль</label>
                               <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`w-full p-3 rounded-xl border bg-transparent outline-none ${isDarkMode ? 'border-zinc-700 focus:border-lime-400' : 'border-zinc-200 focus:border-lime-500'}`} />
                           </div>
                           <div>
                               <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Повторите новый пароль</label>
                               <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full p-3 rounded-xl border bg-transparent outline-none ${isDarkMode ? 'border-zinc-700 focus:border-lime-400' : 'border-zinc-200 focus:border-lime-500'}`} />
                           </div>
                           {newPassword && <PasswordChecklist validation={passwordValidation} />}
                           <div className="flex gap-3 pt-2">
                               <button onClick={handleChangePassword} disabled={!oldPassword || !isPasswordValid || changing} className="cursor-pointer px-6 py-2 bg-lime-400 text-black rounded-lg font-bold hover:bg-lime-500 disabled:opacity-50 transition-colors">
                                  {changing ? <Loader size={20} className="animate-spin" /> : 'Сохранить'}
                               </button>
                               <button onClick={() => setPassMode(null)} className={`cursor-pointer px-6 py-2 rounded-lg font-bold transition-colors ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>Отмена</button>
                           </div>
                       </div>
                   )}

                   {passMode === 'forgot' && (
                       <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                           {resetStep === 'email_confirm' ? (
                               <>
                                   <h3 className="font-bold text-lg">Восстановление доступа</h3>
                                   <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        Для подтверждения личности введите вашу почту.
                                        <br/>Подсказка: <span className={`font-mono px-1 rounded ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'}`}>{getMaskedEmail(userEmail)}</span>
                                   </p>
                                   <div>
                                       <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Ваш Email</label>
                                       <input type="email" value={inputEmail} onChange={e => setInputEmail(e.target.value)} className={`w-full p-3 rounded-xl border bg-transparent outline-none ${isDarkMode ? 'border-zinc-700 focus:border-lime-400' : 'border-zinc-200 focus:border-lime-500'}`} placeholder="name@example.com" />
                                   </div>
                                   <div className="flex gap-3 pt-2">
                                       <button onClick={handleRequestReset} disabled={requesting || !inputEmail} className="cursor-pointer px-6 py-2 bg-lime-400 text-black rounded-lg font-bold hover:bg-lime-500 disabled:opacity-50 transition-colors">
                                          {requesting ? <Loader size={20} className="animate-spin" /> : 'Получить код'}
                                       </button>
                                       <button onClick={() => setPassMode(null)} className={`cursor-pointer px-6 py-2 rounded-lg font-bold transition-colors ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>Отмена</button>
                                   </div>
                               </>
                           ) : (
                               <>
                                   <h3 className="font-bold text-lg">Смена пароля</h3>
                                   <p className="text-sm text-zinc-500">Код отправлен на {userEmail}</p>
                                   {/* ... поля ввода кода и нового пароля ... */}
                                   <div>
                                       <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Код из письма</label>
                                       <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value)} className={`w-full p-3 rounded-xl border bg-transparent outline-none text-center tracking-widest text-lg font-bold ${isDarkMode ? 'border-zinc-700 focus:border-lime-400' : 'border-zinc-200 focus:border-lime-500'}`} placeholder="XXXXXX" />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Новый пароль</label>
                                       <input type="password" value={resetNewPass} onChange={e => setResetNewPass(e.target.value)} className={`w-full p-3 rounded-xl border bg-transparent outline-none ${isDarkMode ? 'border-zinc-700 focus:border-lime-400' : 'border-zinc-200 focus:border-lime-500'}`} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold uppercase mb-1 text-zinc-500">Повторите пароль</label>
                                       <input type="password" value={resetConfirmPass} onChange={e => setResetConfirmPass(e.target.value)} className={`w-full p-3 rounded-xl border bg-transparent outline-none ${isDarkMode ? 'border-zinc-700 focus:border-lime-400' : 'border-zinc-200 focus:border-lime-500'}`} />
                                   </div>
                                   {resetNewPass && <PasswordChecklist validation={resetPasswordValidation} />}
                                   <div className="flex gap-3 pt-2">
                                       <button onClick={handleResetSubmit} disabled={resetting || !resetCode || !isResetPasswordValid} className="cursor-pointer px-6 py-2 bg-lime-400 text-black rounded-lg font-bold hover:bg-lime-500 disabled:opacity-50 transition-colors">
                                          {resetting ? <Loader size={20} className="animate-spin" /> : 'Сменить пароль'}
                                       </button>
                                       <button onClick={() => setResetStep('email_confirm')} className={`cursor-pointer px-6 py-2 rounded-lg font-bold transition-colors ${isDarkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}>Назад</button>
                                   </div>
                               </>
                           )}
                       </div>
                   )}
               </div>
           )}
        </div>
      </section>

      {/* --- DANGER ZONE --- */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
          <ShieldAlert size={20} className="text-red-500" />
          Опасная зона
        </h2>
        <div className={`p-6 rounded-2xl border border-red-500/30 ${isDarkMode ? 'bg-red-900/10' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-red-500">Удалить мой аккаунт</h3>
              <p className="text-sm text-red-400">
                Это действие безвозвратно удалит ваш аккаунт и все связанные данные.
              </p>
            </div>
            {/* Кнопка Удалить аккаунт -> cursor-pointer */}
            <button
              onClick={() => setIsDeleteAccountModalOpen(true)}
              className="cursor-pointer px-6 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}