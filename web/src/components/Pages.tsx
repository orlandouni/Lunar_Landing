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
import { VisibilityLegend } from './VisibilityLegend'

export function MetricsPage() {
  const { data, site, setSiteId, yearMetrics, scores, t } = useApp()
  const rows = [...data.sites].sort((a, b) => scores[b.id] - scores[a.id])
  return (
    <Sheet fill>
      <div className="grid shrink-0 grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-7" role="group" aria-label={t('sites')}>
        {rows.map((s) => (
          <button
            key={s.id}
            onClick={() => setSiteId(s.id)}
            aria-pressed={s.id === site.id}
            title={s.name}
            className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-2.5 text-left text-xs transition ${
              s.id === site.id ? 'border-slate-400/50 bg-slate-700/40 font-medium text-slate-100' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-slate-100'
            }`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.id === site.id ? '' : 'opacity-50'}`} style={{ background: scoreColor(yearMetrics[s.id].bothPct) }} />
            <span className="truncate">{s.name}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <span className="text-xs text-slate-400">{t('chartStates')}</span>
        <VisibilityLegend />
      </div>
      <div className="metrics-grid grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <SiteMetrics />
        <div className="metrics-charts grid min-w-0 gap-4 lg:grid-rows-[1.15fr_1fr]">
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
