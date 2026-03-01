import { useRef, useCallback } from 'react';
import { ClipboardPaste } from 'lucide-react';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  expirationTimer: number;
  resendCooldown: number;
  onResend: () => void;
  onError: (msg: string) => void;
}

export default function OTPInput({ value, onChange, expirationTimer, resendCooldown, onResend, onError }: OTPInputProps) {
  const codeInputs = value.split('').concat(Array(6 - value.length).fill(''));
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= 1) {
      const newCode = [...codeInputs];
      newCode[index] = val;
      onChange(newCode.join(''));
      if (val && index < 5) codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeInputs[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement> | string) => {
    const pastedData = typeof e === 'string' ? e : e.clipboardData.getData('text').trim();
    const digits = pastedData.replace(/\D/g, '').substring(0, 6);
    onChange(digits);
    if (digits.length > 0) {
      const lastFilledIndex = Math.min(digits.length - 1, 5);
      setTimeout(() => codeInputRefs.current[lastFilledIndex]?.focus(), 50);
    }
  }, [onChange]);

  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        handlePaste(text);
      } else {
        onError('Ваш браузер не поддерживает автоматическую вставку.');
      }
    } catch (err) {
      onError('Не удалось прочитать из буфера обмена.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2 mb-4">
        {codeInputs.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { codeInputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            // Убрали focus:ring-2 focus-within:ring-lime-400/50. Добавили cursor-pointer и focus:cursor-text
            className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-zinc-300 bg-white shadow-sm outline-none transition-all cursor-pointer focus:cursor-text"
            autoFocus={index === 0}
          />
        ))}
      </div>

      {expirationTimer > 0 ? (
        <p className="text-sm text-zinc-500 mb-4">
          Код истечет через: <span className="font-bold text-red-500">{Math.floor(expirationTimer / 60).toString().padStart(2, '0')}:{(expirationTimer % 60).toString().padStart(2, '0')}</span>
        </p>
      ) : (
        <p className="text-sm text-red-500 mb-4 font-bold">Срок действия кода истек!</p>
      )}

      <div className="flex justify-center items-center gap-4">
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0}
          className={`text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${resendCooldown > 0 ? 'text-zinc-400 cursor-not-allowed' : 'text-lime-600 hover:underline'}`}
        >
          {resendCooldown > 0 ? `Отправить код повторно через ${resendCooldown}с` : 'Отправить код повторно'}
        </button>
        <button type="button" onClick={handlePasteButtonClick} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-2 cursor-pointer">
          <ClipboardPaste size={16} /> Вставить код
        </button>
      </div>
    </div>
  );
}