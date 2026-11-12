export type Mode = 'full' | 'half' | 'group';
export type CutId = 'chroma' | 'ai' | 'hybrid';

export interface Bg {
  id: string;
  name: string;
  a: string;          // สีบน (ฉากสำรองแบบไล่สี)
  b: string;          // สีล่าง
  image?: string;     // URL ภาพฉากจริง (ฉากที่อัปโหลด)
}

// ฉากหลังตัวอย่างเป็นภาพไล่สีชั่วคราว ชื่อสถานที่ต้องแก้ให้ตรงกับจุดจริง (ดู README)
export const DEFAULT_BGS: Bg[] = [
  { id: 'gate', name: 'ซุ้มประตูมหาวิทยาลัย', a: 'oklch(0.78 0.07 235)', b: 'oklch(0.55 0.06 245)' },
  { id: 'lake', name: 'ริมสระทะเลแก้ว', a: 'oklch(0.82 0.07 205)', b: 'oklch(0.55 0.08 165)' },
  { id: 'hall', name: 'หอประชุมมหาวิทยาลัย', a: 'oklch(0.8 0.07 70)', b: 'oklch(0.55 0.07 45)' },
  { id: 'office', name: 'อาคารสำนักงานอธิการบดี', a: 'oklch(0.84 0.04 90)', b: 'oklch(0.6 0.04 80)' },
  { id: 'arch', name: 'ซุ้มแสดงความยินดี 2569', a: 'oklch(0.85 0.1 85)', b: 'oklch(0.58 0.11 40)' },
  { id: 'garden', name: 'สวนหน้าอาคารเรียนรวม', a: 'oklch(0.83 0.09 140)', b: 'oklch(0.55 0.09 150)' }
];

export const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'full', label: 'เต็มตัว', desc: '1–2 คน ยืนเต็มตัว' },
  { id: 'half', label: 'ครึ่งตัว', desc: 'ตั้งแต่เอวขึ้นไป' },
  { id: 'group', label: 'หมู่คณะ', desc: '3–8 คน พร้อมกัน' }
];

export const CUTS: { id: CutId; label: string; short: string; desc: string; live: string; final: string; ready: boolean }[] = [
  { id: 'chroma', label: 'Chroma Key', short: 'Chroma Key', ready: true,
    desc: 'ตัดจากสีเขียวล้วน เร็วที่สุด ต้องจัดไฟฉากเขียวให้สม่ำเสมอ',
    live: 'Chroma Key (WebGL shader) · เรียลไทม์', final: 'Chroma Key + ลดเงาสีเขียว' },
  { id: 'ai', label: 'AI ตัดเฉพาะคน', short: 'AI ตัดคน', ready: false,
    desc: 'โมเดลตรวจจับคนโดยตรง ใช้ได้แม้ไม่มีฉากเขียว แต่ขอบผมอาจไม่ละเอียดเท่า',
    live: 'MediaPipe Selfie Segmentation (ยังไม่เปิดใช้)', final: 'BiRefNet (ยังไม่เปิดใช้)' },
  { id: 'hybrid', label: 'ผสม (แนะนำ)', short: 'Chroma + AI', ready: false,
    desc: 'ใช้ Chroma Key เป็นหลัก แล้วให้ AI ตัดเฉพาะคนออก ตัดขาตั้ง/ของเกินขอบฉาก และเก็บขอบผม',
    live: 'Chroma Key + MediaPipe mask (ยังไม่เปิดใช้)', final: 'Chroma Key + RVM (ยังไม่เปิดใช้)' }
];

export const EVENT_NAME = 'งานพระราชทานปริญญาบัตร ประจำปีพุทธศักราช 2569';
export const UNI_NAME = 'มหาวิทยาลัยราชภัฏพิบูลสงคราม';
export const ORG_NAME = 'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ';

// เส้นของคนตัวอย่าง (ใช้ในภาพตัวอย่างและโหมดสาธิต)
export const PERSON_PATH =
  'M-8,27 L8,27 C22,30 26,34 27,48 L30,92 C30,96 25,97 24,93 L21,60 L19,100 L17,158 C17,162 6,162 7,158 L4,104 L-4,104 L-7,158 C-6,162 -17,162 -17,158 L-19,100 L-21,60 L-24,93 C-25,97 -30,96 -30,92 L-27,48 C-26,34 -22,30 -8,27 Z';
