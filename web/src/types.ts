// Misma forma que genera data-pipeline/scripts/build.py (data-pipeline/public/)

export interface Site {
  id: string
  name: string
  lat: number // grados (negativo = sur)
  lon: number // grados Este, -180..180
  elevM?: number | null
  slopeDeg?: number | null // pendiente del terreno en ±160 m (plano ajustado al DEM LOLA)
  lat0?: number // punto original aproximado antes de best_point.py
  lon0?: number
  horizon: number[] // 360 valores: elevación máx. del terreno en el azimut i (grados)
  horizonSource?: string
}

export interface Sample {
  t: string // ISO UTC, horario
  sunAz: number
  sunEl: number
  earthAz: number
  earthEl: number
}

export interface Metrics {
  hours: number
  sunHours: number
  earthHours: number
  bothHours: number
  sunPct: number
  earthPct: number
  bothPct: number
  longestDarkHours: number
  longestNoCommHours: number
}

/** Relieve LOLA del polo sur (data-pipeline/scripts/terrain.py) */
export interface Terrain {
  size: number // celdas por lado
  extentM: number // ancho total en metros (estereográfica polar sur)
  radiusM: number
  minM: number
  maxM: number
  heights: Int16Array // metros sobre R, fila 0 = arriba (+y, lado de lon 0°)
}

export interface Dataset {
  source: 'real' | 'mock'
  terrain: Terrain | null
  sites: Site[]
  samples: Record<string, Sample[]> // por site.id
  times: string[] // eje de tiempo común (del primer sitio)
}

export type Mode = 'mission' | 'class' | 'explore'
export type Tab = 'explore' | 'metrics' | 'compare'
export type Lang = 'es' | 'en'
