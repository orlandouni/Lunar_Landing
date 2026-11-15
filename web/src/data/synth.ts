// Datos para un sitio que no trae datos reales (coordenada propia, o misión sin generar en el pipeline).
// Tienen exactamente la misma forma que los reales (Site + Sample[]), así que todas las vistas funcionan igual.
//
// - Con datos reales cargados: se "estiman" a partir de las efemérides JPL Horizons del sitio real más cercano.
//   La dirección del Sol es la misma en toda la Luna; la de la Tierra se corrige por paralaje (Tierra a 384 400 km).
//   Solo cambia el "arriba" local de la nueva coordenada. Error típico < 0.05° frente a consultar Horizons.
// - Sin datos reales: se usa la geometría simulada de mock.ts.
// - Horizonte: si la coordenada cae en el relieve LOLA polar (80°S–90°S) se calcula aquí con la malla de 594 m;
//   si no, horizonte plano (0°).
import { destination, heightAt } from '../lib/moon'
import type { Dataset, Sample, Site, SiteSpec, Terrain } from '../types'
import { mockSamplesAt } from './mock'

const D = Math.PI / 180
const R_M = 1737400
const EARTH_KM = 384400
const R_KM = R_M / 1000

type V3 = [number, number, number]

function enu(lat: number, lon: number) {
  const sl = Math.sin(lat * D)
  const cl = Math.cos(lat * D)
  const so = Math.sin(lon * D)
  const co = Math.cos(lon * D)
  return { E: [-so, co, 0] as V3, N: [-sl * co, -sl * so, cl] as V3, U: [cl * co, cl * so, sl] as V3 }
}
type Frame = ReturnType<typeof enu>

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export function azElToVec(az: number, el: number, f: Frame): V3 {
  const h = Math.cos(el * D)
  const e = h * Math.sin(az * D)
  const n = h * Math.cos(az * D)
  const u = Math.sin(el * D)
  return [e * f.E[0] + n * f.N[0] + u * f.U[0], e * f.E[1] + n * f.N[1] + u * f.U[1], e * f.E[2] + n * f.N[2] + u * f.U[2]]
}

export function vecToAzEl(v: V3, f: Frame): [number, number] {
  const len = Math.hypot(v[0], v[1], v[2])
  const el = Math.asin(Math.max(-1, Math.min(1, dot(v, f.U) / len))) / D
  const az = ((Math.atan2(dot(v, f.E), dot(v, f.N)) / D) % 360 + 360) % 360
  return [az, el]
}

export { enu }

const r3 = (x: number) => Math.round(x * 1000) / 1000

/** Pasa las efemérides de un sitio de referencia a otra coordenada */
export function estimateSamples(ref: Sample[], refLat: number, refLon: number, lat: number, lon: number): Sample[] {
  const fr = enu(refLat, refLon)
  const f = enu(lat, lon)
  const pr = fr.U.map((x) => x * R_KM) as V3
  const p = f.U.map((x) => x * R_KM) as V3
  return ref.map((s) => {
    const [sunAz, sunEl] = vecToAzEl(azElToVec(s.sunAz, s.sunEl, fr), f)
    const d = azElToVec(s.earthAz, s.earthEl, fr)
    const e: V3 = [pr[0] + EARTH_KM * d[0] - p[0], pr[1] + EARTH_KM * d[1] - p[1], pr[2] + EARTH_KM * d[2] - p[2]]
    const [earthAz, earthEl] = vecToAzEl(e, f)
    return { t: s.t, sunAz: r3(sunAz), sunEl: r3(sunEl), earthAz: r3(earthAz), earthEl: r3(earthEl) }
  })
}

/** Horizonte (360 azimuts, hasta 150 km) con el relieve LOLA del navegador; null si el punto queda fuera */
export function estimateHorizon(t: Terrain, lat: number, lon: number): { horizon: number[]; h0: number; coverage: number } | null {
  const h0 = heightAt(t, lat, lon)
  if (h0 == null) return null
  const cell = t.extentM / t.size / 1000 // km
  const dist: number[] = []
  for (let d = cell; d < 6; d += cell) dist.push(d)
  for (let d = 6; d <= 150; d *= 1.02) dist.push(d)
  const ro = R_M + h0 + 2 // observador a 2 m, igual que horizon.py
  const horizon: number[] = []
  let full = 0
  for (let az = 0; az < 360; az++) {
    let best = -90
    let inside = true
    for (const d of dist) {
      const q = destination(lat, lon, az, d)
      const ht = heightAt(t, q.lat, q.lon)
      if (ht == null) {
        inside = false
        break
      }
      const th = d / R_KM
      const rt = R_M + ht
      const el = Math.atan2(rt * Math.cos(th) - ro, rt * Math.sin(th)) / D
      if (el > best) best = el
    }
    if (inside) full++
    horizon.push(Math.round(Math.max(best, -5) * 1000) / 1000)
  }
  return { horizon, h0, coverage: full / 360 }
}

function nearestReal(data: Dataset, lat: number, lon: number): Site | null {
  const f = enu(lat, lon)
  let best: Site | null = null
  let bestDot = -2
  for (const s of data.sites) {
    if (s.dataSource !== 'real' || !data.samples[s.id]?.length) continue
    const c = dot(enu(s.lat, s.lon).U, f.U)
    if (c > bestDot) {
      bestDot = c
      best = s
    }
  }
  return best
}

/** Crea un sitio completo (Site + Sample[]) para una coordenada sin datos reales */
export function synthSite(spec: SiteSpec, data: Dataset): { site: Site; samples: Sample[] } {
  const ref = data.source === 'real' ? nearestReal(data, spec.lat, spec.lon) : null
  const samples = ref
    ? estimateSamples(data.samples[ref.id], ref.lat, ref.lon, spec.lat, spec.lon)
    : mockSamplesAt(spec).slice(0, data.times.length)
  const hz = data.terrain ? estimateHorizon(data.terrain, spec.lat, spec.lon) : null
  const site: Site = {
    ...spec,
    elevM: hz ? Math.round(hz.h0) : null,
    horizon: hz ? hz.horizon : new Array(360).fill(0),
    horizonSource: hz ? (hz.coverage >= 0.99 ? 'LOLA 594 m' : 'LOLA 594 m (parcial)') : 'flat',
    dataSource: ref ? 'estimated' : 'mock',
    refSiteId: ref?.id,
  }
  return { site, samples }
}

/** Agrega al dataset los sitios del catálogo / propios que falten */
export function withSites(data: Dataset, specs: SiteSpec[]): Dataset {
  const missing = specs.filter((s) => !data.sites.some((x) => x.id === s.id))
  if (!missing.length) return data
  const sites = [...data.sites]
  const samples = { ...data.samples }
  for (const spec of missing) {
    const r = synthSite(spec, data)
    sites.push(r.site)
    samples[spec.id] = r.samples
  }
  return { ...data, sites, samples }
}
