export function formatViewsCount(count: number | null | undefined): string {
  if (!count) return '0';
  
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'М';
  }
  
  if (count >= 10000) {
    return (count / 1000).toFixed(1) + 'к';
  }
  
  return count.toString();
}