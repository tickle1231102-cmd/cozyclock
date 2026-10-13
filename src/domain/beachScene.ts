import { scenicNightStarsOpacity } from './scenicTime'

/** Beach theme — sandy shore, umbrellas, and gentle surf. */

export const BEACH_THEME_ID = 'beach'

export type BeachSceneState = {
  skyTop: string
  skyMid: string
  skyBottom: string
  seaDeep: string
  seaMid: string
  seaShallow: string
  sand: string
  dune: string
  grass: string
  umbrella: string
  horizon: string
  sparkleOpacity: number
  waveOpacity: number
  glowOpacity: number
  starsOpacity: number
  /** Hour of day (0–24) this scene was sampled at, for the 3D background. */
  hour: number
  fg: string
  accent: string
}

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n))
}

function parseHex(hex: string): [number, number, number] | null {
  const raw = hex.replace('#', '')
  if (raw.length !== 6) return null
  const r = Number.parseInt(raw.slice(0, 2), 16)
  const g = Number.parseInt(raw.slice(2, 4), 16)
  const b = Number.parseInt(raw.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return [r, g, b]
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function mix(a: string, b: string, t: number): string {
  const A = parseHex(a)
  const B = parseHex(b)
  if (!A || !B) return a
  const u = clamp(t)
  return toHex(
    A[0] + (B[0] - A[0]) * u,
    A[1] + (B[1] - A[1]) * u,
    A[2] + (B[2] - A[2]) * u,
  )
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function dayHour(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
}

type BeachKeyframe = {
  hour: number
  skyTop: string
  skyMid: string
  skyBottom: string
  seaDeep: string
  seaMid: string
  seaShallow: string
  sand: string
  dune: string
  grass: string
  umbrella: string
  horizon: string
  fg: string
  accent: string
  sparkleOpacity: number
  waveOpacity: number
  glowOpacity: number
}

const KEYFRAMES: BeachKeyframe[] = [
  {
    hour: 0,
    skyTop: '#142038',
    skyMid: '#1c3050',
    skyBottom: '#2a4860',
    seaDeep: '#123040',
    seaMid: '#1c4860',
    seaShallow: '#3a6880',
    sand: '#3a342c',
    dune: '#2e2822',
    grass: '#1a2820',
    umbrella: '#3a2830',
    horizon: '#3a5870',
    fg: '#f0f4f8',
    accent: '#e8b878',
    sparkleOpacity: 0.35,
    waveOpacity: 0.48,
    glowOpacity: 0.18,
  },
  {
    hour: 5.4,
    skyTop: '#3a4868',
    skyMid: '#c88870',
    skyBottom: '#f0c090',
    seaDeep: '#2a5068',
    seaMid: '#4a7890',
    seaShallow: '#88b0b8',
    sand: '#d4b090',
    dune: '#c4a078',
    grass: '#3a5040',
    umbrella: '#8a4858',
    horizon: '#f0b888',
    fg: '#fff8f0',
    accent: '#f0b070',
    sparkleOpacity: 0.3,
    waveOpacity: 0.52,
    glowOpacity: 0.5,
  },
  {
    hour: 7.4,
    skyTop: '#68c0ec',
    skyMid: '#98d8f4',
    skyBottom: '#f8e8c8',
    seaDeep: '#2a98b8',
    seaMid: '#48c0d0',
    seaShallow: '#88dce4',
    sand: '#f4e0b0',
    dune: '#ecd4a0',
    grass: '#4a8858',
    umbrella: '#e07070',
    horizon: '#f8dcb0',
    fg: '#f8fcfd',
    accent: '#f0c070',
    sparkleOpacity: 0.7,
    waveOpacity: 0.62,
    glowOpacity: 0.55,
  },
  {
    hour: 11,
    skyTop: '#5ab8e8',
    skyMid: '#88d0f0',
    skyBottom: '#c8ecf8',
    seaDeep: '#2aa0c0',
    seaMid: '#50c8d8',
    seaShallow: '#90e0e8',
    sand: '#f2d7a4',
    dune: '#e8c888',
    grass: '#3e8a4e',
    umbrella: '#e45c5c',
    horizon: '#b8e0ec',
    fg: '#f7fcfd',
    accent: '#f0b45a',
    sparkleOpacity: 0.82,
    waveOpacity: 0.68,
    glowOpacity: 0.42,
  },
  {
    hour: 15,
    skyTop: '#5aacd0',
    skyMid: '#7cc0d8',
    skyBottom: '#c0dce8',
    seaDeep: '#2890b0',
    seaMid: '#48b4c8',
    seaShallow: '#80d0d8',
    sand: '#ecd0a0',
    dune: '#dcc088',
    grass: '#3a7a48',
    umbrella: '#d45454',
    horizon: '#a8d0dc',
    fg: '#f4f8fa',
    accent: '#e8a848',
    sparkleOpacity: 0.72,
    waveOpacity: 0.64,
    glowOpacity: 0.38,
  },
  {
    hour: 17.8,
    skyTop: '#4a6088',
    skyMid: '#e07850',
    skyBottom: '#f8b070',
    seaDeep: '#2a5868',
    seaMid: '#5a8898',
    seaShallow: '#c0a090',
    sand: '#e8b888',
    dune: '#d4a070',
    grass: '#3a5038',
    umbrella: '#b04848',
    horizon: '#f09060',
    fg: '#fff6ee',
    accent: '#f0a060',
    sparkleOpacity: 0.5,
    waveOpacity: 0.58,
    glowOpacity: 0.4,
  },
  {
    hour: 19.5,
    skyTop: '#1c2848',
    skyMid: '#485878',
    skyBottom: '#887888',
    seaDeep: '#1a3048',
    seaMid: '#2a4860',
    seaShallow: '#4a6880',
    sand: '#5a4c44',
    dune: '#4a4038',
    grass: '#243028',
    umbrella: '#5a3038',
    horizon: '#687890',
    fg: '#eef0f6',
    accent: '#d8b090',
    sparkleOpacity: 0.32,
    waveOpacity: 0.5,
    glowOpacity: 0.22,
  },
  {
    hour: 22,
    skyTop: '#101828',
    skyMid: '#182838',
    skyBottom: '#243848',
    seaDeep: '#102030',
    seaMid: '#183848',
    seaShallow: '#2a5060',
    sand: '#322e28',
    dune: '#282420',
    grass: '#162018',
    umbrella: '#302028',
    horizon: '#304858',
    fg: '#e8eef4',
    accent: '#c8a878',
    sparkleOpacity: 0.3,
    waveOpacity: 0.46,
    glowOpacity: 0.14,
  },
  {
    hour: 24,
    skyTop: '#142038',
    skyMid: '#1c3050',
    skyBottom: '#2a4860',
    seaDeep: '#123040',
    seaMid: '#1c4860',
    seaShallow: '#3a6880',
    sand: '#3a342c',
    dune: '#2e2822',
    grass: '#1a2820',
    umbrella: '#3a2830',
    horizon: '#3a5870',
    fg: '#f0f4f8',
    accent: '#e8b878',
    sparkleOpacity: 0.35,
    waveOpacity: 0.48,
    glowOpacity: 0.18,
  },
]

function sampleBeach(hour: number): Omit<BeachKeyframe, 'hour'> {
  const h = ((hour % 24) + 24) % 24
  let i = 0
  while (i < KEYFRAMES.length - 1 && KEYFRAMES[i + 1].hour <= h) i += 1
  const a = KEYFRAMES[i]
  const b = KEYFRAMES[Math.min(i + 1, KEYFRAMES.length - 1)]
  const span = Math.max(1e-6, b.hour - a.hour)
  const t = smoothstep(0, 1, (h - a.hour) / span)
  const lerpN = (x: number, y: number) => x + (y - x) * t
  return {
    skyTop: mix(a.skyTop, b.skyTop, t),
    skyMid: mix(a.skyMid, b.skyMid, t),
    skyBottom: mix(a.skyBottom, b.skyBottom, t),
    seaDeep: mix(a.seaDeep, b.seaDeep, t),
    seaMid: mix(a.seaMid, b.seaMid, t),
    seaShallow: mix(a.seaShallow, b.seaShallow, t),
    sand: mix(a.sand, b.sand, t),
    dune: mix(a.dune, b.dune, t),
    grass: mix(a.grass, b.grass, t),
    umbrella: mix(a.umbrella, b.umbrella, t),
    horizon: mix(a.horizon, b.horizon, t),
    fg: mix(a.fg, b.fg, t),
    accent: mix(a.accent, b.accent, t),
    sparkleOpacity: lerpN(a.sparkleOpacity, b.sparkleOpacity),
    waveOpacity: lerpN(a.waveOpacity, b.waveOpacity),
    glowOpacity: lerpN(a.glowOpacity, b.glowOpacity),
  }
}

export function getBeachSceneState(date: Date = new Date()): BeachSceneState {
  const hour = dayHour(date)
  return { ...sampleBeach(hour), starsOpacity: scenicNightStarsOpacity(hour), hour }
}

export function beachFlatBg(scene: BeachSceneState): string {
  return mix(scene.sand, scene.skyMid, 0.42)
}
