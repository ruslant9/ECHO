/**
 * Преобразует относительный путь аватара в полный URL бэкенда
 * @param url - Относительный путь (например, /uploads/avatars/...) или полный URL
 * @returns Полный URL для загрузки изображения
 */
export function getAvatarUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Data URI — возвращаем как есть (валидный src для img)
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Полный URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Сырая base64 без префикса даёт ERR_INVALID_URL — не используем как путь
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 50) {
    return null;
  }

  // Относительный путь — добавляем базовый URL бэкенда
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3400';
  return `${baseUrl}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}
