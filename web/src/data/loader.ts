// Cargador de datos. Si existe public/data/sites.json usa los datos REALES;
// si no, usa los simulados. Pasar a reales = copiar data-pipeline/public/* a web/public/data/.
// Para forzar uno u otro: VITE_DATA=mock o VITE_DATA=real en web/.env.local
import type { Dataset, Sample, Site, Terrain } from '../types'
import { buildMockDataset } from './mock'

const BASE = `${import.meta.env.BASE_URL}data`

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/${path}`)
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
  // Vite devuelve index.html (200) para rutas inexistentes; lo detectamos
  if (!(r.headers.get('content-type') ?? '').includes('json')) throw new Error(`${path}: no existe`)
  return r.json() as Promise<T>
}

/** Relieve LOLA para el globo 3D; si no está, el globo se dibuja liso */
async function loadTerrain(): Promise<Terrain | null> {
  try {
    const meta = await getJson<Omit<Terrain, 'heights'>>('terrain/meta.json')
    const r = await fetch(`${BASE}/terrain/height.bin`)
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    if (buf.byteLength !== meta.size * meta.size * 2) return null
    return { ...meta, heights: new Int16Array(buf) }
  } catch {
    return null
  }
}

async function loadReal(): Promise<Dataset> {
  const sites = await getJson<Site[]>('sites.json')
  const entries = await Promise.all(
    sites.map(async (s) => [s.id, await getJson<Sample[]>(`samples/${s.id}.json`).catch(() => [] as Sample[])] as const),
  )
  // Horizons incluye la hora final (2029-01-01 00:00): nos quedamos solo con el año del primer dato
  const year = entries.find(([, v]) => v.length)?.[1][0].t.slice(0, 4)
  const samples: Record<string, Sample[]> = Object.fromEntries(entries.map(([id, v]) => [id, v.filter((x) => x.t.startsWith(year ?? ''))]))
  const withData = sites.filter((s) => samples[s.id].length > 0)
  if (withData.length === 0) throw new Error('no hay samples reales')
  return { source: 'real', terrain: await loadTerrain(), sites: withData, samples, times: samples[withData[0].id].map((x) => x.t) }
}

export async function loadDataset(): Promise<Dataset> {
  const mode = import.meta.env.VITE_DATA as string | undefined
  if (mode === 'mock') return { ...buildMockDataset(), terrain: await loadTerrain() }
  try {
    return await loadReal()
  } catch (e) {
    if (mode === 'real') throw e
    console.info('[Horizonte Sur] Usando datos simulados:', (e as Error).message)
    return { ...buildMockDataset(), terrain: await loadTerrain() }
  }
}
