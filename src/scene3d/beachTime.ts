import * as THREE from 'three';
import { scenicNightStarsOpacity } from '../domain/scenicTime';

// Time-of-day keyframes for the 3D beach. Sky colours follow the 2D beach
// palette in ../domain/beachScene.ts; the rest is 3D lighting.
const KEYS = [
  { hour: 0,    sky: ['#142038', '#1c3050', '#2a4860'], shallow: '#1c4858', deep: '#06141f', light: '#a8bce8', lightI: 1.1, hemi: ['#5a6a98', '#4a4238'], hemiI: 1.0, cloud: '#34445e', fog: '#22384c', exposure: 1.0 },
  { hour: 5.4,  sky: ['#3a4868', '#c88870', '#f0c090'], shallow: '#3a8090', deep: '#123048', light: '#ffb080', lightI: 1.0,  hemi: ['#c8a0a0', '#a08070'], hemiI: 0.8,  cloud: '#f0b0a0', fog: '#d8a890', exposure: 1.0 },
  { hour: 7.4,  sky: ['#68c0ec', '#98d8f4', '#f8e8c8'], shallow: '#20c0c8', deep: '#03305a', light: '#fff0d8', lightI: 2.2,  hemi: ['#cfe9ff', '#e8c890'], hemiI: 1.2,  cloud: '#ffffff', fog: '#e0ecef', exposure: 1.05 },
  { hour: 11,   sky: ['#5ab8e8', '#88d0f0', '#c8ecf8'], shallow: '#12c8cc', deep: '#01284a', light: '#fff8ec', lightI: 2.8,  hemi: ['#cfe9ff', '#e8c890'], hemiI: 1.4,  cloud: '#ffffff', fog: '#cfe6ef', exposure: 1.05 },
  { hour: 15,   sky: ['#5aacd0', '#7cc0d8', '#c0dce8'], shallow: '#14b8c0', deep: '#022a48', light: '#fff0d8', lightI: 2.5,  hemi: ['#c8e0f0', '#e0c090'], hemiI: 1.3,  cloud: '#ffffff', fog: '#c8dde6', exposure: 1.05 },
  { hour: 17.8, sky: ['#4a6088', '#e07850', '#f8b070'], shallow: '#4a98a0', deep: '#0c2c44', light: '#ff9a60', lightI: 1.7,  hemi: ['#e0a090', '#c08060'], hemiI: 0.9,  cloud: '#ffc0a0', fog: '#f0a880', exposure: 1.05 },
  { hour: 19.5, sky: ['#1c2848', '#485878', '#887888'], shallow: '#2a6070', deep: '#081c2c', light: '#b0a0d0', lightI: 0.9, hemi: ['#7070a0', '#544640'], hemiI: 0.9,  cloud: '#7a6a88', fog: '#4a5068', exposure: 1.0 },
  { hour: 22,   sky: ['#101828', '#182838', '#243848'], shallow: '#183c4a', deep: '#04101a', light: '#9ab0e0', lightI: 0.5,  hemi: ['#2e3a60', '#262220'], hemiI: 0.5,  cloud: '#2a3850', fog: '#1a2838', exposure: 1.0 },
];
KEYS.push({ ...KEYS[0], hour: 24 });

export const PHASES = [
  { id: 'dawn', label: '새벽', hour: 5.6 },
  { id: 'morning', label: '아침', hour: 7.8 },
  { id: 'noon', label: '낮', hour: 12 },
  { id: 'afternoon', label: '오후', hour: 15.5 },
  { id: 'sunset', label: '노을', hour: 18.0 },
  { id: 'dusk', label: '저녁', hour: 19.6 },
  { id: 'night', label: '밤', hour: 23 },
];

const smooth = (t: number) => t * t * (3 - 2 * t);
const smoothstep = (a: number, b: number, x: number) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));
const c = (h: string) => new THREE.Color(h);


export function sample(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (KEYS[i + 1].hour <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth((h - a.hour) / (b.hour - a.hour));
  const mixC = (x: string, y: string) => c(x).lerp(c(y), t);
  const mixN = (x: number, y: number) => x + (y - x) * t;

  // Sun arcs from the left (sunrise 6:00) and sets ahead-right over the sea (18:40).
  const day = (h - 6) / 12.67;
  const el = Math.sin(Math.PI * day) * 1.05;
  const az = THREE.MathUtils.degToRad(-110 + 135 * Math.min(1, Math.max(0, day)));
  const sunDir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).normalize();
  const moonDir = new THREE.Vector3(0.35, 0.55, -0.75).normalize();
  const sunUp = smoothstep(-0.06, 0.04, sunDir.y);

  return {
    h,
    skyTop: mixC(a.sky[0], b.sky[0]),
    skyMid: mixC(a.sky[1], b.sky[1]),
    skyBottom: mixC(a.sky[2], b.sky[2]),
    shallow: mixC(a.shallow, b.shallow),
    deep: mixC(a.deep, b.deep),
    light: mixC(a.light, b.light),
    lightI: mixN(a.lightI, b.lightI),
    hemiSky: mixC(a.hemi[0], b.hemi[0]),
    hemiGround: mixC(a.hemi[1], b.hemi[1]),
    hemiI: mixN(a.hemiI, b.hemiI),
    cloud: mixC(a.cloud, b.cloud),
    fog: mixC(a.fog, b.fog),
    exposure: mixN(a.exposure, b.exposure),
    sunDir,
    moonDir,
    sunUp,
    // key light follows the sun by day, the moon by night
    keyDir: sunUp > 0.5 ? sunDir : moonDir,
    stars: scenicNightStarsOpacity(h),
    shadow: 0.35 + 0.5 * sunUp * smoothstep(0.05, 0.3, sunDir.y),
  };
}

// Gradient sky dome with sun disc + halo, moon and a star field.
export function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uSunColor: { value: new THREE.Color() },
      uSunUp: { value: 1 },
      uMoonDir: { value: new THREE.Vector3() },
      uStars: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; gl_Position.z *= 0.9999;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uBottom, uSunDir, uSunColor, uMoonDir;
      uniform float uSunUp, uStars, uTime;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        float y = d.y;
        vec3 col = mix(uBottom, uMid, smoothstep(-0.02, 0.18, y));
        col = mix(col, uTop, smoothstep(0.18, 0.75, y));
        float s = max(dot(d, uSunDir), 0.0);
        float vis = smoothstep(-0.15, 0.05, uSunDir.y);
        col += uSunColor * (pow(s, 8.0) * 0.35 + pow(s, 400.0) * 0.6) * vis;
        col = mix(col, vec3(1.0, 0.97, 0.9), smoothstep(0.99955, 0.9997, s) * vis * step(-0.01, y));
        // stars twinkle in hashed cells, only above the horizon
        vec3 cell = floor(d * 220.0);
        float r = hash(cell);
        float star = step(0.985, r) * smoothstep(0.02, 0.2, y);
        star *= 0.6 + 0.4 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);
        col += vec3(0.95, 0.97, 1.0) * star * uStars;
        // moon
        float m = dot(d, uMoonDir);
        float moonVis = 1.0 - uSunUp;
        col = mix(col, vec3(0.96, 0.95, 0.88), smoothstep(0.99955, 0.9997, m) * moonVis);
        col += vec3(0.6, 0.7, 0.9) * pow(max(m, 0.0), 200.0) * 0.25 * moonVis;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), material);
  mesh.frustumCulled = false;
  return mesh;
}
