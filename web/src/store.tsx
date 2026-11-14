// Estado global de la app (sin librerías): sitio seleccionado, tiempo, modo, idioma, comparación.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translate, type TKey } from './i18n'
import { computeMetrics } from './lib/visibility'
import type { Dataset, Lang, Metrics, Mode, Site } from './types'

interface AppState {
  data: Dataset
  site: Site
  setSiteId: (id: string) => void
  timeIndex: number
  setTimeIndex: (i: number) => void
  playing: boolean
  setPlaying: (p: boolean) => void
  speed: number // horas simuladas por cuadro
  setSpeed: (s: number) => void
  mode: Mode
  setMode: (m: Mode) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: TKey) => string
  compareIds: string[]
  toggleCompare: (id: string) => void
  yearMetrics: Record<string, Metrics>
  bestSiteId: string
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ data, children }: { data: Dataset; children: ReactNode }) {
  const yearMetrics = useMemo(
    () => Object.fromEntries(data.sites.map((s) => [s.id, computeMetrics(data.samples[s.id], s.horizon)])),
    [data],
  )
  const bestSiteId = useMemo(
    () => [...data.sites].sort((a, b) => yearMetrics[b.id].bothPct - yearMetrics[a.id].bothPct)[0].id,
    [data, yearMetrics],
  )
  const [siteId, setSiteId] = useState(bestSiteId)
  const [timeIndex, setTimeIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(4)
  const [mode, setMode] = useState<Mode>('mission')
  const [lang, setLang] = useState<Lang>('es')
  const [compareIds, setCompareIds] = useState<string[]>([])

  // Animación de la línea de tiempo
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      setTimeIndex((i) => (i + speed) % data.times.length)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, data.times.length])

  const value: AppState = {
    data,
    site: data.sites.find((s) => s.id === siteId) ?? data.sites[0],
    setSiteId,
    timeIndex,
    setTimeIndex,
    playing,
    setPlaying,
    speed,
    setSpeed,
    mode,
    setMode,
    lang,
    setLang,
    t: (k) => translate(lang, k),
    compareIds,
    toggleCompare: (id) => setCompareIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])),
    yearMetrics,
    bestSiteId,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}
