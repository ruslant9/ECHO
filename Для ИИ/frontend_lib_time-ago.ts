// frontend/lib/time-ago.ts

export function formatTimeAgo(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'только что';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} ${getNounEnding(minutes, ['минуту', 'минуты', 'минут'])} назад`; 
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} ${getNounEnding(hours, ['час', 'часа', 'часов'])} назад`; 
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} ${getNounEnding(days, ['день', 'дня', 'дней'])} назад`; 
  }

  // Для более старых дат можно вернуть просто дату
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); 
}

function getNounEnding(number: number, endings: [string, string, string]): string {
  const cases = [2, 0, 1, 1, 1, 2];
  return endings[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
}