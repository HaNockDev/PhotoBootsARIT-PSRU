import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../state';
import { isEnabled, scaleOf, updateSettings, useSettings } from '../settings';
import { api } from '../api';
import { CUTS } from '../data';
import { Composite } from '../components/Composite';
import { LiveView } from '../components/LiveView';
import { CardButton, Segmented, SliderRow, Toggle } from '../components/ui';
import { refreshDevices, startCamera, useCamStatus } from '../camera/manager';
import { C, F } from '../theme';

type Tab = 'bg' | 'wm' | 'key' | 'real' | 'cam';
const TABS: [Tab, string][] = [['bg', 'ฉากหลัง'], ['wm', 'ลายน้ำ'], ['key', 'การตัดภาพคน'], ['real', 'ความสมจริง'], ['cam', 'กล้อง']];

const Panel = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => (
  <div className="card" style={{ padding: 20, ...style }}>{children}</div>
);

export function Admin() {
  const { go } = useApp();
  const [tab, setTab] = useState<Tab>('bg');
  return (
    <div className="grid-resp" style={{ minHeight: 'calc(100vh - 6px)', display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)' }}>
      <div style={{ background: '#E6F1EE', borderRight: `1px solid ${C.line}`, padding: '24px 14px 40px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 18px' }}>
          <img src="/assets/logo_arit.png" alt="ARIT PSRU" style={{ height: 28, width: 'auto' }} />
          <div style={{ font: `600 16px/1.3 ${F}`, color: C.indigo }}>หลังบ้าน</div>
        </div>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ textAlign: 'left', background: tab === id ? '#fff' : 'transparent', color: tab === id ? C.indigo : C.muted, border: 'none', borderRadius: 10, padding: '12px 14px', font: `500 15px ${F}` }}>{label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => go('welcome')} style={{ textAlign: 'left', background: 'transparent', color: C.muted, border: `1px solid ${C.lineStrong}`, borderRadius: 10, padding: '12px 14px', font: `500 14px ${F}` }}>‹ กลับหน้าลูกค้า</button>
      </div>
      <div style={{ padding: '28px 36px 60px', display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
        {tab === 'bg' && <TabBg />}
        {tab === 'wm' && <TabWm />}
        {tab === 'key' && <TabKey />}
        {tab === 'real' && <TabReal />}
        {tab === 'cam' && <TabCam />}
      </div>
    </div>
  );
}

/* ---------- ฉากหลัง ---------- */
async function toJpeg(file: File, maxW = 3000): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, maxW / bmp.width);
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('แปลงภาพไม่สำเร็จ'))), 'image/jpeg', 0.9));
}

function TabBg() {
  const { allBgs, reloadBgs } = useApp();
  const s = useSettings();
  const [uses, setUses] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { api.stats().then(r => setUses(r.byBg)).catch(() => {}); }, []);

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const name = f.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'ฉากใหม่';
      await api.uploadBg(name, await toJpeg(f));
      await reloadBgs();
    } catch (e) { setErr(`อัปโหลดไม่สำเร็จ: ${(e as Error).message}`); }
    setBusy(false);
    if (file.current) file.current.value = '';
  };
  const remove = async (id: string) => {
    if (!confirm('ลบฉากนี้ถาวรหรือไม่?')) return;
    try { await api.removeBg(id); await reloadBgs(); } catch (e) { setErr(`ลบไม่สำเร็จ: ${(e as Error).message}`); }
  };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="h1">ฉากหลัง</div>
        <input ref={file} type="file" accept="image/*" hidden onChange={e => void onFile(e.target.files?.[0])} />
        <button className="btn-primary" disabled={busy} onClick={() => file.current?.click()} style={{ padding: '12px 18px', fontSize: 15, borderRadius: 10 }}>{busy ? 'กำลังอัปโหลด…' : '+ อัปโหลดฉากใหม่'}</button>
      </div>
      <div style={{ fontSize: 14, color: C.muted }}>ฉากเริ่มต้นเป็นภาพไล่สีชั่วคราว อัปโหลดภาพจริงของแต่ละสถานที่ (สัดส่วน 3:2 แนะนำ 3000 × 2000 px) ฉากที่ปิดไว้จะไม่แสดงให้ลูกค้าเลือก</div>
      {err && <div role="alert" style={{ color: C.danger, fontSize: 14 }}>{err}</div>}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {allBgs.map(b => (
          <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) auto', gap: 18, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(30,27,58,0.06)' }}>
            <div style={{ borderRadius: 8, overflow: 'hidden' }}><Composite bg={b} mode="none" /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{b.name}</div>
              <div style={{ fontSize: 13, color: C.muted }}>ใช้แล้ว {uses[b.id] ?? 0} ครั้งวันนี้</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {b.image && <button className="btn-small" onClick={() => void remove(b.id)}>ลบ</button>}
              <Toggle on={isEnabled(s, b.id)} label={`เปิด/ปิดฉาก ${b.name}`} onChange={v => updateSettings(x => ({ enabled: { ...x.enabled, [b.id]: v } }))} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- ลายน้ำ ---------- */
