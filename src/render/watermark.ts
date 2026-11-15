import { EVENT_NAME, UNI_NAME } from '../data';
import type { Settings } from '../settings';

let logo: HTMLImageElement | null = null;
const logoReady = new Promise<void>(res => {
  const i = new Image();
  i.src = '/assets/logo_psru.png';
  i.onload = () => { logo = i; res(); };
  i.onerror = () => res();
});

export const ensureWatermarkAssets = async () => {
  await logoReady;
  try {
    await Promise.all(['600 20px "IBM Plex Sans Thai"', '500 20px "IBM Plex Sans Thai"'].map(f => document.fonts.load(f, 'ก')));
  } catch { /* ใช้ฟอนต์สำรอง */ }
};

/** ลายน้ำแบบไม่มีกรอบ เหมือนใน Composite v3 (หน่วย cqw = ความกว้าง/100) */
export function drawWatermark(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  s: Pick<Settings, 'wmPos' | 'wmOpacity' | 'wmEvent'>
) {
  if (!logo) return;
  const u = w / 100;
  const family = '"IBM Plex Sans Thai", sans-serif';
  const logoH = 6 * u;
  const logoW = (logoH * logo.width) / logo.height;
  const gap = 1.4 * u;
  const f1 = `600 ${2.1 * u}px ${family}`;
  const f2 = `500 ${1.5 * u}px ${family}`;

  ctx.save();
  ctx.font = f1;
  const w1 = ctx.measureText(UNI_NAME).width;
  let w2 = 0;
  if (s.wmEvent) { ctx.font = f2; w2 = ctx.measureText(EVENT_NAME).width; }
  const total = logoW + gap + Math.max(w1, w2);
  const left = 3.5 * u;
  const right = w - 3.5 * u;
  const x0 = s.wmPos === 'left' ? left : s.wmPos === 'center' ? (w - total) / 2 : right - total;
  const bottom = h - 3 * u;

  ctx.globalAlpha = s.wmOpacity;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 0.6 * u;
  ctx.shadowOffsetY = 0.2 * u;
  ctx.drawImage(logo, x0, bottom - logoH, logoW, logoH);

  const tx = x0 + logoW + gap;
  const lineH1 = 2.1 * u * 1.2;
  const textBlockH = lineH1 + (s.wmEvent ? 0.3 * u + 1.5 * u * 1.2 : 0);
  const top = bottom - logoH / 2 - textBlockH / 2;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = f1;
  ctx.fillText(UNI_NAME, tx, top);
  if (s.wmEvent) {
    ctx.fillStyle = '#B8F0CF';
    ctx.font = f2;
    ctx.fillText(EVENT_NAME, tx, top + lineH1 + 0.3 * u);
  }
  ctx.restore();
}
