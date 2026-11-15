import type { CSSProperties } from 'react';
import { EVENT_NAME, PERSON_PATH, UNI_NAME, type Bg, type Mode } from '../data';
import type { Settings } from '../settings';
import { shadowSpots } from '../render/background';
import { F } from '../theme';

type CompMode = Mode | 'none';
interface Props {
  bg?: Pick<Bg, 'a' | 'b' | 'name' | 'image'>;
  mode?: CompMode;
  fx?: Settings['fx'];
  real?: boolean;
  scale?: number;
  wm?: boolean;
  wmPos?: Settings['wmPos'];
  wmOpacity?: number;
  wmEvent?: boolean;
  guides?: boolean;
  label?: boolean;
  green?: boolean;
  matte?: boolean;
  style?: CSSProperties;
}

/** ภาพตัวอย่างแบบคนเงาดำบนฉากหลัง (พอร์ตจาก Composite v3) ใช้ในหน้าเลือกฉาก/หลังบ้าน */
export function Composite(p: Props) {
  const bg = p.bg ?? { a: '#8a8fa0', b: '#4a4e5c', name: '' };
  const mode: CompMode = p.mode ?? 'full';
  const real = !!p.real, matte = !!p.matte, green = !!p.green;
  const fx = p.fx ?? { wrap: true, shadow: true, color: true, blur: 30 };
  const scale = p.scale ?? 1;
  const wmOpacity = p.wmOpacity ?? 0.95;
  const showWm = !!p.wm && !matte;

  const people =
    mode === 'full' ? [`translate(150,38) scale(${scale})`]
    : mode === 'half' ? ['translate(150,34) scale(2.2)']
    : mode === 'group' ? ['translate(88,50) scale(0.88)', 'translate(212,50) scale(0.88)', 'translate(150,42) scale(0.93)']
    : [];
  const wrap = real && fx.wrap && !matte;
  const personFill = matte ? '#fff' : green ? '#3a3640' : real && fx.color ? '#4a4152' : '#111014';
  const blur = real && !matte && !green ? `${(fx.blur / 100) * 0.8}cqw` : '0px';
  const bgStyle = matte ? '#000' : green ? 'linear-gradient(180deg,#25b24f,#178a3b)' : `linear-gradient(180deg, ${bg.a}, ${bg.b})`;
  const justify = (p.wmPos ?? 'right') === 'left' ? 'flex-start' : p.wmPos === 'center' ? 'center' : 'flex-end';
  const showFloor = !matte && !green && mode !== 'none';
  const shadows = real && fx.shadow && !matte && !green && mode !== 'none' ? shadowSpots(mode, scale) : [];

  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '3/2', overflow: 'hidden', containerType: 'inline-size', background: matte ? '#000' : green ? '#1f9e45' : bg.b, borderRadius: 'inherit', ...p.style }}>
      <div style={{ position: 'absolute', inset: '-4%', filter: `blur(${blur})`, background: bgStyle }}>
        {!matte && !green && bg.image && <img src={bg.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {!matte && !green && !bg.image && <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px)' }} />}
        {showFloor && !bg.image && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '24%', background: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.32))', borderTop: '1px solid rgba(255,255,255,0.12)' }} />}
      </div>
      {p.label && <div style={{ position: 'absolute', top: '4cqw', left: '4cqw', font: `500 2.6cqw/1.3 ${F}`, color: 'rgba(255,255,255,0.75)' }}>ภาพฉาก · {bg.name}</div>}
      {shadows.map((s, i) => (
        <div key={i} style={{ position: 'absolute', left: `${s.x}%`, width: `${s.w}%`, bottom: `${s.bottom}%`, height: '2.6cqw', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.5), transparent)', transform: 'translateX(-50%)' }} />
      ))}
      <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <g style={{ fill: personFill, stroke: wrap ? bg.a : 'transparent', strokeWidth: wrap ? 2.4 : 0, strokeOpacity: 0.6 }}>
          {people.map((t, i) => (
            <g key={i} transform={t}>
              <circle cx="0" cy="14" r="12" />
              <path d={PERSON_PATH} />
            </g>
          ))}
        </g>
      </svg>
      {p.guides && (
        <>
          <div style={{ position: 'absolute', inset: '6%', border: '1px dashed rgba(255,255,255,0.5)', borderRadius: 4 }} />
          {[33.33, 66.66].map(x => <div key={'v' + x} style={{ position: 'absolute', left: `${x}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.16)' }} />)}
          {[33.33, 66.66].map(y => <div key={'h' + y} style={{ position: 'absolute', top: `${y}%`, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.16)' }} />)}
        </>
      )}
      {showWm && (
        <div style={{ position: 'absolute', left: '3.5cqw', right: '3.5cqw', bottom: '3cqw', display: 'flex', justifyContent: justify, opacity: wmOpacity }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.4cqw', filter: 'drop-shadow(0 0.2cqw 0.6cqw rgba(0,0,0,0.45))' }}>
            <img src="/assets/logo_psru.png" alt="" style={{ height: '6cqw', width: 'auto', display: 'block' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3cqw' }}>
              <div style={{ font: `600 2.1cqw/1.2 ${F}`, color: '#fff' }}>{UNI_NAME}</div>
              {(p.wmEvent ?? true) && <div style={{ font: `500 1.5cqw/1.2 ${F}`, color: '#B8F0CF' }}>{EVENT_NAME}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