function TabWm() {
  const { bg, mode } = useApp();
  const s = useSettings();
  return (
    <>
      <div className="h1">ลายน้ำ</div>
      <div className="grid-resp" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(260px,320px)', gap: 24, alignItems: 'start' }}>
        <div style={{ borderRadius: 14, overflow: 'hidden' }}>
          <Composite bg={bg} mode={mode} real fx={s.fx} scale={scaleOf(s, bg.id)} wm wmPos={s.wmPos} wmOpacity={s.wmOpacity} wmEvent={s.wmEvent} />
        </div>
        <Panel style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, color: C.muted }}>ตำแหน่ง</div>
            <Segmented value={s.wmPos} options={[['left', 'ซ้าย'], ['center', 'กลาง'], ['right', 'ขวา']]} onChange={v => updateSettings({ wmPos: v })} />
          </div>
          <SliderRow label="ความทึบ" value={Math.round(s.wmOpacity * 100)} unit="%" min={20} max={100} onChange={v => updateSettings({ wmOpacity: v / 100 })} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 14, color: C.muted }}>แสดงชื่องาน</div>
            <Toggle on={s.wmEvent} label="แสดงชื่องาน" onChange={v => updateSettings({ wmEvent: v })} />
          </div>
          <div style={{ fontSize: 13, color: C.muted }}>ลายน้ำไม่มีกรอบ ใช้เงาจางรอบตัวอักษรเพื่อให้อ่านได้ทั้งบนฉากสว่างและฉากมืด ใช้โลโก้จากไฟล์ <code>public/assets/logo_psru.png</code></div>
        </Panel>
      </div>
    </>
  );
}

/* ---------- การตัดภาพคน ---------- */
function TabKey() {
  const { bg, mode } = useApp();
  const s = useSettings();
  const cut = CUTS.find(c => c.id === s.cut)!;
  return (
    <>
      <div className="h1">การตัดภาพคน</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
        {CUTS.map(c => (
          <CardButton key={c.id} on={c.id === s.cut} onClick={() => updateSettings({ cut: c.id })} title={c.label} desc={c.desc}>
            {!c.ready && <span style={{ fontSize: 12, color: C.danger }}>ยังไม่เปิดใช้ในเวอร์ชันนี้ ระบบจะตัดแบบ Chroma Key แทน</span>}
          </CardButton>
        ))}
      </div>
      <div className="grid-resp" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 14 }}>
        {([['1 · ภาพจากกล้อง', 'raw'], ['2 · Matte (ขาว = คนที่ตัดได้)', 'matte'], ['3 · ผลลัพธ์', 'result']] as const).map(([label, v]) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
            <div style={{ borderRadius: 12, overflow: 'hidden' }}><LiveView bg={bg} mode={mode} view={v} watermark={false} width={480} /></div>
          </div>
        ))}
      </div>
      <div className="grid-resp" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
        <Panel style={{ padding: 16 }}><div style={{ fontSize: 13, color: C.muted }}>วิธีตัดสำหรับ Live Preview</div><div style={{ fontSize: 16, fontWeight: 500 }}>{CUTS[0].live}</div></Panel>
        <Panel style={{ padding: 16 }}><div style={{ fontSize: 13, color: C.muted }}>วิธีตัดสำหรับภาพจริง</div><div style={{ fontSize: 16, fontWeight: 500 }}>{cut.ready ? cut.final : CUTS[0].final}</div></Panel>
      </div>
      <Panel style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, color: C.muted }}>สีคีย์</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="color" value={s.keyColor} onChange={e => updateSettings({ keyColor: e.target.value.toUpperCase() })} style={{ width: 44, height: 36, border: 'none', padding: 0, background: 'none' }} aria-label="สีคีย์" />
            <span style={{ fontSize: 15 }}>{s.keyColor}</span>
          </div>
        </div>
        <SliderRow label="ความคลาดเคลื่อนสี (Tolerance)" value={s.tol} onChange={v => updateSettings({ tol: v })} />
        <SliderRow label="ความนุ่มขอบ (Edge softness)" value={s.soft} onChange={v => updateSettings({ soft: v })} />
        <SliderRow label="ลดเงาสีเขียว (Spill)" value={s.spill} onChange={v => updateSettings({ spill: v })} />
      </Panel>
    </>
  );
}

