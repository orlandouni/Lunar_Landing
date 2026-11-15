// Estado global de la app (sin librerías): sitio seleccionado, tiempo, modo, idioma, comparación.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translate, type TKey } from './i18n'
import { computeFlags, computeMetrics, nowInfo, type Flags, type NowInfo } from './lib/visibility'
import { withSites } from './data/synth'
import { bothPrefix } from './lib/plan'
import type { Dataset, Lang, Metrics, Mode, PlanInput, Site, SiteSpec, Tab } from './types'

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
  isCandidate: (id: string) => boolean // región Artemis III (las que compiten por "mejor candidato")
  addCustomSite: (lat: number, lon: number, name?: string) => string
  removeCustomSite: (id: string) => void
  prefix: Record<string, Uint32Array> // cumulative Sun + Earth hours (trip planner)
  plan: PlanInput
  setPlan: (p: Partial<PlanInput>) => void
  dismissed: Set<string> // info panels the user closed
  dismiss: (id: string) => void
  restore: (id: string) => void
}

const CUSTOM_KEY = 'kairos.custom-sites'
const OLD_CUSTOM_KEY = 'horizonte-sur.custom-sites'
function loadCustom(): SiteSpec[] {
  try {
    const v = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? localStorage.getItem(OLD_CUSTOM_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x?.lat === 'number' && typeof x?.lon === 'number' && x.id) : []
  } catch {
    return []
  }
}
/** Sitio propio a partir de lat/lon; el id depende solo de la coordenada */
function customSpec(lat: number, lon: number, name?: string): SiteSpec {
  const lo = ((((lon + 180) % 360) + 360) % 360) - 180
  const id = `custom-${lat.toFixed(3)}_${lo.toFixed(3)}`.replace(/\./g, 'p')
  const label = name?.trim() || `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'} ${Math.abs(lo).toFixed(2)}°${lo >= 0 ? 'E' : 'W'}`
  return { id, name: label.slice(0, 40), lat, lon: lo, group: 'custom' }
}

/** Coordenada compartida en la URL: #coord=-85.5,20,Mi%20sitio */
function coordFromHash(): SiteSpec | null {
  const v = new URLSearchParams(window.location.hash.slice(1)).get('coord')
  if (!v) return null
  const [la, lo, ...name] = v.split(',')
  const lat = Number(la)
  const lon = Number(lo)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 360) return null
  return customSpec(lat, lon, name.join(','))
}

function saveCustom(v: SiteSpec[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(v))
  } catch {
    /* almacenamiento bloqueado: los sitios propios duran solo esta sesión */
  }
}

export type RankBy = 'now' | 'year'

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ data: base, children }: { data: Dataset; children: ReactNode }) {
  // Coordenadas propias: se agregan al dataset con datos estimados (misma forma que los reales)
  const [customs, setCustoms] = useState<SiteSpec[]>(() => {
    const c = loadCustom()
    const h = coordFromHash()
    return h ? [...c.filter((x) => x.id !== h.id), h] : c
  })
  useEffect(() => saveCustom(customs), [customs])
  const data = useMemo(() => withSites(base, customs), [base, customs])
  const candidates = useMemo(() => {
    const a = data.sites.filter((s) => (s.group ?? 'artemis') === 'artemis')
    return a.length ? a : data.sites
  }, [data.sites])
  const candidateIds = useMemo(() => new Set(candidates.map((s) => s.id)), [candidates])
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
    () => [...candidates].sort((a, b) => scores[b.id] - scores[a.id] || yearMetrics[b.id].bothPct - yearMetrics[a.id].bothPct)[0].id,
    [candidates, scores, yearMetrics],
  )
  // Estado inicial desde la URL (#site=haworth&t=1234) para poder compartir un instante
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const [siteId, setSiteId] = useState(() => {
    const c = coordFromHash()
    const h = c?.id ?? hash.get('site')
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
    return v === 'metrics' || v === 'compare' || v === 'plan' ? v : 'explore'
  })
  const [focus, setFocus] = useState(() => hash.has('site') || hash.has('coord'))
  const [lang, setLang] = useState<Lang>('en')
  const prefix = useMemo(() => Object.fromEntries(data.sites.map((s) => [s.id, bothPrefix(flags[s.id])])), [data.sites, flags])
  const [plan, setPlanState] = useState<PlanInput>(() => ({
    arrive: data.times[0],
    leave: data.times[Math.min(data.times.length - 1, 156)], // 6.5 days later by default
    scope: 'artemis',
  }))
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())
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
  // Solo las regiones Artemis compiten por "mejor candidato"; misiones y coordenadas propias se comparan aparte
  const nowRanking = useMemo(() => [...candidates].sort((a, b) => now[b.id].score - now[a.id].score).map((s) => s.id), [candidates, now])
  const [rankBy, setRankBy] = useState<RankBy>('now')

  // Guarda sitio + instante en la URL (sin llenar el historial)
  useEffect(() => {
    if (playing) return
    // Un sitio propio viaja con su coordenada para que el enlace funcione en otro navegador
    const c = customs.find((x) => x.id === siteId)
    const where = c ? `coord=${c.lat},${c.lon},${encodeURIComponent(c.name)}` : `site=${siteId}`
    window.history.replaceState(null, '', focus ? `#${where}&t=${timeIndex}` : `#t=${timeIndex}`)
  }, [siteId, timeIndex, playing, focus, customs])

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
    isCandidate: (id) => candidateIds.has(id),
    prefix,
    plan,
    setPlan: (p) => setPlanState((x) => ({ ...x, ...p })),
    dismissed,
    dismiss: (id) => setDismissed((d) => new Set(d).add(id)),
    restore: (id) =>
      setDismissed((d) => {
        const n = new Set(d)
        n.delete(id)
        return n
      }),
    addCustomSite: (lat, lon, name) => {
      const spec = customSpec(lat, lon, name)
      setCustoms((c) => [...c.filter((x) => x.id !== spec.id), spec])
      return spec.id
    },
    removeCustomSite: (id) => {
      setCustoms((c) => c.filter((x) => x.id !== id))
      if (id === siteId) {
        setSiteId(bestSiteId)
        setFocus(false)
      }
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}
