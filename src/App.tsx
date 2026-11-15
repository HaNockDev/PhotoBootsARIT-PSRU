import { useEffect, useState } from 'react';
import { AppProvider, useApp, type Screen } from './state';
import { Welcome } from './screens/Welcome';
import { Select } from './screens/Select';
import { Live } from './screens/Live';
import { Preview, Thanks } from './screens/PreviewThanks';
import { Gallery } from './screens/Gallery';
import { Admin } from './screens/Admin';
import { Mobile } from './screens/Mobile';
import { BRAND_GRADIENT } from './theme';
import { useSettings } from './settings';
import { startCamera } from './camera/manager';

const NAV: [Screen, string][] = [['welcome', 'ต้อนรับ'], ['select', 'เลือกฉาก'], ['live', 'ถ่ายภาพ'], ['preview', 'พรีวิว'], ['thanks', 'ถ่ายครบ'], ['gallery', 'จุดรับภาพ'], ['admin', 'หลังบ้าน']];

function Shell() {
  const { screen, go } = useApp();
  const settings = useSettings();
  // เปิดกล้องเมื่อเข้าหน้าที่ต้องใช้ภาพสด (ถ่ายภาพ / หลังบ้าน) ถ้าตั้งค่าไม่เปลี่ยนจะไม่เชื่อมต่อซ้ำ
  useEffect(() => {
    if (screen === 'live' || screen === 'admin') void startCamera(settings.camera);
  }, [screen, settings.camera]);
  // ?nav=1 แสดงแถบข้ามหน้าสำหรับทดสอบ/สาธิต
  const showNav = new URLSearchParams(location.search).has('nav');
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ height: 6, background: BRAND_GRADIENT }} />
      {screen === 'welcome' && <Welcome />}
      {screen === 'select' && <Select />}
      {screen === 'live' && <Live />}
      {screen === 'preview' && <Preview />}
      {screen === 'thanks' && <Thanks />}
      {screen === 'gallery' && <Gallery />}
      {screen === 'admin' && <Admin />}
      {showNav && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, background: 'rgba(30,27,58,0.92)', borderRadius: 999, padding: 5, zIndex: 50, maxWidth: 'calc(100vw - 24px)', overflowX: 'auto' }}>
          {NAV.map(([id, label]) => (
            <button key={id} onClick={() => go(id)} style={{ background: screen === id ? '#20B579' : 'transparent', color: screen === id ? '#141A3A' : '#DCE6F0', border: 'none', borderRadius: 999, padding: '8px 14px', font: '500 13px "IBM Plex Sans Thai"', whiteSpace: 'nowrap' }}>{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** #/m/0427?p=id1,id2 → หน้ามือถือ (ไม่ต้องใช้สถานะของตู้) */
function parseMobile(hash: string): { code: string; ids: string[] } | null {
  const m = /^#\/m\/(\d{4})(?:\?(.*))?$/.exec(hash);
  if (!m) return null;
  const p = new URLSearchParams(m[2] || '').get('p');
  return { code: m[1], ids: p ? p.split(',').filter(x => /^[a-f0-9]{12}$/.test(x)) : [] };
}

export function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const mobile = parseMobile(hash);
  if (mobile) return <Mobile code={mobile.code} ids={mobile.ids} />;
  return <AppProvider><Shell /></AppProvider>;
}