/* ---------- ความสมจริง ---------- */
function TabReal() {
  const { bg, mode } = useApp();
  const s = useSettings();
  const scale = scaleOf(s, bg.id);
  const fxs: [keyof typeof s.fx & ('wrap' | 'color' | 'shadow'), string, string][] = [
    ['wrap', 'Light wrap', 'ดึงแสงสีจากฉากมาเคลือบขอบตัวคน ขอบจึงไม่แข็งเหมือนสติกเกอร์'],
    ['color', 'ปรับสีให้เข้ากับฉากอัตโนมัติ', 'ปรับโทนสีของคนให้เอนเอียงไปทางแสงเฉลี่ยของฉาก'],
    ['shadow', 'เงาที่พื้น', 'สร้างเงาใต้เท้าตามรูปแบบการถ่าย ทำให้คนดูยืนอยู่จริง']
  ];
  return (
    <>
      <div className="h1">ความสมจริงของภาพ</div>
      <div style={{ fontSize: 14, color: C.muted }}>ใช้ทั้งใน Live Preview และภาพจริง ช่วยให้คนดูกลมกลืนกับฉาก ไม่ลอย (ทดสอบกับภาพสดจากกล้อง)</div>
      <div className="grid-resp" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: C.muted }}>ปิดทั้งหมด (วางภาพตรงๆ)</div>
          <div style={{ borderRadius: 12, overflow: 'hidden' }}><LiveView bg={bg} mode={mode} fxOff watermark={false} width={640} /></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: C.muted }}>ตามค่าที่ตั้งไว้</div>
          <div style={{ borderRadius: 12, overflow: 'hidden' }}><LiveView bg={bg} mode={mode} watermark={false} width={640} /></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        {fxs.map(([k, label, desc]) => (
          <Panel key={k} style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 500 }}>{label}</div><div style={{ fontSize: 13, color: C.muted }}>{desc}</div></div>
            <Toggle on={s.fx[k]} label={label} onChange={v => updateSettings(x => ({ fx: { ...x.fx, [k]: v } }))} />
          </Panel>
        ))}
      </div>
      <Panel style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
        <SliderRow label="เบลอฉากหลัง (ระยะชัดตื้น)" value={s.fx.blur} onChange={v => updateSettings(x => ({ fx: { ...x.fx, blur: v } }))} />
        <SliderRow label={`ขนาดคนในฉาก “${bg.name}”`} value={Math.round(scale * 100)} unit="%" min={70} max={120} onChange={v => updateSettings(x => ({ scales: { ...x.scales, [bg.id]: v / 100 } }))} />
      </Panel>
    </>
  );
}

