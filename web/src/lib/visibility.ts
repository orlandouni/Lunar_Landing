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
  return `hsl(${(130 * x).toFixed(0)} 75% 55%)`
}
