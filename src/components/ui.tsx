import type { CSSProperties, ReactNode } from 'react';
import { C, F } from '../theme';

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ flex: 'none', width: 52, height: 30, borderRadius: 999, border: 'none', background: on ? C.indigo : '#C6D5D2', position: 'relative', padding: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left .15s' }} />
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, pad = 10 }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; pad?: number;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length},1fr)`, gap: 4, background: '#E6F1EE', padding: 4, borderRadius: 10 }}>
      {options.map(([id, label]) => (
        <button key={String(id)} onClick={() => onChange(id)}
          style={{ background: id === value ? '#fff' : 'transparent', color: id === value ? C.indigo : C.muted, border: 'none', borderRadius: 8, padding: `${pad}px 0`, font: `500 14px ${F}` }}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function CardButton({ on, onClick, title, desc, disabled, children }: {
  on: boolean; onClick: () => void; title: string; desc?: string; disabled?: boolean; children?: ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ textAlign: 'left', background: on ? 'rgba(31,36,86,0.06)' : '#fff', border: `2px solid ${on ? C.indigo : C.line}`, borderRadius: 14, padding: 16, color: C.text, display: 'flex', flexDirection: 'column', gap: 4, fontFamily: F }}>
      <span style={{ font: `600 17px/1.3 ${F}`, color: C.indigo }}>{title}</span>
      {desc && <span style={{ fontSize: 13, color: C.muted, textWrap: 'pretty' } as CSSProperties}>{desc}</span>}
      {children}
    </button>
  );
}

export function SliderRow({ label, value, unit = '', min = 0, max = 100, onChange }: {
  label: string; value: number; unit?: string; min?: number; max?: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: C.muted }}>
        <span>{label}</span><span style={{ color: C.text }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

export const Logos = ({ psru = 52, arit = 30, gap = 16 }: { psru?: number; arit?: number; gap?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap }}>
    <img src="/assets/logo_psru.png" alt="PSRU" style={{ height: psru, width: 'auto' }} />
    <div style={{ width: 1, height: psru * 0.66, background: 'rgba(31,36,86,0.15)' }} />
    <img src="/assets/logo_arit.png" alt="ARIT PSRU" style={{ height: arit, width: 'auto' }} />
  </div>
);
