// Metrics and Compare tabs: glass sheets over the Moon (the 3D scene stays alive behind them).
import { scoreColor } from '../lib/visibility'
import { useApp } from '../store'
import { About } from './About'
import { Comparator } from './Comparator'
import { HorizonView } from './HorizonView'
import { MonthlyChart } from './MonthlyChart'
import { Sheet } from './Sheet'
import { SiteMetrics } from './SiteMetrics'
import { VisibilityGantt } from './VisibilityGantt'

export function MetricsPage() {
  const { data, site, setSiteId, yearMetrics, scores } = useApp()
  const rows = [...data.sites].sort((a, b) => scores[b.id] - scores[a.id])
  return (
    <Sheet>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((s) => (
          <button
            key={s.id}
            onClick={() => setSiteId(s.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
              s.id === site.id ? 'border-white/40 bg-white/15 text-slate-100' : 'border-white/10 text-slate-100/60 hover:text-slate-100'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: scoreColor(yearMetrics[s.id].bothPct) }} />
            {s.name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SiteMetrics />
        <div className="flex flex-col gap-4">
          <HorizonView />
          <MonthlyChart />
        </div>
      </div>
    </Sheet>
  )
}

export function ComparePage() {
  return (
    <Sheet>
      <Comparator />
      <VisibilityGantt />
      <About />
    </Sheet>
  )
}
