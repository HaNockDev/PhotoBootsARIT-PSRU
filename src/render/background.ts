import type { Bg, Mode } from '../data';
import type { Settings } from '../settings';

const imgCache = new Map<string, HTMLImageElement>();
export function loadImage(url: string): Promise<HTMLImageElement> {
  const hit = imgCache.get(url);
  if (hit?.complete && hit.naturalWidth) return Promise.resolve(hit);
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => { imgCache.set(url, i); res(i); };
    i.onerror = () => rej(new Error('โหลดภาพฉากไม่สำเร็จ: ' + url));
    i.src = url;
  });
}

/** ตำแหน่งเงาใต้เท้าตามรูปแบบการถ่าย (เปอร์เซ็นต์ของความกว้าง/สูง) */
export function shadowSpots(mode: Mode, scale: number) {
  if (mode === 'full') return [{ x: 50, w: 18 * scale, bottom: 1.5 }];
  if (mode === 'group') return [{ x: 29.3, w: 16, bottom: 3 }, { x: 50, w: 17, bottom: 2 }, { x: 70.7, w: 16, bottom: 3 }];
  return [];
}

/** วาดฉากหลัง (ภาพจริง หรือไล่สีสำรอง) พร้อมเบลอ พื้น และเงา ลงแคนวาส */
export function drawBackground(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  bg: Bg, img: HTMLImageElement | null, mode: Mode, scale: number, fx: Settings['fx']
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  const blurPx = (fx.blur / 100) * 0.8 * (w / 100);
  const pad = Math.max(blurPx * 3, w * 0.04); // ขยายออกกันขอบเบลอจาง
  ctx.filter = blurPx > 0.3 ? `blur(${blurPx}px)` : 'none';

  if (img) {
    const r = Math.max((w + pad * 2) / img.naturalWidth, (h + pad * 2) / img.naturalHeight);
    const dw = img.naturalWidth * r;
    const dh = img.naturalHeight * r;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, -pad, 0, h + pad);
    g.addColorStop(0, bg.a);
    g.addColorStop(1, bg.b);
    ctx.fillStyle = g;
    ctx.fillRect(-pad, -pad, w + pad * 2, h + pad * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    for (let x = -h; x < w + h; x += (14 * w) / 600) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
    }
    const fg = ctx.createLinearGradient(0, h * 0.76, 0, h);
    fg.addColorStop(0, 'rgba(0,0,0,0.18)');
    fg.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = fg;
    ctx.fillRect(-pad, h * 0.76, w + pad * 2, h * 0.24 + pad);
  }
  ctx.filter = 'none';

  if (fx.shadow) {
    for (const s of shadowSpots(mode, scale)) {
      const cx = (s.x / 100) * w;
      const rw = ((s.w / 100) * w) / 2;
      const rh = 1.3 * (w / 100);
      const cy = h - (s.bottom / 100) * h - rh;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, rh / rw);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
      rg.addColorStop(0, 'rgba(0,0,0,0.5)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(0, 0, rw, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/** สีเฉลี่ยของฉาก (0–1) ใช้ปรับสีคนให้เข้ากับแสงในฉาก */
export function averageColor(src: HTMLCanvasElement): [number, number, number] {
  const t = document.createElement('canvas');
  t.width = t.height = 8;
  const c = t.getContext('2d')!;
  c.drawImage(src, 0, 0, 8, 8);
  const d = c.getImageData(0, 0, 8, 8).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  const n = (d.length / 4) * 255;
  return [r / n, g / n, b / n];
}
