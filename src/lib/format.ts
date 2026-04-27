export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// 解決原生 select 中英混排對齊：ASCII 算 1，全形字算 2，
// 用 　 (全形空格 = 2) 與   (不換行半形 = 1) 補齊到 targetLen。
export function padMealName(name: string, targetLen = 22): string {
  let len = 0;
  for (let i = 0; i < name.length; i++) {
    len += name.charCodeAt(i) > 255 ? 2 : 1;
  }
  const diff = targetLen - len;
  if (diff <= 0) return name + ' ';
  const fullSpaces = Math.floor(diff / 2);
  const halfSpaces = diff % 2;
  return name + '　'.repeat(fullSpaces) + ' '.repeat(halfSpaces);
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return '已截止';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `剩 ${days} 天 ${hours} 小時`;
  if (hours > 0) return `剩 ${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  return `剩 ${minutes}:${pad2(seconds)}`;
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
