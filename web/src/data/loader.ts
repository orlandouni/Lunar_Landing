// Cargador de datos. Si existe public/data/sites.json usa los datos REALES;
// si no, usa los simulados. Pasar a reales = copiar data-pipeline/public/* a web/public/data/.
// Para forzar uno u otro: VITE_DATA=mock o VITE_DATA=real en web/.env.local
import type { Dataset, Sample, Site } from '../types'
import { buildMockDataset } from './mock'

const BASE = `${import.meta.env.BASE_URL}data`

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/${path}`)
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
  // Vite devuelve index.html (200) para rutas inexistentes; lo detectamos
  if (!(r.headers.get('content-type') ?? '').includes('json')) throw new Error(`${path}: no existe`)
  return r.json() as Promise<T>
}

async function loadReal(): Promise<Dataset> {
  const sites = await getJson<Site[]>('sites.json')
  const entries = await Promise.all(
    sites.map(async (s) => [s.id, await getJson<Sample[]>(`samples/${s.id}.json`).catch(() => [] as Sample[])] as const),
  )
  const samples: Record<string, Sample[]> = Object.fromEntries(entries)
  const withData = sites.filter((s) => samples[s.id].length > 0)
  if (withData.length === 0) throw new Error('no hay samples reales')
  return { source: 'real', sites: withData, samples, times: samples[withData[0].id].map((x) => x.t) }
}

export async function loadDataset(): Promise<Dataset> {
  const mode = import.meta.env.VITE_DATA as string | undefined
  if (mode === 'mock') return buildMockDataset()
  try {
    return await loadReal()
  } catch (e) {
    if (mode === 'real') throw e
    console.info('[Horizonte Sur] Usando datos simulados:', (e as Error).message)
    return buildMockDataset()
  }
}
