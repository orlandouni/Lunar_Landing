// Misma forma que genera data-pipeline/scripts/build.py (data-pipeline/public/)

export interface Site {
  id: string
  name: string
  lat: number // grados (negativo = sur)
  lon: number // grados Este, -180..180
  elevM?: number | null
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

export interface Dataset {
  source: 'real' | 'mock'
  sites: Site[]
  samples: Record<string, Sample[]> // por site.id
  times: string[] // eje de tiempo común (del primer sitio)
}

export type Mode = 'mission' | 'class' | 'explore'
export type Lang = 'es' | 'en'
