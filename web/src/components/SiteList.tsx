// Lista flotante de los 9 sitios. "Ahora" ordena según la fecha y hora elegidas; "Año" según todo 2028.
import { useState } from 'react'
import { fmtHours, MISSION_H, scoreColor } from '../lib/visibility'
import { useApp } from '../store'
import { nowColor } from './colors'

function Dots({ sun, earth }: { sun: boolean; earth: boolean }) {
  return (
    <span className="flex gap-0.5">
      <span className={`h-1.5 w-1.5 rounded-full ${sun ? 'bg-sun' : 'bg-slate-600'}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${earth ? 'bg-earth' : 'bg-slate-600'}`} />
    </span>
  )
}

export function SiteList({ hover, setHover }: { hover: string | null; setHover: (id: string | null) => void }) {
  const { t, data, site, focus, selectSite, yearMetrics, scores, now, nowRanking, rankBy, setRankBy } = useApp()
  const [open, setOpen] = useState(true)
  const byId = Object.fromEntries(data.sites.map((s) => [s.id, s]))
  const ids = rankBy === 'now' ? nowRanking : [...data.sites].sort((a, b) => scores[b.id] - scores[a.id]).map((s) => s.id)

  const right = (id: string) => {
    if (rankBy === 'year') return `${yearMetrics[id].bothPct}%`
    const n = now[id]
    if (n.both) return n.windowH >= MISSION_H ? `${fmtHours(MISSION_H)}+` : fmtHours(n.windowH)
    if (n.nextBothInH > 0) return `${t('inShort')} ${fmtHours(n.nextBothInH)}`
    return '—'
  }

  return (
    <div className="glass pointer-events-auto absolute left-4 top-20 z-20 w-[19rem] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t('sites')}</span>
        <div className="flex items-center gap-1">
          <div className="flex rounded-full bg-white/5 p-0.5 text-[11px]">
            {(['now', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRankBy(r)}
                className={`rounded-full px-2 py-0.5 transition ${rankBy === r ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {r === 'now' ? t('rankNow') : t('rankYear')}
              </button>
            ))}
          </div>
          <button className="w-5 text-slate-500 hover:text-slate-200" onClick={() => setOpen(!open)} aria-label="toggle">
            {open ? '−' : '+'}
          </button>
        </div>
      </div>
      {open && (
        <ul className="px-1.5 pb-1.5">
          {ids.map((id, k) => {
            const s = byId[id]
            const sel = focus && id === site.id
            const color = rankBy === 'now' ? nowColor(now[id]) : scoreColor(yearMetrics[id].bothPct)
            const best = rankBy === 'now' ? k === 0 && now[id].both : k === 0
            return (
              <li key={id}>
                <button
                  onClick={() => selectSite(id)}
                  onMouseEnter={() => setHover(id)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition ${
                    sel ? 'bg-white/10 text-slate-100' : hover === id ? 'bg-white/5 text-slate-100' : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="flex-1 truncate">
                    {s.name}
                    {best && <span className="ml-1 text-both">★</span>}
                  </span>
                  {rankBy === 'now' && <Dots sun={now[id].sun} earth={now[id].earth} />}
                  <span className="w-[4.5rem] whitespace-nowrap text-right font-mono text-[11px] text-slate-500">{right(id)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {open && (
        <div className="border-t border-white/5 px-3 py-2 text-[10px] leading-snug text-slate-500">
          {rankBy === 'now' ? t('legendNow') : t('legendBoth')}
        </div>
      )}
    </div>
  )
}
