import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Bg, Mode } from '../data';
import { useSettings, scaleOf } from '../settings';
import { getSource } from '../camera/manager';
import { Compositor, captureSize, type ViewKind } from '../render/compositor';
import { ensureWatermarkAssets } from '../render/watermark';

export interface LiveHandle {
  /** ถ่ายภาพจริงจากเฟรมปัจจุบัน (ความละเอียดตามกล้อง) คืนไฟล์ JPEG */
  capture(): Promise<Blob>;
}

interface Props {
  bg: Bg;
  mode: Mode;
  view?: ViewKind;
  watermark?: boolean;
  fxOff?: boolean;          // ปิดเอฟเฟกต์ความสมจริงทั้งหมด (ใช้เทียบก่อน/หลัง)
  width?: number;           // ความกว้างแคนวาสที่ใช้แสดงผล (พิกเซล)
  onError?: (msg: string) => void;
}

/** ภาพสดจากกล้อง ตัดพื้นเขียวและผสมฉากแบบเรียลไทม์ */
export const LiveView = forwardRef<LiveHandle, Props>(function LiveView({ bg, mode, view = 'result', watermark = true, fxOff = false, width = 960, onError }, ref) {
  const base = useSettings();
  const settings = fxOff ? { ...base, fx: { wrap: false, shadow: false, color: false, blur: 0 } } : base;
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ bg, mode, view, watermark, settings });
  latest.current = { bg, mode, view, watermark, settings };

  useEffect(() => {
    let raf = 0, alive = true;
    let comp: Compositor;
    try { comp = new Compositor(width); } catch (e) { onError?.((e as Error).message); return; }
    comp.out.style.cssText = 'display:block;width:100%;height:auto';
    host.current?.appendChild(comp.out);
    ensureWatermarkAssets();

    const paramsNow = () => {
      const l = latest.current;
      return { bg: l.bg, mode: l.mode, scale: scaleOf(l.settings, l.bg.id), settings: l.settings, view: l.view, watermark: l.watermark };
    };
    const loop = () => {
      if (!alive) return;
      comp.render(getSource(), paramsNow());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // ตัวถ่ายจริง สร้างตอนต้องใช้เท่านั้น (เปลืองหน่วยความจำ GPU)
    let still: Compositor | null = null;
    (host.current as HTMLDivElement & { __capture?: () => Promise<Blob> }).__capture = async () => {
      const src = getSource();
      if (!src) throw new Error('ยังไม่มีภาพจากกล้อง');
      await ensureWatermarkAssets();
      const { w, h } = captureSize(src);
      still ||= new Compositor(w, h);
      if (still.width !== w || still.height !== h) still.resize(w, h);
      const p = { ...paramsNow(), view: 'result' as ViewKind, watermark: true };
      still.render(src, p);
      await new Promise(r => setTimeout(r, 60));       // รอโหลดภาพฉากจริง (ถ้ามี) แล้วเรนเดอร์อีกรอบ
      if (!still.render(src, p)) throw new Error(still.error || 'เรนเดอร์ภาพไม่สำเร็จ');
      return still.toBlob();
    };
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      comp.out.remove();
      comp.dispose();
      still?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  useImperativeHandle(ref, () => ({
    capture: () => (host.current as unknown as { __capture: () => Promise<Blob> }).__capture()
  }), []);

  return <div ref={host} style={{ width: '100%', background: '#000', lineHeight: 0 }} />;
});
