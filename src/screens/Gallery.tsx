import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../state';
import { baseUrl, useSettings } from '../settings';
import { api, photoUrl, type Shot } from '../api';
import { C, F } from '../theme';
import { Mobile } from './Mobile';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'];

export function Gallery() {
  const { go, bgById } = useApp();
  const settings = useSettings();
  const [entry, setEntry] = useState('');
  const [found, setFound] = useState<{ code: string; shots: Shot[] } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [qr, setQr] = useState('');
  const [phone, setPhone] = useState(false);

  const reset = () => { setEntry(''); setFound(null); setNotFound(false); setPicked([]); setErr(''); setPhone(false); };

  const press = async (k: string) => {
    if (k === 'del') { setEntry(e => e.slice(0, -1)); setFound(null); setNotFound(false); return; }
    if (k === 'clr') return reset();
    if (entry.length >= 4) return;
    const next = entry + k;
    setEntry(next); setNotFound(false); setErr('');
    if (next.length === 4) {
      try {
        const r = await api.session(next);
        if (r.shots.length) { setFound(r); setPicked(r.shots.map(s => s.id)); }
        else setNotFound(true);
      } catch { setErr('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
    }
  };

  const url = found && picked.length ? `${baseUrl(settings)}/#/m/${found.code}?p=${picked.join(',')}` : '';
  useEffect(() => {
    if (!url) { setQr(''); return; }
    QRCode.toDataURL(url, { margin: 1, width: 300, color: { dark: '#141A3A', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(''));
  }, [url]);

  if (phone && found) return (
    <div>
      <button className="btn-small" onClick={() => setPhone(false)} style={{ position: 'fixed', top: 12, left: 12, zIndex: 10, background: '#fff' }}>‹ กลับ</button>
      <Mobile code={found.code} ids={picked} framed />
    </div>
  );

  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const results = found?.shots ?? [];
  return (
    <div className="grid-resp" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,360px) minmax(0,1fr)', gap: 32, padding: '24px 36px 96px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/assets/logo_psru.png" alt="" style={{ height: 44, width: 'auto' }} />
          <div style={{ font: `600 24px/1.3 ${F}`, color: C.indigo, flex: 1 }}>จุดรับภาพ</div>
          <button className="btn-small" onClick={() => go('welcome')}>‹ กลับ</button>
        </div>
        <div style={{ fontSize: 15, color: C.muted }}>กรอกรหัส 4 หลักที่ได้รับหลังถ่ายภาพ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 12, background: '#fff', border: `2px solid ${i === entry.length ? C.indigo : 'rgba(30,27,58,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 36px ${F}`, color: C.indigo }}>{entry[i] || ''}</div>
          ))}
        </div>
        {notFound && <div role="alert" style={{ fontSize: 14, color: C.danger }}>ไม่พบรหัสนี้ กรุณาตรวจสอบอีกครั้ง</div>}
        {err && <div role="alert" style={{ fontSize: 14, color: C.danger }}>{err}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {KEYS.map(k => (
            <button key={k} className="key" onClick={() => void press(k)} style={{ height: 64, borderRadius: 12, background: k.length > 1 ? 'transparent' : '#fff', color: k.length > 1 ? C.muted : C.text, border: '1px solid rgba(30,27,58,0.1)', font: `600 22px ${F}` }}>
              {k === 'del' ? 'ลบ' : k === 'clr' ? 'ล้าง' : k}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {!found ? (
          <div style={{ minHeight: '60vh', border: '1.5px dashed rgba(30,27,58,0.16)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 16, textAlign: 'center', padding: 24 }}>ภาพของคุณจะแสดงที่นี่เมื่อกรอกรหัสครบ</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ font: `600 22px/1.3 ${F}`, color: C.indigo }}>รหัส {found.code} · {results.length} ภาพ</div>
              <button onClick={() => setPicked(picked.length === results.length ? [] : results.map(r => r.id))} style={{ background: 'transparent', border: 'none', color: C.teal, font: `600 15px ${F}` }}>
                {picked.length === results.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
              {results.map(r => {
                const on = picked.includes(r.id);
                return (
                  <button key={r.id} onClick={() => toggle(r.id)} aria-pressed={on} title={bgById(r.bgId).name} style={{ position: 'relative', padding: 0, background: '#fff', border: `3px solid ${on ? C.indigo : 'transparent'}`, borderRadius: 14, overflow: 'hidden', display: 'block', lineHeight: 0 }}>
                    <img src={photoUrl(r.id)} alt={bgById(r.bgId).name} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: on ? C.indigo : 'rgba(0,0,0,0.3)', border: '2px solid #fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 16px sans-serif' }}>{on ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, borderRadius: 18, padding: 20, flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', padding: 10, borderRadius: 10, border: '1px solid rgba(30,27,58,0.1)', opacity: picked.length ? 1 : 0.2, width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {qr && <img src={qr} alt="QR code ดาวน์โหลดภาพ" style={{ width: 160, height: 160 }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 220 }}>
                <div style={{ font: `600 22px/1.35 ${F}`, color: C.indigo }}>{picked.length ? `สแกนเพื่อดาวน์โหลด ${picked.length} ภาพ` : 'เลือกอย่างน้อย 1 ภาพ'}</div>
                <div style={{ fontSize: 15, color: C.muted }}>เปิดกล้องมือถือแล้วสแกน QR เพื่อดาวน์โหลดภาพ มือถือต้องเชื่อมต่อวงเครือข่ายเดียวกับเครื่องนี้</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button className="btn-small" style={{ borderColor: C.indigo, color: C.indigo }} disabled={!picked.length} onClick={() => setPhone(true)}>ดูหน้าที่เปิดบนมือถือ</button>
                  <button className="btn-small" onClick={reset}>เสร็จสิ้น</button>
                </div>
                {url && <div style={{ fontSize: 12, color: C.muted, wordBreak: 'break-all' }}>{url}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
