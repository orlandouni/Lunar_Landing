import type { Metrics, Sample } from '../types'

/** Regla del pipeline: visible = el > horizon[round(az) % 360] */
export function visible(el: number, az: number, horizon: number[]): boolean {
  const i = ((Math.round(az) % 360) + 360) % 360
  return el > horizon[i]
}

function longestRun(flags: boolean[], value: boolean): number {
  let best = 0
  let cur = 0
  for (const f of flags) {
    cur = f === value ? cur + 1 : 0
    if (cur > best) best = cur
  }
  return best
}

const pct = (a: number, n: number) => Math.round((1000 * a) / (n || 1)) / 10
const count = (a: boolean[]) => a.reduce((n, v) => n + (v ? 1 : 0), 0)

/** Igual que metrics() de build.py */
export function computeMetrics(samples: Sample[], horizon: number[]): Metrics {
  const sun = samples.map((s) => visible(s.sunEl, s.sunAz, horizon))
  const earth = samples.map((s) => visible(s.earthEl, s.earthAz, horizon))
  const both = sun.map((v, i) => v && earth[i])
  const n = samples.length
  return {
    hours: n,
    sunHours: count(sun),
    earthHours: count(earth),
    bothHours: count(both),
    sunPct: pct(count(sun), n),
    earthPct: pct(count(earth), n),
    bothPct: pct(count(both), n),
    longestDarkHours: longestRun(sun, false),
    longestNoCommHours: longestRun(earth, false),
  }
}

/** Fracción diaria (0..1) de horas con Sol+Tierra, para la tira de la línea de tiempo */
export function dailyBoth(samples: Sample[], horizon: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < samples.length; i += 24) {
    const day = samples.slice(i, i + 24)
    const ok = day.filter((s) => visible(s.sunEl, s.sunAz, horizon) && visible(s.earthEl, s.earthAz, horizon)).length
    out.push(ok / day.length)
  }
  return out
}

/** Color rojo → ámbar → verde según porcentaje */
export function scoreColor(p: number): string {
  const x = Math.max(0, Math.min(1, p / 100))
  return `hsl(${(130 * x).toFixed(0)} 40% 58%)`
}

export interface Flags {
  sun: Uint8Array // 1 = Sol visible en esa hora
  earth: Uint8Array // 1 = Tierra visible en esa hora
}

/** Visibilidad hora a hora (se calcula una vez por sitio y la usan todas las vistas) */
export function computeFlags(samples: Sample[], horizon: number[]): Flags {
  const n = samples.length
  const sun = new Uint8Array(n)
  const earth = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const s = samples[i]
    sun[i] = visible(s.sunEl, s.sunAz, horizon) ? 1 : 0
    earth[i] = visible(s.earthEl, s.earthAz, horizon) ? 1 : 0
  }
  return { sun, earth }
}

/** Métricas por mes ("2028-01" → Metrics), igual que summary.json de build.py */
export function monthlyMetrics(samples: Sample[], horizon: number[]): { month: string; m: Metrics }[] {
  const groups = new Map<string, Sample[]>()
  for (const s of samples) {
    const k = s.t.slice(0, 7)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }
  return [...groups.entries()].sort().map(([month, v]) => ({ month, m: computeMetrics(v, horizon) }))
}

/** Índice de la próxima hora (después de `from`) en que flags[i] === value; -1 si no hay */
export function nextChange(flags: Uint8Array, from: number, value: 0 | 1): number {
  for (let i = from + 1; i < flags.length; i++) if (flags[i] === value) return i
  return -1
}

/** Largo de la racha (en horas) que contiene a `i` con el mismo valor */
export function runAround(flags: Uint8Array, i: number): { start: number; end: number } {
  const v = flags[i]
  let a = i
  let b = i
  while (a > 0 && flags[a - 1] === v) a--
  while (b < flags.length - 1 && flags[b + 1] === v) b++
  return { start: a, end: b }
}

/** Duración legible: horas → "17 h" o "4.2 d" */
export function fmtHours(h: number): string {
  return h >= 48 ? `${(h / 24).toFixed(1)} d` : `${h} h`
}

/** Situación de un sitio en un instante dado (para recomendar según fecha y hora) */
export interface NowInfo {
  sun: boolean
  earth: boolean
  both: boolean
  windowH: number // horas seguidas con Sol + Tierra desde ahora (0 si no hay ambos ahora)
  next7Pct: number // % de las próximas 168 h con Sol + Tierra
  nextBothInH: number // horas hasta el próximo momento con ambos (0 si ya; -1 si no hay en el año)
  score: number // para ordenar: mayor = mejor candidato en este momento
}

export const MISSION_H = 168
/** Pendiente máxima habitual para aterrizar (grados) */
export const SAFE_SLOPE = 8 // 7 días: estancia típica en superficie de Artemis III (~6.5 d)

export function nowInfo(f: Flags, i: number): NowInfo {
  const n = f.sun.length
  const both = (k: number) => f.sun[k] === 1 && f.earth[k] === 1
  let windowH = 0
  for (let k = i; k < n && both(k); k++) windowH++
  const end = Math.min(n, i + MISSION_H)
  let ok = 0
  for (let k = i; k < end; k++) if (both(k)) ok++
  const next7Pct = Math.round((1000 * ok) / Math.max(1, end - i)) / 10
  let nextBothInH = -1
  for (let k = i; k < n; k++)
    if (both(k)) {
      nextBothInH = k - i
      break
    }
  // Primero los que tienen ambos ahora (más horas seguidas = mejor); luego los que los tendrán pronto
  const score = both(i) ? 1e6 + Math.min(windowH, MISSION_H) * 100 + next7Pct : nextBothInH >= 0 ? 1e5 - nextBothInH * 10 + next7Pct : next7Pct
  return { sun: f.sun[i] === 1, earth: f.earth[i] === 1, both: both(i), windowH, next7Pct, nextBothInH, score }
}
