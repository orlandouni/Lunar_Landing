// Datos SIMULADOS con la misma forma que los reales. Geometría aproximada, solo para desarrollar la UI.
// Sirve para cualquier coordenada (no solo el polo): se simula el punto subsolar y el sub-terrestre
// en el marco fijo a la Luna y se pasan al cielo local del sitio.
import type { Dataset, Sample, Site } from '../types'
import { ARTEMIS, NOTABLE } from './catalog'

const START = Date.UTC(2028, 0, 1)
const HOURS = 8784 // 2028 es bisiesto
const SYNODIC = 29.530589 * 24
const DRACONIC = 346.62 * 24 // ciclo de la latitud subsolar (±1.54°)
const LIB_LAT = 27.212 * 24
const LIB_LON = 27.5545 * 24
const D = Math.PI / 180
const R_KM = 1737.4
const EARTH_KM = 384400
const mod = (a: number, m: number) => ((a % m) + m) % m

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

function mockHorizon(seed: number): number[] {
  const r = rng(seed)
  const waves = Array.from({ length: 6 }, (_, k) => ({ f: k + 1, a: (1.6 / (k + 1)) * r(), p: r() * 2 * Math.PI }))
  const base = r() * 1.2 - 0.6
  return Array.from({ length: 360 }, (_, az) => {
    let h = base
    for (const w of waves) h += w.a * Math.sin(w.f * az * D + w.p)
    return Math.round(Math.max(-1.8, h) * 100) / 100
  })
}

const unit = (lat: number, lon: number) => [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)]

/** Azimut (desde el Norte hacia el Este) y elevación de la dirección v vista desde (lat, lon) */
function azEl(v: number[], lat: number, lon: number): [number, number] {
  const sl = Math.sin(lat * D)
  const cl = Math.cos(lat * D)
  const so = Math.sin(lon * D)
  const co = Math.cos(lon * D)
  const e = -so * v[0] + co * v[1]
  const n = -sl * co * v[0] - sl * so * v[1] + cl * v[2]
  const u = cl * co * v[0] + cl * so * v[1] + sl * v[2]
  const len = Math.hypot(e, n, u)
  return [mod(Math.atan2(e, n) / D, 360), Math.asin(u / len) / D]
}

export function mockSamplesAt(site: { lat: number; lon: number }): Sample[] {
  const p = unit(site.lat, site.lon).map((x) => x * R_KM)
  const out: Sample[] = []
  for (let h = 0; h < HOURS; h++) {
    // Sol: el punto subsolar da una vuelta por mes sinódico; su latitud oscila ±1.54°
    const sun = unit(1.54 * Math.sin((2 * Math.PI * h) / DRACONIC), mod(180 - (360 * h) / SYNODIC, 360))
    // Tierra: casi fija sobre (0°, 0°), se mece por la libración
    const se = unit(6.7 * Math.sin((2 * Math.PI * h) / LIB_LAT), 7.9 * Math.sin((2 * Math.PI * h) / LIB_LON))
    const earth = se.map((x, k) => x * EARTH_KM - p[k])
    const [sunAz, sunEl] = azEl(sun, site.lat, site.lon)
    const [earthAz, earthEl] = azEl(earth, site.lat, site.lon)
    out.push({
      t: new Date(START + h * 3600e3).toISOString().slice(0, 19) + 'Z',
      sunAz: +sunAz.toFixed(2),
      sunEl: +sunEl.toFixed(3),
      earthAz: +earthAz.toFixed(2),
      earthEl: +earthEl.toFixed(3),
    })
  }
  return out
}

export function buildMockDataset(): Dataset {
  const sites: Site[] = [...ARTEMIS, ...NOTABLE].map((s, i) => ({
    ...s,
    elevM: null,
    // horizonte inventado en el polo; plano en las misiones de latitudes medias
    horizon: s.group === 'artemis' ? mockHorizon(1000 + i * 77) : new Array(360).fill(0),
    horizonSource: s.group === 'artemis' ? 'mock' : 'flat',
    dataSource: 'mock',
  }))
  const samples: Record<string, Sample[]> = {}
  for (const s of sites) samples[s.id] = mockSamplesAt(s)
  return { source: 'mock', terrain: null, sites, samples, times: samples[sites[0].id].map((x) => x.t) }
}