/* ---------- กล้อง ---------- */
function TabCam() {
  const s = useSettings();
  const cam = useCamStatus();
  const [stats, setStats] = useState<{ today: number; total: number } | null>(null);
  useEffect(() => { startCamera(s.camera); refreshDevices(); api.stats().then(setStats).catch(() => {}); }, [s.camera]);
  const set = (patch: Partial<typeof s.camera>) => updateSettings(x => ({ camera: { ...x.camera, ...patch } }));

  const sources: ['auto' | 'device' | 'demo', string, string][] = [
    ['auto', 'อัตโนมัติ (แนะนำ)', 'ใช้กล้อง/Capture Card ตัวแรกที่พบ ถ้าไม่พบจะเข้าโหมดสาธิต'],
    ['device', 'เลือกอุปกรณ์เอง', 'เลือก Capture Card (HDMI) หรือกล้องที่ต่อ USB streaming จากรายการด้านล่าง'],
    ['demo', 'โหมดสาธิต', 'ภาพจำลอง ไม่ต้องมีกล้อง ใช้ทดสอบระบบและฝึกเจ้าหน้าที่']
  ];
  const stat = (label: string, value: string) => (
    <Panel key={label} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 13, color: C.muted }}>{label}</div><div style={{ fontSize: 17, fontWeight: 500 }}>{value}</div>
    </Panel>
  );
  return (
    <>
      <div className="h1">กล้องและการเชื่อมต่อ</div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, flexWrap: 'wrap' }}>
        {[
          ['ขั้นที่ 1', 'Sony Handycam FDR-AX55', 'ถ่ายวิดีโอ 4K/1080p ตั้งชัตเตอร์ ISO และ white balance เอง'],
          ['ขั้นที่ 2 · สาย HDMI', 'Capture Card (USB)', 'แปลง HDMI เป็นกล้อง USB (UVC) ที่เบราว์เซอร์อ่านได้ หรือใช้ USB streaming ถ้ารุ่นรองรับ'],
          ['ขั้นที่ 3 · ในเบราว์เซอร์', 'ตัดพื้นเขียว + ผสมฉาก', 'WebGL ตัดพื้นเขียว ใส่ฉากและลายน้ำ จับเฟรมเป็น JPG'],
          ['ขั้นที่ 4 · เซิร์ฟเวอร์ในเครื่อง', 'เก็บภาพ + QR', 'ภาพเก็บที่โฟลเดอร์ data/ มือถือดาวน์โหลดผ่านวง LAN']
        ].map(([a, b, c]) => (
          <Panel key={a} style={{ flex: 1, minWidth: 170, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, color: C.teal, fontWeight: 600 }}>{a}</div><div style={{ fontSize: 16, fontWeight: 500 }}>{b}</div><div style={{ fontSize: 13, color: C.muted }}>{c}</div>
          </Panel>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 14, color: C.muted }}>แหล่งภาพ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
          {sources.map(([id, t, d]) => <CardButton key={id} on={s.camera.source === id} onClick={() => set({ source: id })} title={t} desc={d} />)}
        </div>
      </div>

      <Panel style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label htmlFor="dev" style={{ fontSize: 14, color: C.muted }}>อุปกรณ์</label>
          <select id="dev" value={s.camera.deviceId} disabled={s.camera.source === 'demo'} onChange={e => set({ deviceId: e.target.value, source: 'device' })} style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.lineStrong}`, fontSize: 15 }}>
            <option value="">(อัตโนมัติ)</option>
            {cam.devices.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          {!cam.devices.some(d => d.label && !/^กล้อง \d+$/.test(d.label)) && <div style={{ fontSize: 12, color: C.muted }}>ชื่ออุปกรณ์จะแสดงหลังอนุญาตให้ใช้กล้อง</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, color: C.muted }}>ความละเอียดที่ขอจากกล้อง</div>
          <Segmented value={s.camera.res} options={[['1080', '1080p'], ['4k', '4K']]} onChange={v => set({ res: v })} />
          <div style={{ fontSize: 12, color: C.muted }}>ความละเอียดจริงขึ้นกับ Capture Card (บางตัวรับได้แค่ 1080p)</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 14, color: C.muted }}>เวลานับถอยหลังก่อนถ่าย</div>
          <Segmented value={s.countSec} options={[[3, '3 วินาที'], [5, '5 วินาที'], [10, '10 วินาที']]} onChange={v => updateSettings({ countSec: v })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label htmlFor="base" style={{ fontSize: 14, color: C.muted }}>ที่อยู่เซิร์ฟเวอร์ใน QR (ให้มือถือเปิดได้)</label>
          <input id="base" value={s.publicBase} placeholder={location.origin} onChange={e => updateSettings({ publicBase: e.target.value })} style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.lineStrong}`, fontSize: 15 }} />
          <div style={{ fontSize: 12, color: C.muted }}>ถ้าเปิดแอปด้วย localhost ให้ใส่ IP ของเครื่องนี้ในวง LAN เช่น http://192.168.1.10:8787</div>
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {stat('สถานะ', cam.state === 'live' ? 'เชื่อมต่อแล้ว' : cam.state === 'demo' ? 'โหมดสาธิต' : cam.state === 'starting' ? 'กำลังเชื่อมต่อ…' : cam.state === 'error' ? 'มีปัญหา' : 'ยังไม่เริ่ม')}
        {stat('อุปกรณ์', cam.label || '-')}
        {stat('ความละเอียดที่ได้รับ', cam.width ? `${cam.width} × ${cam.height}` : '-')}
        {stat('เฟรมเรต', cam.fps ? `${cam.fps} fps` : '-')}
        {stat('ภาพวันนี้', stats ? `${stats.today.toLocaleString()} ภาพ` : '-')}
      </div>
      {cam.message && <div role="status" style={{ fontSize: 14, color: cam.state === 'error' ? C.danger : C.muted }}>{cam.message}</div>}
      <div><button className="btn-small" onClick={() => startCamera(s.camera, true)}>เชื่อมต่อใหม่</button></div>

      <Panel style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.indigo }}>ตั้งค่า Handycam หน้างาน</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
          <li>ใช้ไฟจากอะแดปเตอร์ AC ไม่ใช้แบตเตอรี่ และปิดโหมดประหยัดพลังงาน/ปิดจออัตโนมัติ</li>
          <li>ปิดข้อความและกรอบบนหน้าจอที่ออกทาง HDMI (Clean HDMI / ปิดการแสดงข้อมูล) ไม่เช่นนั้นจะติดมาในภาพ — ตรวจสอบเมนูของรุ่น FDR-AX55</li>
          <li>ตั้งโหมดแมนนวล: ชัตเตอร์ประมาณ 1/125 วินาทีขึ้นไป ล็อก White Balance และ Exposure ปิด Auto Focus ที่เปลี่ยนบ่อย (หรือใช้ Face/Tracking ให้เสถียร)</li>
          <li>จัดไฟฉากเขียวให้สม่ำเสมอ และให้คนยืนห่างฉากอย่างน้อย 1–1.5 เมตรเพื่อลดเงาสะท้อนสีเขียว</li>
        </ul>
      </Panel>
    </>
  );
}
