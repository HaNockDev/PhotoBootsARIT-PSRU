import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state';
import { useSettings } from '../settings';
import { startCamera, useCamStatus } from '../camera/manager';
import { LiveView, type LiveHandle } from '../components/LiveView';
import { api } from '../api';
import { C, F } from '../theme';
import { CUTS, MODES } from '../data';

export function Live() {
  const { go, bg, mode, code, shots, addShot } = useApp();
  const s = useSettings();
  const cam = useCamStatus();
  const view = useRef<LiveHandle>(null);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<number>(0);

  useEffect(() => { startCamera(s.camera); }, [s.camera]);
  useEffect(() => () => clearInterval(timer.current), []);

  const takePhoto = useCallback(async () => {
    try {
      setFlash(true);
      const blob = await view.current!.capture();
      setTimeout(() => setFlash(false), 280);
      const shot = await api.upload(code, bg.id, mode, blob);
      addShot(shot);
      go('preview');
    } catch (e) {
      setFlash(false);
      setError(`บันทึกภาพไม่สำเร็จ: ${(e as Error).message} (ตรวจสอบกล้องและเซิร์ฟเวอร์ แล้วกดถ่ายใหม่)`);
    } finally {
      setBusy(false);
    }
  }, [addShot, bg.id, code, go, mode]);

  const shutter = useCallback(() => {
    if (busy || !code) return;
    setBusy(true); setError('');
    let c = s.countSec;
    setCount(c);
    timer.current = window.setInterval(() => {
      c -= 1;
      if (c <= 0) { clearInterval(timer.current); setCount(null); void takePhoto(); }
      else setCount(c);
    }, 1000);
  }, [busy, code, s.countSec, takePhoto]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); shutter(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shutter]);

  const cut = CUTS.find(c => c.id === s.cut)!;
  const modeLabel = MODES.find(m => m.id === mode)!.label;
  const ok = cam.state === 'live';
  return (
    <div style={{ minHeight: 'calc(100vh - 6px)', display: 'flex', flexDirection: 'column', padding: '20px 36px 96px', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn-small" disabled={busy} onClick={() => go('select')} style={{ background: '#fff', padding: '10px 16px', fontSize: 15 }}>‹ เปลี่ยนฉาก</button>
        <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ font: `600 20px/1.3 ${F}`, color: C.indigo }}>{bg.name}</div>
          <div style={{ fontSize: 14, color: C.teal, fontWeight: 500 }}>{modeLabel} · ภาพที่ {shots.length + 1}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.muted, background: '#fff', border: `1px solid ${C.line}`, padding: '10px 14px', borderRadius: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? '#2E9E64' : cam.state === 'starting' ? '#D9A400' : C.danger }} />
          {cam.label || 'กล้อง'} · {cut.short}
        </div>
      </div>

      {cam.message && cam.state !== 'live' && (
        <div role="status" style={{ background: cam.state === 'error' ? '#FDECEA' : '#EEF3FB', color: cam.state === 'error' ? C.danger : C.indigo, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ flex: 1 }}>{cam.message}</span>
          {cam.state === 'error' && <button className="btn-small" onClick={() => startCamera(s.camera, true)}>เชื่อมต่อใหม่</button>}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 'min(1100px, calc((100vh - 290px) * 1.5))', borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 60px rgba(30,27,58,0.25)' }}>
          <LiveView ref={view} bg={bg} mode={mode} onError={setError} />
          {/* เส้นช่วยจัดกรอบ */}
          <div style={{ position: 'absolute', inset: '6%', border: '1px dashed rgba(255,255,255,0.5)', borderRadius: 4, pointerEvents: 'none' }} />
          {[33.33, 66.66].map(x => <div key={'v' + x} style={{ position: 'absolute', left: `${x}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.16)', pointerEvents: 'none' }} />)}
          {[33.33, 66.66].map(y => <div key={'h' + y} style={{ position: 'absolute', top: `${y}%`, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.16)', pointerEvents: 'none' }} />)}
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 13 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5484D' }} />LIVE · ผสมฉากแบบเรียลไทม์
          </div>
          {count !== null && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ font: `700 min(28vw,260px)/1 ${F}`, color: '#fff', textShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>{count}</div>
            </div>
          )}
          {flash && <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />}
        </div>
      </div>

      {error && <div role="alert" style={{ color: C.danger, fontSize: 15 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ font: `600 22px/1.35 ${F}`, color: C.indigo }}>{count !== null ? 'เตรียมตัว… ยิ้ม!' : busy ? 'กำลังบันทึกภาพ…' : 'กรุณามองกล้อง เจ้าหน้าที่จะกดถ่ายภาพ'}</div>
          <div style={{ fontSize: 15, color: C.muted }}>ยืนให้อยู่ในกรอบเส้นประ ภาพบนจอคือภาพที่ผสมฉากแล้ว</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'right' }}>สำหรับเจ้าหน้าที่ (กด Space ก็ได้)<br />นับถอยหลัง {s.countSec} วินาที</div>
          <button onClick={shutter} disabled={busy || !code} aria-label="ถ่ายภาพ"
            style={{ width: 84, height: 84, borderRadius: '50%', background: C.green, border: '6px solid #fff', boxShadow: '0 0 0 2px #20B579, 0 8px 20px rgba(32,181,121,0.4)', color: C.text, font: `600 15px ${F}` }}>ถ่าย</button>
        </div>
      </div>
    </div>
  );
}
