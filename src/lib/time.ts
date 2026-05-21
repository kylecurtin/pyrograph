export function fmtRelative(d: Date | null, now = Date.now()): string {
  if (!d) return '—';
  const ms = now - d.getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const dd = Math.round(h / 24);
  return `${dd}d ago`;
}

export function fmtClock(t: number | Date): string {
  const d = typeof t === 'number' ? new Date(t) : t;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fmtDate(t: number | Date): string {
  const d = typeof t === 'number' ? new Date(t) : t;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function fmtAcres(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toLocaleString();
}
