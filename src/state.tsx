import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_BGS, type Bg, type Mode } from './data';
import { api, bgUrl, type CustomBg, type Shot } from './api';
import { isEnabled, useSettings } from './settings';

export type Screen = 'welcome' | 'select' | 'live' | 'preview' | 'thanks' | 'gallery' | 'admin';

interface Ctx {
  screen: Screen;
  go: (s: Screen) => void;
  mode: Mode; setMode: (m: Mode) => void;
  bgId: string; setBgId: (id: string) => void;
  allBgs: Bg[];                  // ทุกฉาก (รวมที่ปิดอยู่) ใช้ในหลังบ้านและแสดงภาพเก่า
  bgs: Bg[];                     // เฉพาะฉากที่เปิดให้ลูกค้าเลือก
  bg: Bg;
  bgById: (id: string) => Bg;
  code: string;                  // รหัสคิวของลูกค้าปัจจุบัน ('' = ยังโหลดไม่ได้)
  nextCode: string;
  shots: Shot[];                 // ภาพของลูกค้าปัจจุบัน
  serverError: string;
  addShot: (s: Shot) => void;
  retake: () => Promise<void>;
  nextCustomer: () => Promise<void>;
  reloadBgs: () => Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const v = useContext(AppCtx);
  if (!v) throw new Error('useApp ต้องอยู่ใน <AppProvider>');
  return v;
};

const pad = (n: number) => String(n).padStart(4, '0');
const DEFAULT_BG_ID = 'arch';

export function AppProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [screen, setScreen] = useState<Screen>('welcome');
  const [mode, setMode] = useState<Mode>('full');
  const [bgId, setBgId] = useState(DEFAULT_BG_ID);
  const [code, setCode] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [custom, setCustom] = useState<CustomBg[]>([]);
  const [serverError, setServerError] = useState('');

  const loadSession = useCallback(async (c: string) => {
    try { setShots((await api.session(c)).shots); } catch { /* ใช้ค่าเดิม */ }
  }, []);

  const reloadBgs = useCallback(async () => {
    try { setCustom((await api.backgrounds()).backgrounds); } catch { /* ใช้ฉากเริ่มต้น */ }
  }, []);

  useEffect(() => {
    api.state().then(async s => { setCode(s.code); setServerError(''); await loadSession(s.code); })
      .catch(() => setServerError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (รัน `npm run dev` หรือ `npm start` หรือยัง?)'));
    reloadBgs();
  }, [loadSession, reloadBgs]);

  const allBgs = useMemo<Bg[]>(() => [
    ...DEFAULT_BGS,
    ...custom.map(c => ({ id: c.id, name: c.name, a: '#8a8fa0', b: '#4a4e5c', image: bgUrl(c.id) }))
  ], [custom]);
  const bgs = useMemo(() => allBgs.filter(b => isEnabled(settings, b.id)), [allBgs, settings]);
  const bgById = useCallback((id: string) => allBgs.find(b => b.id === id) ?? allBgs[0], [allBgs]);
  const bg = bgs.find(b => b.id === bgId) ?? bgs[0] ?? allBgs[0];

  const nextCustomer = useCallback(async () => {
    try {
      const s = await api.next();
      setCode(s.code); setShots([]); setServerError('');
    } catch { setServerError('เปลี่ยนคิวไม่สำเร็จ: เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    setMode('full'); setBgId(DEFAULT_BG_ID); setScreen('welcome');
  }, []);

  const retake = useCallback(async () => {
    const last = shots[shots.length - 1];
    if (last) { try { await api.removePhoto(last.id); } catch { /* ลบไม่สำเร็จ ภาพยังอยู่ในเซิร์ฟเวอร์ */ } setShots(s => s.slice(0, -1)); }
    setScreen('live');
  }, [shots]);

  const value: Ctx = {
    screen, go: setScreen, mode, setMode, bgId, setBgId, allBgs, bgs, bg, bgById,
    code, nextCode: code ? pad(parseInt(code, 10) + 1) : '', shots, serverError,
    addShot: s => setShots(x => [...x, s]), retake, nextCustomer, reloadBgs
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
