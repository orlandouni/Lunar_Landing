import { useEffect, useState } from 'react'
import { Comparator } from './components/Comparator'
import { Header } from './components/Header'
import { HorizonView } from './components/HorizonView'
import { PolarMap } from './components/PolarMap'
import { SiteMetrics } from './components/SiteMetrics'
import { Timeline } from './components/Timeline'
import { loadDataset } from './data/loader'
import { AppProvider } from './store'
import type { Dataset } from './types'

export default function App() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDataset().then(setData, (e: Error) => setError(e.message))
  }, [])

  if (error) return <div className="p-8 font-mono text-red-400">Error: {error}</div>
  if (!data) return <div className="p-8 font-mono text-slate-400">Cargando efemérides… / Loading ephemerides…</div>

  return (
    <AppProvider data={data}>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-4">
        <Header />
        <div className="grid gap-4 lg:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)]">
          <PolarMap />
          <div className="flex min-w-0 flex-col gap-4">
            <HorizonView />
            <SiteMetrics />
          </div>
        </div>
        <Timeline />
        <Comparator />
      </div>
    </AppProvider>
  )
}
