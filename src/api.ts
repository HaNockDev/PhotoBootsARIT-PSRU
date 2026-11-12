import type { Mode } from './data';

export interface Shot { id: string; bgId: string; mode: Mode; at: number }
export interface CustomBg { id: string; name: string }

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${(await res.text().catch(() => '')).slice(0, 120)}`);
  return res.json();
}

export const api = {
  state: () => fetch('/api/state').then(j<{ code: string }>),
  next: () => fetch('/api/next', { method: 'POST' }).then(j<{ code: string }>),
  stats: () => fetch('/api/stats').then(j<{ total: number; today: number; byBg: Record<string, number> }>),
  session: (code: string) => fetch(`/api/sessions/${code}`).then(j<{ code: string; shots: Shot[] }>),
  upload: (code: string, bgId: string, mode: Mode, blob: Blob) =>
    fetch(`/api/photos?code=${code}&bgId=${encodeURIComponent(bgId)}&mode=${mode}`, {
      method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob
    }).then(j<Shot>),
  removePhoto: (id: string) => fetch(`/api/photos/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>),
  backgrounds: () => fetch('/api/backgrounds').then(j<{ backgrounds: CustomBg[] }>),
  uploadBg: (name: string, blob: Blob) =>
    fetch(`/api/backgrounds?name=${encodeURIComponent(name)}`, {
      method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob
    }).then(j<CustomBg>),
  removeBg: (id: string) => fetch(`/api/backgrounds/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>)
};

export const photoUrl = (id: string, dl = false) => `/api/photos/${id}.jpg${dl ? '?dl=1' : ''}`;
export const bgUrl = (id: string) => `/api/backgrounds/${id}.jpg`;
