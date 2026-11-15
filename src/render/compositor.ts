import type { Bg, Mode } from '../data';
import type { Settings } from '../settings';
import { frameSize, type FrameSource } from '../camera/manager';
import { averageColor, drawBackground, loadImage } from './background';
import { drawWatermark } from './watermark';

export type ViewKind = 'result' | 'raw' | 'matte';

export interface RenderParams {
  bg: Bg;
  mode: Mode;
  scale: number;           // ขนาดคนต่อฉาก
  settings: Settings;
  view: ViewKind;
  watermark: boolean;
}

const ASPECT = 3 / 2;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uVideo;
uniform sampler2D uBg;
uniform vec2 uCropScale;   // ตัดวิดีโอให้เป็นสัดส่วน 3:2
uniform vec2 uCropOffset;
uniform float uPersonScale;
uniform vec2 uKeyCbCr;
uniform float uTol;
uniform float uSoft;
uniform float uSpill;
uniform float uWrap;
uniform vec3 uGrade;
uniform int uView;         // 0 = ผลลัพธ์, 1 = ภาพดิบ, 2 = matte

vec2 personUv(vec2 uv){
  vec2 anchor = vec2(0.5, 1.0);
  return (uv - anchor) / uPersonScale + anchor;
}
vec2 videoUv(vec2 pu){ return pu * uCropScale + uCropOffset; }
vec2 cbcr(vec3 c){
  return vec2(-0.168736*c.r - 0.331264*c.g + 0.5*c.b, 0.5*c.r - 0.418688*c.g - 0.081312*c.b);
}
float keyAlpha(vec2 pu){
  if (pu.x < 0.0 || pu.x > 1.0 || pu.y < 0.0 || pu.y > 1.0) return 0.0;
  vec3 c = texture2D(uVideo, videoUv(pu)).rgb;
  float d = distance(cbcr(c), uKeyCbCr);
  float lo = uTol * 0.30;
  float hi = lo + uSoft * 0.30 + 0.002;
  return smoothstep(lo, hi, d);
}
void main(){
  if (uView == 1) { gl_FragColor = vec4(texture2D(uVideo, videoUv(vUv)).rgb, 1.0); return; }
  vec2 pu = personUv(vUv);
  float a = keyAlpha(pu);
  if (uView == 2) { gl_FragColor = vec4(vec3(a), 1.0); return; }

  vec3 bg = texture2D(uBg, vUv).rgb;
  vec3 c = texture2D(uVideo, videoUv(clamp(pu, 0.0, 1.0))).rgb;

  // ลดเงาสีเขียวบนตัวคน
  float lim = max(c.r, c.b);
  c.g = mix(c.g, min(c.g, lim), uSpill);
  // ปรับสีให้เข้ากับแสงของฉาก
  c = clamp(c * uGrade, 0.0, 1.0);

  // Light wrap: ดึงสีฉากมาเคลือบขอบตัวคน
  if (uWrap > 0.0) {
    float r = 0.014 / uPersonScale;
    float n = 0.0;
    n += keyAlpha(pu + vec2( r, 0.0)); n += keyAlpha(pu + vec2(-r, 0.0));
    n += keyAlpha(pu + vec2(0.0,  r)); n += keyAlpha(pu + vec2(0.0, -r));
    n += keyAlpha(pu + vec2( r,  r)); n += keyAlpha(pu + vec2(-r,  r));
    n += keyAlpha(pu + vec2( r, -r)); n += keyAlpha(pu + vec2(-r, -r));
    float edge = a * (1.0 - n / 8.0);
    c = mix(c, bg * 1.15, clamp(edge * uWrap * 0.9, 0.0, 0.7));
  }
  gl_FragColor = vec4(mix(bg, c, a), 1.0);
}`;

function hexToCbCr(hex: string): [number, number] {
  const v = parseInt(hex.replace('#', '') || '00B140', 16);
  const r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
  return [-0.168736 * r - 0.331264 * g + 0.5 * b, 0.5 * r - 0.418688 * g - 0.081312 * b];
}

/** ตัวผสมภาพ: ดึงเฟรมจากกล้อง → ตัดพื้นเขียวบน GPU → วางบนฉาก → ลายน้ำ (วาดลงแคนวาสปลายทาง) */
export class Compositor {
  readonly out = document.createElement('canvas');          // ผลลัพธ์ (2D) ใช้แสดงผลและบันทึก
  private gl: WebGLRenderingContext;
  private glCanvas = document.createElement('canvas');
  private bgCanvas = document.createElement('canvas');
  private bgCtx = this.bgCanvas.getContext('2d', { willReadFrequently: true })!;
  private outCtx = this.out.getContext('2d')!;
  private prog: WebGLProgram;
  private videoTex: WebGLTexture;
  private bgTex: WebGLTexture;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private bgKey = '';
  private bgImg: HTMLImageElement | null = null;
  private bgImgFor = '';
  private grade: [number, number, number] = [1, 1, 1];
  private lastError = '';

  constructor(width: number, height = Math.round(width / ASPECT)) {
    this.resize(width, height);
    const gl = this.glCanvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('เบราว์เซอร์นี้ไม่รองรับ WebGL');
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    this.prog = p;
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uVideo', 'uBg', 'uCropScale', 'uCropOffset', 'uPersonScale', 'uKeyCbCr', 'uTol', 'uSoft', 'uSpill', 'uWrap', 'uGrade', 'uView'])
      this.u[n] = gl.getUniformLocation(p, n);
    const mkTex = (unit: number) => {
      const t = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.videoTex = mkTex(0);
    this.bgTex = mkTex(1);
    gl.uniform1i(this.u.uVideo, 0);
    gl.uniform1i(this.u.uBg, 1);
  }

  resize(w: number, h: number) {
    for (const c of [this.out, this.glCanvas, this.bgCanvas]) { c.width = w; c.height = h; }
    this.bgKey = '';
    this.gl?.viewport(0, 0, w, h);
  }
  get width() { return this.out.width; }
  get height() { return this.out.height; }
  get error() { return this.lastError; }

  private async ensureBgImage(bg: Bg) {
    if (!bg.image) { this.bgImg = null; this.bgImgFor = ''; return; }
    if (this.bgImgFor === bg.image) return;
    this.bgImgFor = bg.image;
    try { this.bgImg = await loadImage(bg.image); this.bgKey = ''; this.lastError = ''; }
    catch (e) { this.bgImg = null; this.lastError = (e as Error).message; }
  }

  /** เรนเดอร์ 1 เฟรมลง `out` ภาพที่ได้พร้อมแสดงหรือบันทึก */
  render(src: FrameSource | null, p: RenderParams) {
    const { w, h } = this.width ? { w: this.width, h: this.height } : { w: 0, h: 0 };
    const gl = this.gl;
    void this.ensureBgImage(p.bg);

    // 1) ฉากหลัง (วาดใหม่เมื่อค่าเปลี่ยน)
    const key = [p.bg.id, p.bg.image ?? '', !!this.bgImg, p.mode, p.scale, p.settings.fx.blur, p.settings.fx.shadow, w, h].join('|');
    if (key !== this.bgKey) {
      drawBackground(this.bgCtx, w, h, p.bg, this.bgImg, p.mode, p.scale, p.settings.fx);
      const avg = averageColor(this.bgCanvas);
      const k = p.settings.fx.color ? 0.35 : 0;     // ปรับสีคนเข้าหาแสงฉากเล็กน้อย
      const lum = (avg[0] + avg[1] + avg[2]) / 3 || 0.5;
      this.grade = [1, 1, 1].map((_, i) => 1 + ((avg[i] / lum) - 1) * k) as [number, number, number];
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.bgCanvas);
      this.bgKey = key;
    }

    const fs = src ? frameSize(src) : { w: 0, h: 0 };
    if (!src || !fs.w || !fs.h) {
      // ยังไม่มีเฟรม: แสดงฉากเปล่า
      this.outCtx.drawImage(this.bgCanvas, 0, 0, w, h);
      if (p.watermark) drawWatermark(this.outCtx, w, h, p.settings);
      return false;
    }

    // 2) อัปโหลดเฟรมกล้อง
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
    } catch (e) {
      this.lastError = (e as Error).message;
      return false;
    }

    // 3) ตัดให้เป็น 3:2 จากกลางภาพ
    const va = fs.w / fs.h;
    let cs: [number, number] = [1, 1], co: [number, number] = [0, 0];
    if (va > ASPECT) { cs = [ASPECT / va, 1]; co = [(1 - cs[0]) / 2, 0]; }
    else if (va < ASPECT) { cs = [1, va / ASPECT]; co = [0, (1 - cs[1]) / 2]; }

    const s = p.settings;
    gl.uniform2f(this.u.uCropScale, cs[0], cs[1]);
    gl.uniform2f(this.u.uCropOffset, co[0], co[1]);
    gl.uniform1f(this.u.uPersonScale, p.scale);
    const [cb, cr] = hexToCbCr(s.keyColor);
    gl.uniform2f(this.u.uKeyCbCr, cb, cr);
    gl.uniform1f(this.u.uTol, s.tol / 100);
    gl.uniform1f(this.u.uSoft, s.soft / 100);
    gl.uniform1f(this.u.uSpill, s.spill / 100);
    gl.uniform1f(this.u.uWrap, s.fx.wrap ? 1 : 0);
    gl.uniform3f(this.u.uGrade, this.grade[0], this.grade[1], this.grade[2]);
    gl.uniform1i(this.u.uView, p.view === 'raw' ? 1 : p.view === 'matte' ? 2 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 4) คัดลอกลงแคนวาส 2D แล้วใส่ลายน้ำ
    this.outCtx.drawImage(this.glCanvas, 0, 0, w, h);
    if (p.watermark && p.view === 'result') drawWatermark(this.outCtx, w, h, s);
    return true;
  }

  toBlob(quality = 0.92): Promise<Blob> {
    return new Promise((res, rej) => this.out.toBlob(b => (b ? res(b) : rej(new Error('สร้างไฟล์ภาพไม่สำเร็จ'))), 'image/jpeg', quality));
  }

  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

/** ขนาดภาพจริงตอนถ่าย: สูงเท่าวิดีโอ (ไม่ขยาย) จำกัดที่ 2160 พิกเซล สัดส่วน 3:2 */
export function captureSize(src: FrameSource): { w: number; h: number } {
  const { w, h } = frameSize(src);
  const maxH = Math.min(h || 1080, 2160);
  const hh = Math.min(maxH, Math.floor((w || 1620) / ASPECT));
  return { w: Math.round(hh * ASPECT), h: hh };
}
