import { useEffect, useState } from 'react'
import { MoonCanvas, type View } from './components/Globe3D'
import { CloseX } from './components/CloseX'
import { ComparePage, MetricsPage } from './components/Pages'
import { PlanPage } from './components/PlanPage'
import { SiteList } from './components/SiteList'
import { Timeline } from './components/Timeline'
import { TopBar } from './components/TopBar'
import { loadDataset } from './data/loader'
import { AppProvider, useApp } from './store'
import type { Dataset } from './types'

/** Botones de cámara (abajo a la derecha, sobre la línea de tiempo) */
function CameraButtons({ view, go }: { view: View; go: (v: View) => void }) {
  const { t, focus } = useApp()
  const items: { id: View; label: string; show: boolean }[] = [
    { id: 'moon', label: t('viewMoon'), show: true },
    { id: 'pole', label: t('viewPole'), show: true },
    { id: 'site', label: t('viewSite'), show: focus },
  ]
  return (
    <div className="glass pointer-events-auto absolute bottom-36 right-4 z-20 flex flex-col p-1">
      {items
        .filter((x) => x.show)
        .map((x) => (
          <button
            key={x.id}
            onClick={() => go(x.id)}
            className={`rounded-xl px-3 py-1.5 text-xs transition ${view === x.id ? 'bg-white/15 text-slate-100' : 'text-slate-100/55 hover:text-slate-100'}`}
          >
            {x.label}
          </button>
        ))}
    </div>
  )
}

function Shell() {
  const { tab, focus, site, mode, t, dismissed, dismiss } = useApp()
  const [view, setView] = useState<View>(() => {
    const v = new URLSearchParams(window.location.hash.slice(1)).get('view')
    return v === 'site' || v === 'pole' ? v : 'moon'
  })
  const [nonce, setNonce] = useState(0)
  const [hover, setHover] = useState<string | null>(null)
  const go = (v: View) => {
    setView(v)
    setNonce((n) => n + 1)
  }

  // Al elegir un sitio, volar hacia él
  useEffect(() => {
    if (focus) go('site')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id, focus])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* isolate: las etiquetas 3D no pueden quedar encima de las hojas de Métricas/Comparar */}
      <div className="absolute inset-0 isolate">
        <MoonCanvas view={view} nonce={nonce} hover={hover} setHover={setHover} />
      </div>
      <TopBar />
      {tab === 'explore' && (
        <>
          <SiteList hover={hover} setHover={setHover} />
          <CameraButtons view={view} go={go} />
          {mode === 'class' && !dismissed.has('explainGlobe') && (
            <div className="glass pointer-events-auto absolute bottom-36 left-4 z-20 flex max-w-md items-start gap-2 p-3 text-sm leading-relaxed text-amber-100/90">
              <p className="flex-1">{t('explainGlobe')}</p>
              <CloseX onClick={() => dismiss('explainGlobe')} />
            </div>
          )}
        </>
      )}
      {tab === 'metrics' && <MetricsPage />}
      {tab === 'compare' && <ComparePage />}
      {tab === 'plan' && <PlanPage />}
      <Timeline />
    </div>
  )
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDataset().then(setData, (e: Error) => setError(e.message))
  }, [])

  if (error) return <div className="p-8 font-mono text-red-400">Error: {error}</div>
  if (!data)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black font-mono text-sm tracking-widest text-slate-100/50">
        KAIROS · loading the Moon…
      </div>
    )

  return (
    <AppProvider data={data}>
      <Shell />
    </AppProvider>
  )
}
