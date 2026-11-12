import { useSyncExternalStore } from 'react';
import type { CutId } from './data';

export interface Settings {
  enabled: Record<string, boolean>;
  wmPos: 'left' | 'center' | 'right';
  wmOpacity: number;
  wmEvent: boolean;
  tol: number; soft: number; spill: number;
  keyColor: string;                    // สีคีย์ (#RRGGBB)
  cut: CutId;
  fx: { wrap: boolean; shadow: boolean; color: boolean; blur: number };
  scales: Record<string, number>;      // ขนาดคนต่อฉาก
  countSec: number;
  camera: { source: 'auto' | 'device' | 'demo'; deviceId: string; res: '1080' | '4k' };
  publicBase: string;                  // ที่อยู่ที่มือถือเปิดได้ (ใช้สร้าง QR)
  thanksSec: number;
}

export const DEFAULTS: Settings = {
  enabled: {},
  wmPos: 'right', wmOpacity: 0.95, wmEvent: true,
  tol: 42, soft: 18, spill: 60, keyColor: '#00B140',
  cut: 'chroma',
  fx: { wrap: true, shadow: true, color: true, blur: 30 },
  scales: {},
  countSec: 3,
  camera: { source: 'auto', deviceId: '', res: '1080' },
  publicBase: '',
  thanksSec: 15
};

const KEY = 'photobooth.settings.v1';
let current: Settings = load();
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') {
      return { ...DEFAULTS, ...raw, fx: { ...DEFAULTS.fx, ...raw.fx }, camera: { ...DEFAULTS.camera, ...raw.camera } };
    }
  } catch { /* ใช้ค่าเริ่มต้น */ }
  return DEFAULTS;
}

export function updateSettings(patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) {
  current = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* เต็ม/ถูกบล็อก */ }
  listeners.forEach(l => l());
}
export const getSettings = () => current;
export function useSettings(): Settings {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, getSettings);
}
export const isEnabled = (s: Settings, id: string) => s.enabled[id] ?? true;
export const scaleOf = (s: Settings, id: string) => s.scales[id] ?? 1;
export const baseUrl = (s: Settings) => (s.publicBase.trim() || location.origin).replace(/\/+$/, '');
