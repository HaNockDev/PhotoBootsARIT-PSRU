import { useEffect, useState } from 'react';
import { useApp } from '../state';
import { useSettings } from '../settings';
import { photoUrl } from '../api';
import { C, F } from '../theme';

export function Preview() {
  const { shots, code, retake, go } = useApp();
  const last = shots[shots.length - 1];
  return (
    <div className="grid-resp" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(300px,360px)', gap: 28, padding: '24px 36px 96px', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div className="h1">ภาพของคุณพร้อมแล้ว</div>
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 60px rgba(30,27,58,0.2)', background: '#000', lineHeight: 0 }}>
          {last ? <img src={photoUrl(last.id)} alt="ภาพที่ถ่าย" style={{ width: '100%', height: 'auto', display: 'block' }} /> : <div style={{ color: '#fff', padding: 40, lineHeight: 1.5 }}>ยังไม่มีภาพ</div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 50 }}>
        <div className="card" style={{ borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: C.muted }}>รหัสรับภาพของคุณ</div>
          <div style={{ font: `700 64px/1.1 ${F}`, letterSpacing: '0.12em', color: C.indigo }}>{code}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: C.muted }}>ภาพในรหัสนี้ ({shots.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
            {shots.map(x => <img key={x.id} src={photoUrl(x.id)} alt="" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: 8 }} />)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn-ghost" onClick={retake}>ถ่ายใหม่</button>
          <button className="btn-ghost" onClick={() => go('select')}>ถ่ายฉากอื่นเพิ่ม</button>
        </div>
        <button className="btn-primary" onClick={() => go('thanks')}>ถ่ายครบแล้ว</button>
      </div>
    </div>
  );
}

export function Thanks() {
  const { code, nextCode, shots, nextCustomer } = useApp();
  const { thanksSec } = useSettings();
  const [left, setLeft] = useState(thanksSec);
  useEffect(() => {
    const t = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0) void nextCustomer(); }, [left, nextCustomer]);
  return (
    <div style={{ minHeight: 'calc(100vh - 6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '40px 36px 110px', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <img src="/assets/logo_psru.png" alt="" style={{ height: 80, width: 'auto' }} />
        <img src="/assets/logo_arit.png" alt="ARIT PSRU" style={{ height: 46, width: 'auto' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <div style={{ font: `700 40px/1.3 ${F}`, color: C.indigo }}>ขอบคุณที่ใช้บริการ</div>
        <div style={{ fontSize: 18, color: C.muted, maxWidth: 560 }}>นำรหัสนี้ไปที่จุดรับภาพ เพื่อเลือกภาพและสแกน QR ดาวน์โหลดลงมือถือ</div>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 28, borderRadius: 22, padding: '24px 36px', boxShadow: '0 12px 30px rgba(31,36,86,0.1)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: C.muted }}>รหัสรับภาพ</div>
          <div style={{ font: `700 80px/1 ${F}`, letterSpacing: '0.12em', color: C.indigo }}>{code}</div>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: C.line }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: C.muted }}>จำนวนภาพ</div>
          <div style={{ font: `700 80px/1 ${F}`, color: C.teal }}>{shots.length}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button className="btn-primary" onClick={() => void nextCustomer()} style={{ padding: '18px 30px' }}>เริ่มลูกค้าคนถัดไป (คิว {nextCode})</button>
        <div style={{ fontSize: 14, color: C.muted }}>กลับหน้าต้อนรับอัตโนมัติใน {Math.max(left, 0)} วินาที</div>
      </div>
    </div>
  );
}
