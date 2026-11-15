import { useApp } from '../state';
import { useSettings, scaleOf } from '../settings';
import { Composite } from '../components/Composite';
import { C, F } from '../theme';
import { EVENT_NAME, ORG_NAME } from '../data';

export function Welcome() {
  const { go, code, bgById, serverError } = useApp();
  const s = useSettings();
  const bg = bgById('arch');
  return (
    <div onClick={() => go('select')} style={{ minHeight: 'calc(100vh - 6px)', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)', gap: 40, alignItems: 'center', padding: '40px 48px 96px', cursor: 'pointer', position: 'relative' }} className="grid-resp">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <img src="/assets/logo_psru.png" alt="PSRU" style={{ height: 96, width: 'auto' }} />
          <div style={{ width: 1, height: 64, background: 'rgba(31,36,86,0.15)' }} />
          <img src="/assets/logo_arit.png" alt="ARIT PSRU" style={{ height: 56, width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 16, color: C.teal, fontWeight: 600, letterSpacing: '0.04em' }}>{EVENT_NAME}</div>
          <div style={{ font: `700 56px/1.25 ${F}`, color: C.indigo }}>ยินดีด้วย บัณฑิต</div>
          <div style={{ fontSize: 20, color: C.muted }}>ถ่ายภาพที่ระลึกกับสถานที่ในมหาวิทยาลัยราชภัฏพิบูลสงคราม</div>
        </div>
        <div style={{ background: C.indigo, color: '#fff', borderRadius: 16, padding: '20px 26px', alignSelf: 'flex-start', font: `600 20px ${F}` }}>แตะหน้าจอเพื่อเริ่มถ่ายภาพ</div>
        <div style={{ fontSize: 14, color: C.muted }}>ลูกค้าคิวที่ {code || '----'} · ให้บริการโดย {ORG_NAME}</div>
        {serverError && <div role="alert" style={{ fontSize: 14, color: C.danger }}>{serverError}</div>}
      </div>
      <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 60px rgba(31,36,86,0.18)' }}>
        <Composite bg={bg} mode="group" real fx={s.fx} scale={scaleOf(s, bg.id)} wm wmPos={s.wmPos} wmOpacity={s.wmOpacity} wmEvent={s.wmEvent} />
      </div>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 24, bottom: 20, display: 'flex', gap: 8 }}>
        <button className="btn-small" onClick={() => go('gallery')}>จุดรับภาพ</button>
        <button className="btn-small" onClick={() => go('admin')}>เจ้าหน้าที่</button>
      </div>
    </div>
  );
}
