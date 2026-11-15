import { useApp } from '../state';
import { useSettings, scaleOf } from '../settings';
import { Composite } from '../components/Composite';
import { C, F } from '../theme';
import { MODES } from '../data';

export function Select() {
  const { go, code, shots, mode, setMode, bgs, bg, setBgId } = useApp();
  const s = useSettings();
  const modeLabel = MODES.find(m => m.id === mode)!.label;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '24px 36px 96px', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src="/assets/logo_psru.png" alt="PSRU" style={{ height: 52, width: 'auto' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          <div style={{ fontSize: 13, color: C.muted }}>ลูกค้าคิวที่ {code} · ภาพที่ {shots.length + 1}</div>
          <div style={{ font: `600 28px/1.3 ${F}`, color: C.indigo }}>เลือกฉากถ่ายภาพ</div>
        </div>
        <img src="/assets/logo_arit.png" alt="ARIT PSRU" style={{ height: 30, width: 'auto' }} />
        <button className="btn-small" onClick={() => go('admin')}>เจ้าหน้าที่</button>
      </div>
      <div className="grid-resp" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(320px,400px)', gap: 32, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="eyebrow">ขั้นที่ 1 · รูปแบบการถ่าย</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{ textAlign: 'left', background: m.id === mode ? 'rgba(31,36,86,0.06)' : '#fff', border: `2px solid ${m.id === mode ? C.indigo : C.line}`, borderRadius: 14, padding: '16px 18px', color: C.text, display: 'flex', flexDirection: 'column', gap: 4, fontFamily: F }}>
                  <span style={{ font: `600 19px/1.3 ${F}`, color: C.indigo }}>{m.label}</span>
                  <span style={{ fontSize: 14, color: C.muted }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="eyebrow">ขั้นที่ 2 · ฉากหลังในมหาวิทยาลัย</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14 }}>
              {bgs.map(b => (
                <button key={b.id} onClick={() => setBgId(b.id)} style={{ padding: 0, background: '#fff', border: `2px solid ${b.id === bg.id ? C.indigo : 'transparent'}`, borderRadius: 14, overflow: 'hidden', color: C.text, textAlign: 'left', display: 'flex', flexDirection: 'column', fontFamily: F, boxShadow: '0 2px 8px rgba(30,27,58,0.06)' }}>
                  <Composite bg={b} mode={mode} real fx={s.fx} scale={scaleOf(s, b.id)} />
                  <span style={{ padding: '10px 12px', fontSize: 15, fontWeight: 500 }}>{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky-side" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 12px 30px rgba(31,36,86,0.08)' }}>
          <div style={{ borderRadius: 10, overflow: 'hidden' }}>
            <Composite bg={bg} mode={mode} real fx={s.fx} scale={scaleOf(s, bg.id)} wm wmPos={s.wmPos} wmOpacity={s.wmOpacity} wmEvent={s.wmEvent} label />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
            <div style={{ fontSize: 13, color: C.muted }}>ตัวอย่างภาพของคุณ</div>
            <div style={{ font: `600 20px/1.35 ${F}` }}>{bg.name}</div>
            <div style={{ fontSize: 15, color: C.teal, fontWeight: 500 }}>{modeLabel}</div>
          </div>
          <button className="btn-primary" onClick={() => go('live')}>ไปจุดถ่ายภาพ</button>
        </div>
      </div>
    </div>
  );
}
