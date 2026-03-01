import { Check } from 'lucide-react';

interface PasswordChecklistProps {
  validation: {
    hasLength: boolean;
    hasLowercase: boolean;
    hasUppercase: boolean;
    hasSymbol: boolean;
    hasMatch: boolean;
  };
}

export default function PasswordChecklist({ validation }: PasswordChecklistProps) {
  return (
    <div className="text-xs space-y-1 pt-1 ml-1">
      <p className={`flex items-center gap-2 transition-colors ${validation.hasLength ? 'text-green-600' : 'text-zinc-400'}`}>
        <Check size={14} /> Минимум 6 символов
      </p>
      <p className={`flex items-center gap-2 transition-colors ${validation.hasLowercase ? 'text-green-600' : 'text-zinc-400'}`}>
        <Check size={14} /> Минимум 1 строчная буква
      </p>
      <p className={`flex items-center gap-2 transition-colors ${validation.hasUppercase ? 'text-green-600' : 'text-zinc-400'}`}>
        <Check size={14} /> Минимум 1 заглавная буква
      </p>
      <p className={`flex items-center gap-2 transition-colors ${validation.hasSymbol ? 'text-green-600' : 'text-zinc-400'}`}>
        <Check size={14} /> Минимум 1 спец. символ
      </p>
      <p className={`flex items-center gap-2 transition-colors ${validation.hasMatch ? 'text-green-600' : 'text-zinc-400'}`}>
        <Check size={14} /> Пароли совпадают
      </p>
    </div>
  );
}