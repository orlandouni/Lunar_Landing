// Estado global de la app (sin librerías): sitio seleccionado, tiempo, modo, idioma, comparación.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translate, type TKey } from './i18n'
import { computeFlags, computeMetrics, nowInfo, type Flags, type NowInfo } from './lib/visibility'
import type { Dataset, Lang, Metrics, Mode, Site, Tab } from './types'

interface AppState {
  data: Dataset
  site: Site
  setSiteId: (id: string) => void
  timeIndex: number
  setTimeIndex: (i: number) => void
  playing: boolean
  setPlaying: (p: boolean | ((p: boolean) => boolean)) => void
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
  flags: Record<string, Flags> // visibilidad hora a hora por sitio
  bestSiteId: string
  tab: Tab
  setTab: (t: Tab) => void
  focus: boolean // hay un sitio elegido en el globo (se muestra su tarjeta)
  setFocus: (f: boolean) => void
  selectSite: (id: string) => void
  weight: number // 0..1, peso de la energía (Sol) frente a la comunicación (Tierra)
  setWeight: (w: number) => void
  scores: Record<string, number>
  now: Record<string, NowInfo> // situación de cada sitio en la hora elegida
  nowRanking: string[] // ids, mejor candidato primero (según la fecha y hora)
  rankBy: RankBy
  setRankBy: (r: RankBy) => void
}

export type RankBy = 'now' | 'year'

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ data, children }: { data: Dataset; children: ReactNode }) {
  const yearMetrics = useMemo(
    () => Object.fromEntries(data.sites.map((s) => [s.id, computeMetrics(data.samples[s.id], s.horizon)])),
    [data],
  )
  const flags = useMemo(
    () => Object.fromEntries(data.sites.map((s) => [s.id, computeFlags(data.samples[s.id], s.horizon)])),
    [data],
  )
  const [weight, setWeight] = useState(0.5)
  const scores = useMemo(
    () =>
      Object.fromEntries(
        data.sites.map((s) => {
          const m = yearMetrics[s.id]
          return [s.id, Math.round(10 * (weight * m.sunPct + (1 - weight) * m.earthPct)) / 10]
        }),
      ),
    [data, yearMetrics, weight],
  )
  const bestSiteId = useMemo(
    () => [...data.sites].sort((a, b) => scores[b.id] - scores[a.id] || yearMetrics[b.id].bothPct - yearMetrics[a.id].bothPct)[0].id,
    [data, scores, yearMetrics],
  )
  // Estado inicial desde la URL (#site=haworth&t=1234) para poder compartir un instante
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const [siteId, setSiteId] = useState(() => {
    const h = hash.get('site')
    return h && data.sites.some((s) => s.id === h) ? h : bestSiteId
  })
  const [timeIndex, setTimeIndex] = useState(() => {
    const h = Number(hash.get('t'))
    return Number.isFinite(h) && h > 0 && h < data.times.length ? Math.floor(h) : 0
  })
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(4)
  const [mode, setMode] = useState<Mode>('mission')
  const [tab, setTab] = useState<Tab>(() => {
    const v = hash.get('tab')
    return v === 'metrics' || v === 'compare' ? v : 'explore'
  })
  const [focus, setFocus] = useState(() => hash.has('site'))
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

  // Recomendación según la fecha y hora elegidas
  const now = useMemo(
    () => Object.fromEntries(data.sites.map((s) => [s.id, nowInfo(flags[s.id], Math.min(timeIndex, flags[s.id].sun.length - 1))])),
    [data.sites, flags, timeIndex],
  )
  const nowRanking = useMemo(() => [...data.sites].sort((a, b) => now[b.id].score - now[a.id].score).map((s) => s.id), [data.sites, now])
  const [rankBy, setRankBy] = useState<RankBy>('now')

  // Guarda sitio + instante en la URL (sin llenar el historial)
  useEffect(() => {
    if (playing) return
    window.history.replaceState(null, '', focus ? `#site=${siteId}&t=${timeIndex}` : `#t=${timeIndex}`)
  }, [siteId, timeIndex, playing, focus])

  // Atajos: espacio = reproducir/pausa, ←/→ = ±1 h, Shift+←/→ = ±1 día
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const n = data.times.length
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const step = (e.shiftKey ? 24 : 1) * (e.key === 'ArrowRight' ? 1 : -1)
        setTimeIndex((i) => (i + step + n) % n)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [data.times.length])

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
    flags,
    bestSiteId,
    tab,
    setTab,
    focus,
    setFocus,
    selectSite: (id) => {
      setSiteId(id)
      setFocus(true)
    },
    weight,
    setWeight,
    scores,
    now,
    nowRanking,
    rankBy,
    setRankBy,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}
