import { useMemo } from 'react'
import { computeMetrics } from '../lib/visibility'
import { useApp } from '../store'
import { Explain } from './Explain'

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-space-700 bg-space-800/60 p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-2xl" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

export function SiteMetrics() {
  const { site, data, timeIndex, yearMetrics, t, mode, bestSiteId, lang } = useApp()
  const samples = data.samples[site.id]
  const monthKey = (samples[timeIndex] ?? samples[0]).t.slice(0, 7)

  const month = useMemo(
    () => computeMetrics(samples.filter((s) => s.t.startsWith(monthKey)), site.horizon),
    [samples, monthKey, site],
  )
  const year = yearMetrics[site.id]
  const days = (h: number) => (h >= 48 ? `${(h / 24).toFixed(1)} ${lang === 'es' ? 'd' : 'd'}` : `${h} h`)

  return (
    <section className="panel">
      <div className="flex items-baseline justify-between">
        <h2 className="panel-title">{t('metricsTitle')}</h2>
        {mode === 'mission' && site.id === bestSiteId && (
          <span className="rounded bg-both/15 px-2 py-0.5 font-mono text-[10px] text-both">★ {t('recommended')}</span>
        )}
      </div>
      {[
        { label: `${t('year')}`, m: year },
        { label: `${t('month')} (${monthKey})`, m: month },
      ].map(({ label, m }) => (
        <div key={label} className="mb-3">
          <div className="mb-1 text-xs text-slate-400">{label}</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Stat label={t('sun')} value={`${m.sunPct}%`} color="#f5b642" />
            <Stat label={t('earth')} value={`${m.earthPct}%`} color="#4ea8ff" />
            <Stat label={t('both')} value={`${m.bothPct}%`} color="#4ade80" />
            <Stat label={t('longestDark')} value={days(m.longestDarkHours)} />
            <Stat label={t('longestNoComm')} value={days(m.longestNoCommHours)} />
          </div>
        </div>
      ))}
      <Explain k="explainMetrics" />
    </section>
  )
}
