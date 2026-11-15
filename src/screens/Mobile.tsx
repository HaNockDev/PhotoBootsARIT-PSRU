import { useEffect, useState } from 'react';
import { api, photoUrl, type Shot } from '../api';
import { DEFAULT_BGS, EVENT_NAME, ORG_NAME, UNI_NAME } from '../data';
import { C, F } from '../theme';

/** หน้าดาวน์โหลดบนมือถือ (เปิดจาก QR) `ids` ว่าง = แสดงทุกภาพของรหัสนั้น */
export function Mobile({ code, ids, framed = false }: { code: string; ids?: string[]; framed?: boolean }) {
  const [shots, setShots] = useState<Shot[] | null>(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.session(code)
      .then(r => setShots(ids?.length ? r.shots.filter(s => ids.includes(s.id)) : r.shots))
      .catch(() => setErr('เปิดภาพไม่สำเร็จ ตรวจสอบการเชื่อมต่อเครือข่าย'));
  }, [code, ids?.join(',')]);

  const download = (id: string) => {
    const a = document.createElement('a');
    a.href = photoUrl(id, true); a.download = `PSRU-${code}-${id}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
    setDone(d => ({ ...d, [id]: true }));
  };
  const downloadAll = async () => {
    for (const s of shots ?? []) { download(s.id); await new Promise(r => setTimeout(r, 600)); }
  };
  const nameOf = (bgId: string) => DEFAULT_BGS.find(b => b.id === bgId)?.name ?? 'ฉากพิเศษ';
  const allDone = !!shots?.length && shots.every(s => done[s.id]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: framed ? '28px 16px 110px' : 0, background: framed ? '#DFECE9' : C.page, minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: framed ? 390 : 520, background: C.page, border: framed ? `1px solid ${C.line}` : 'none', borderRadius: framed ? 28 : 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: framed ? '0 20px 50px rgba(30,27,58,0.15)' : 'none', alignSelf: framed ? 'flex-start' : 'stretch' }}>
        <div style={{ padding: '22px 20px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(120deg,#20B579,#009C91 35%,#005D87 70%,#1F2456)', color: '#fff' }}>
          <img src="/assets/logo_psru.png" alt="" style={{ height: 40, width: 'auto' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ font: `600 16px/1.3 ${F}` }}>{UNI_NAME}</div>
            <div style={{ fontSize: 12, color: '#CFF5DE' }}>{EVENT_NAME}</div>
          </div>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ font: `600 24px/1.3 ${F}`, color: C.indigo }}>ยินดีด้วย บัณฑิต</div>
            <div style={{ fontSize: 14, color: C.muted }}>รหัส {code}{shots ? ` · ${shots.length} ภาพ` : ''}</div>
          </div>
          {err && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{err}</div>}
          {shots && shots.length === 0 && <div style={{ color: C.muted, fontSize: 14 }}>ไม่พบภาพสำหรับรหัสนี้</div>}
          {shots?.map(s => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <img src={photoUrl(s.id)} alt={nameOf(s.bgId)} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: 12, background: '#ddd' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 14, color: C.muted }}>{nameOf(s.bgId)}</div>
                <button onClick={() => download(s.id)} style={{ background: '#fff', border: '1px solid rgba(30,27,58,0.16)', color: C.text, borderRadius: 10, padding: '10px 14px', font: `500 14px ${F}`, minHeight: 44 }}>
                  {done[s.id] ? 'ดาวน์โหลดแล้ว ✓' : 'ดาวน์โหลด'}
                </button>
              </div>
            </div>
          ))}
          {!!shots?.length && <button className="btn-primary" onClick={() => void downloadAll()} style={{ padding: 16, fontSize: 16, minHeight: 52 }}>{allDone ? 'ดาวน์โหลดครบทุกภาพแล้ว' : 'ดาวน์โหลดทั้งหมด'}</button>}
          <div style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>ไฟล์ JPG ความละเอียดเต็มจากกล้อง</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 6, borderTop: '1px solid rgba(31,36,86,0.08)' }}>
            <img src="/assets/logo_arit.png" alt="ARIT PSRU" style={{ height: 24, width: 'auto', marginTop: 12 }} />
            <div style={{ fontSize: 11, color: C.muted }}>{ORG_NAME}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
