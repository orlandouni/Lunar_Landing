// Datos SIMULADOS con la misma forma que los reales. Geometría aproximada, solo para desarrollar la UI.
import type { Dataset, Sample, Site } from '../types'

const SITES: Pick<Site, 'id' | 'name' | 'lat' | 'lon'>[] = [
  { id: 'peak-near-cabeus-b', name: 'Peak near Cabeus B', lat: -84.1, lon: -55.0 },
  { id: 'haworth', name: 'Haworth', lat: -86.9, lon: -4.0 },
  { id: 'malapert-massif', name: 'Malapert Massif', lat: -85.99, lon: 2.93 },
  { id: 'mons-mouton-plateau', name: 'Mons Mouton Plateau', lat: -85.4, lon: 31.5 },
  { id: 'mons-mouton', name: 'Mons Mouton', lat: -84.6, lon: 31.0 },
  { id: 'nobile-rim-1', name: 'Nobile Rim 1', lat: -86.45, lon: 53.27 },
  { id: 'nobile-rim-2', name: 'Nobile Rim 2', lat: -85.0, lon: 68.0 },
  { id: 'de-gerlache-rim-2', name: 'de Gerlache Rim 2', lat: -88.2, lon: -66.0 },
  { id: 'slater-plain', name: 'Slater Plain', lat: -88.08, lon: 111.29 },
]

const START = Date.UTC(2028, 0, 1)
const HOURS = 8784 // 2028 es bisiesto
const SYNODIC = 29.530589 * 24
const DRACONIC = 346.62 * 24 // ciclo de la elevación solar vista desde el polo
const LIB_LAT = 27.212 * 24
const LIB_LON = 27.5545 * 24
const D = Math.PI / 180
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

function mockSamples(site: { lat: number; lon: number }): Sample[] {
  const colat = 90 + site.lat
  const out: Sample[] = []
  for (let h = 0; h < HOURS; h++) {
    // Sol: una vuelta en azimut por mes sinódico; elevación ±1.54° por el ciclo anual
    const sunLon = mod(180 - (360 * h) / SYNODIC, 360)
    const dec = 1.54 * Math.sin((2 * Math.PI * h) / DRACONIC)
    const sunAz = mod(sunLon - site.lon, 360)
    const sunEl = colat * Math.cos(sunAz * D) - dec
    // Tierra: casi fija en el cielo, se mece por la libración
    const eLon = 7.9 * Math.sin((2 * Math.PI * h) / LIB_LON)
    const eLat = 6.7 * Math.sin((2 * Math.PI * h) / LIB_LAT)
    const earthAz = mod(eLon - site.lon, 360)
    const earthEl = colat * Math.cos(earthAz * D) - eLat
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
  const sites: Site[] = SITES.map((s, i) => ({
    ...s,
    elevM: null,
    horizon: mockHorizon(1000 + i * 77),
    horizonSource: 'mock',
  }))
  const samples: Record<string, Sample[]> = {}
  for (const s of sites) samples[s.id] = mockSamples(s)
  return { source: 'mock', terrain: null, sites, samples, times: samples[sites[0].id].map((x) => x.t) }
}
