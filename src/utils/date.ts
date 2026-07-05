export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '无时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTimelineGroup(iso: string): '今天' | '昨天' | '本周' | '更早' {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((todayStart - targetStart) / 86400000);

  if (diffDays <= 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays <= 7) return '本周';
  return '更早';
}
