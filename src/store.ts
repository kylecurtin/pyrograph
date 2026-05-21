import { create } from 'zustand';

interface AppState {
  /** Right edge of the time window (newest). Always = now in v1. */
  tNow: number;
  /** Width of the window in ms (default 24h). */
  windowMs: number;
  /** Position of the time cursor, 0..1 across the window. 1 = now. */
  cursorPct: number;

  selectedIncidentId: string | null;
  hoveredIncidentId: string | null;

  showDetections: boolean;
  showAlerts: boolean;
  showCanada: boolean;

  setCursor: (pct: number) => void;
  setNow: (t: number) => void;
  selectIncident: (id: string | null) => void;
  hoverIncident: (id: string | null) => void;
  toggle: (key: 'showDetections' | 'showAlerts' | 'showCanada') => void;
}

export const useApp = create<AppState>((set) => ({
  tNow: Date.now(),
  windowMs: 24 * 60 * 60 * 1000,
  cursorPct: 1,
  selectedIncidentId: null,
  hoveredIncidentId: null,
  showDetections: true,
  showAlerts: true,
  showCanada: true,
  setCursor: (pct) => set({ cursorPct: Math.max(0, Math.min(1, pct)) }),
  setNow: (t) => set({ tNow: t }),
  selectIncident: (id) => set({ selectedIncidentId: id }),
  hoverIncident: (id) => set({ hoveredIncidentId: id }),
  toggle: (key) => set((s) => ({ [key]: !s[key] } as Partial<AppState>)),
}));

/** Time value at the current cursor position (ms epoch). */
export const cursorTimeMs = (s: AppState) => s.tNow - (1 - s.cursorPct) * s.windowMs;
