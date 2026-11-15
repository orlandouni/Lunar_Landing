// Geometría lunar para la escena 3D. Unidades: kilómetros.
// Marco fijo a la Luna (ME): X = lat 0/lon 0 (mira a la Tierra), Y = lon 90°E, Z = polo norte.
// En three.js el polo SUR queda hacia +Y: three = (X, -Z, Y). La cámara global usa -Y como arriba para mostrar el norte arriba.
import * as THREE from 'three'
import type { Terrain } from '../types'

export const R_KM = 1737.4
const D = Math.PI / 180

/** Vector three.js de un punto (lat, lon en grados, h en km sobre R) */
export function toVec(lat: number, lon: number, hKm = 0): THREE.Vector3 {
  const r = R_KM + hKm
  const cl = Math.cos(lat * D)
  const X = r * cl * Math.cos(lon * D)
  const Y = r * cl * Math.sin(lon * D)
  const Z = r * Math.sin(lat * D)
  return new THREE.Vector3(X, -Z, Y)
}

/** Dirección (unitaria, three.js) de un astro visto desde (lat, lon) con azimut desde el Norte hacia el Este y elevación */
export function skyDir(lat: number, lon: number, az: number, el: number): THREE.Vector3 {
  const sl = Math.sin(lat * D)
  const cl = Math.cos(lat * D)
  const so = Math.sin(lon * D)
  const co = Math.cos(lon * D)
  // Base local ENU en el marco ME
  const E = [-so, co, 0]
  const N = [-sl * co, -sl * so, cl]
  const U = [cl * co, cl * so, sl]
  const h = Math.cos(el * D)
  const e = h * Math.sin(az * D)
  const n = h * Math.cos(az * D)
  const u = Math.sin(el * D)
  const X = e * E[0] + n * N[0] + u * U[0]
  const Y = e * E[1] + n * N[1] + u * U[1]
  const Z = e * E[2] + n * N[2] + u * U[2]
  return new THREE.Vector3(X, -Z, Y).normalize()
}

/** Base local (Este, Norte, Arriba) en three.js, para dibujar la rosa de los vientos de un sitio */
export function localFrame(lat: number, lon: number) {
  const up = toVec(lat, lon).normalize()
  const north = skyDir(lat, lon, 0, 0)
  const east = skyDir(lat, lon, 90, 0)
  return { up, north, east }
}

// ---- Relieve LOLA (estereográfica polar sur, x = ρ·sin λ, y = ρ·cos λ) ----

function stereoToLatLon(xM: number, yM: number, Rm: number) {
  const rho = Math.hypot(xM, yM)
  const c = 2 * Math.atan(rho / (2 * Rm)) // colatitud desde el polo sur (rad)
  return { lat: -90 + c / D, lon: Math.atan2(xM, yM) / D, rho }
}

function latLonToStereo(lat: number, lon: number, Rm: number) {
  const c = (90 + lat) * D
  const rho = 2 * Rm * Math.tan(c / 2)
  return { x: rho * Math.sin(lon * D), y: rho * Math.cos(lon * D) }
}

/** Altura del terreno (m) en un punto, interpolación bilineal; null fuera del DEM */
export function heightAt(t: Terrain, lat: number, lon: number): number | null {
  const { x, y } = latLonToStereo(lat, lon, t.radiusM)
  const cell = t.extentM / t.size
  const fx = (x + t.extentM / 2) / cell - 0.5
  const fy = (t.extentM / 2 - y) / cell - 0.5
  if (fx < 0 || fy < 0 || fx >= t.size - 1 || fy >= t.size - 1) return null
  const i = Math.floor(fx)
  const j = Math.floor(fy)
  const a = fx - i
  const b = fy - j
  const h = (ii: number, jj: number) => t.heights[jj * t.size + ii]
  return (1 - a) * (1 - b) * h(i, j) + a * (1 - b) * h(i + 1, j) + (1 - a) * b * h(i, j + 1) + a * b * h(i + 1, j + 1)
}

/** Radio (km, en el plano estereográfico) del disco de relieve; fuera de él se ve la esfera con textura */
export function terrainRadiusKm(t: Terrain) {
  return (t.extentM / 2) * 0.985 / 1000
}

/** Latitud del borde del disco de relieve */
export function terrainEdgeLat(t: Terrain) {
  const { lat } = stereoToLatLon(terrainRadiusKm(t) * 1000, 0, t.radiusM)
  return lat
}

/**
 * Malla del polo sur sobre la esfera con su curvatura real. `step` = cada cuántas celdas tomar un vértice.
 * Las alturas se desvanecen a 0 en los últimos km del borde para empatar sin escalón con la esfera.
 */
