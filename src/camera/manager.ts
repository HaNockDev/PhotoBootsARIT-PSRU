import { useSyncExternalStore } from 'react';
import { PERSON_PATH } from '../data';
import type { Settings } from '../settings';

export type FrameSource = HTMLVideoElement | HTMLCanvasElement;
export interface CamStatus {
  state: 'idle' | 'starting' | 'live' | 'demo' | 'error';
  message: string;
  label: string;        // ชื่ออุปกรณ์
  width: number; height: number; fps: number;
  devices: { id: string; label: string }[];
}

const status: CamStatus = { state: 'idle', message: '', label: '', width: 0, height: 0, fps: 0, devices: [] };
let snapshot: CamStatus = { ...status };
const listeners = new Set<() => void>();
const emit = (p: Partial<CamStatus>) => { Object.assign(status, p); snapshot = { ...status }; listeners.forEach(l => l()); };

let video: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let demo: ReturnType<typeof makeDemo> | null = null;
let current: FrameSource | null = null;
let startToken = 0;
let lastKey = '';

export const getSource = (): FrameSource | null => current;
export const useCamStatus = () => useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => snapshot);

export async function refreshDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    const devices = all.filter(d => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || `กล้อง ${i + 1}` }));
    emit({ devices });
  } catch { /* ไม่รองรับ */ }
}

function stopStream() {
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
  if (video) video.srcObject = null;
}

/** เริ่ม/เปลี่ยนแหล่งภาพ ถ้าตั้งค่าไม่เปลี่ยนจะไม่ทำซ้ำ (force = เชื่อมต่อใหม่) */
export async function startCamera(cam: Settings['camera'], force = false) {
  const key = `${cam.source}|${cam.deviceId}|${cam.res}`;
  if (!force && key === lastKey && (status.state === 'live' || status.state === 'demo' || status.state === 'starting')) return;
  lastKey = key;
  const token = ++startToken;

  stopStream();
  if (cam.source === 'demo') return useDemo('โหมดสาธิต (เลือกไว้ในหลังบ้าน)');

  if (!navigator.mediaDevices?.getUserMedia) {
    return useDemo('เบราว์เซอร์นี้ไม่รองรับกล้อง (ต้องเปิดผ่าน https หรือ localhost) จึงใช้โหมดสาธิต', 'error');
  }
  emit({ state: 'starting', message: 'กำลังเชื่อมต่อกล้อง…' });
  const [w, h] = cam.res === '4k' ? [3840, 2160] : [1920, 1080];
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { ...(cam.deviceId ? { deviceId: { exact: cam.deviceId } } : {}), width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: 30 } }
    });
    if (token !== startToken) { s.getTracks().forEach(t => t.stop()); return; }
    stream = s;
    video ||= Object.assign(document.createElement('video'), { muted: true, playsInline: true, autoplay: true });
    video.srcObject = s;
    await video.play();
    if (token !== startToken) return;
    demo?.stop(); demo = null;
    current = video;
    const track = s.getVideoTracks()[0];
    const st = track.getSettings();
    track.addEventListener('ended', () => {
      if (token === startToken) useDemo('กล้องหลุดการเชื่อมต่อ ตรวจสอบสาย HDMI/USB แล้วกด "เชื่อมต่อใหม่"', 'error');
    });
    emit({ state: 'live', message: '', label: track.label || 'กล้อง', width: st.width || video.videoWidth, height: st.height || video.videoHeight, fps: Math.round(st.frameRate || 0) });
    refreshDevices();
  } catch (e) {
    if (token !== startToken) return;
    const err = e as DOMException;
    const msg = err.name === 'NotAllowedError' ? 'ไม่ได้รับอนุญาตให้ใช้กล้อง (กดอนุญาตที่แถบที่อยู่ของเบราว์เซอร์)'
      : err.name === 'NotFoundError' || err.name === 'OverconstrainedError' ? 'ไม่พบกล้อง/Capture Card ที่เลือก ตรวจสอบสายและการเลือกอุปกรณ์'
      : `เปิดกล้องไม่สำเร็จ: ${err.message || err.name}`;
    useDemo(msg + ' · ใช้โหมดสาธิตแทน', 'error');
    refreshDevices();
  }
}

function useDemo(message: string, kind: 'demo' | 'error' = 'demo') {
  stopStream();
  demo ||= makeDemo();
  current = demo.canvas;
  emit({ state: kind === 'error' ? 'error' : 'demo', message, label: 'โหมดสาธิต', width: demo.canvas.width, height: demo.canvas.height, fps: 30 });
}

/** วิดีโอสาธิต: ฉากเขียวกับคนตัวอย่างขยับเล็กน้อย ใช้ทดสอบระบบโดยไม่ต้องมีกล้อง */
function makeDemo() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280; canvas.height = 720;
  const ctx = canvas.getContext('2d')!;
  const path = new Path2D(PERSON_PATH);
  let raf = 0; const t0 = performance.now();
  const draw = (now: number) => {
    const t = (now - t0) / 1000;
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#09b845'); g.addColorStop(1, '#00a03a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + Math.sin(t * 0.9) * 14, 60);
    ctx.scale(3.5, 3.5);
    ctx.fillStyle = '#4a4152';
    ctx.beginPath(); ctx.arc(0, 14, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fill(path);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 22px sans-serif';
    ctx.fillText('DEMO', 24, 40);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return { canvas, stop: () => cancelAnimationFrame(raf) };
}

export const frameSize = (src: FrameSource) =>
  src instanceof HTMLVideoElement ? { w: src.videoWidth, h: src.videoHeight } : { w: src.width, h: src.height };