export function buildTerrainGeometry(t: Terrain, step = 1, exaggeration = 1): THREE.BufferGeometry {
  const n = Math.floor((t.size - 1) / step) + 1
  const cell = t.extentM / t.size
  const rMax = terrainRadiusKm(t) * 1000
  const fade = 12000 // m
  const pos = new Float32Array(n * n * 3)
  const inside = new Uint8Array(n * n)
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const ci = i * step
      const cj = j * step
      const x = -t.extentM / 2 + (ci + 0.5) * cell
      const y = t.extentM / 2 - (cj + 0.5) * cell
      const { lat, lon, rho } = stereoToLatLon(x, y, t.radiusM)
      const k = j * n + i
      inside[k] = rho <= rMax ? 1 : 0
      const w = Math.min(1, Math.max(0, (rMax - rho) / fade))
      // en el borde el relieve se hunde 0.6 km bajo la esfera, que lo tapa sin costura visible
      const hKm = (t.heights[cj * t.size + ci] / 1000) * exaggeration * w - 0.6 * (1 - w)
      const v = toVec(lat, lon, hKm)
      pos[k * 3] = v.x
      pos[k * 3 + 1] = v.y
      pos[k * 3 + 2] = v.z
    }
  }
  const idx: number[] = []
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i
      const b = a + 1
      const c = a + n
      const d = c + 1
      if (!(inside[a] && inside[b] && inside[c] && inside[d])) continue
      // orientación: normales hacia afuera de la Luna
      idx.push(a, b, c, b, d, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  // Si las normales quedaron hacia adentro, invertimos el orden de los triángulos
  const nrm = g.getAttribute('normal')
  const center = Math.floor(n / 2) * n + Math.floor(n / 2)
  const p = new THREE.Vector3().fromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute, center)
  const nv = new THREE.Vector3().fromBufferAttribute(nrm as THREE.BufferAttribute, center)
  if (nv.dot(p) < 0) {
    const arr = g.getIndex()!.array as Uint32Array | Uint16Array
    for (let q = 0; q < arr.length; q += 3) {
      const tmp = arr[q + 1]
      arr[q + 1] = arr[q + 2]
      arr[q + 2] = tmp
    }
    g.computeVertexNormals()
  }
  g.computeBoundingSphere()
  return g
}

/**
 * Esfera lunar con textura equirectangular, con un hueco en el polo sur (lo cubre el relieve).
 * La geometría de three tiene el norte en +Y; la malla se debe girar π en X (ver MOON_SPHERE_ROTATION).
 */
export const MOON_SPHERE_ROTATION: [number, number, number] = [Math.PI, 0, 0]

export function buildMoonSphere(edgeLat: number, overlapDeg = 0.5): THREE.BufferGeometry {
  const thetaLen = (90 - edgeLat + overlapDeg) * D // desde el polo norte hasta el borde del relieve
  const g = new THREE.SphereGeometry(R_KM, 256, 128, 0, Math.PI * 2, 0, thetaLen)
  // three calcula la v de la textura relativa a thetaLength; la rehacemos para la textura completa
  const p = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  for (let k = 0; k < p.count; k++) {
    const y = p.getY(k) / R_KM
    uv.setY(k, 1 - Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI)
  }
  uv.needsUpdate = true
  return g
}

/** Punto a `distKm` del sitio en dirección `azDeg` (desde el Norte hacia el Este), sobre la esfera */
export function destination(lat: number, lon: number, azDeg: number, distKm: number) {
  const p1 = lat * D
  const l1 = lon * D
  const a = azDeg * D
  const th = distKm / R_KM
  const p2 = Math.asin(Math.sin(p1) * Math.cos(th) + Math.cos(p1) * Math.sin(th) * Math.cos(a))
  const l2 = l1 + Math.atan2(Math.sin(a) * Math.sin(th) * Math.cos(p1), Math.cos(th) - Math.sin(p1) * Math.sin(p2))
  return { lat: p2 / D, lon: l2 / D }
}

/**
 * Disco que se pega al relieve alrededor de un sitio (anillos concéntricos que siguen el terreno).
 * Devuelve la malla del relleno y los puntos del borde. `liftKm` lo separa un poco del suelo.
 */
export function drapedDisc(t: Terrain | null, lat: number, lon: number, rKm: number, liftKm: number, rings = 10, segs = 72) {
  const h = (la: number, lo: number) => ((t ? heightAt(t, la, lo) : null) ?? 0) / 1000 + liftKm
  const pos: number[] = []
  const c = toVec(lat, lon, h(lat, lon))
  pos.push(c.x, c.y, c.z)
  const edge: THREE.Vector3[] = []
  for (let r = 1; r <= rings; r++) {
    for (let s = 0; s < segs; s++) {
      const q = destination(lat, lon, (360 * s) / segs, (rKm * r) / rings)
      const v = toVec(q.lat, q.lon, h(q.lat, q.lon))
      pos.push(v.x, v.y, v.z)
      if (r === rings) edge.push(v)
    }
  }
  edge.push(edge[0].clone())
  const idx: number[] = []
  const at = (r: number, s: number) => 1 + (r - 1) * segs + (s % segs)
  for (let s = 0; s < segs; s++) idx.push(0, at(1, s), at(1, s + 1))
  for (let r = 1; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      idx.push(at(r, s), at(r + 1, s), at(r + 1, s + 1), at(r, s), at(r + 1, s + 1), at(r, s + 1))
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return { geometry: g, edge }
}
