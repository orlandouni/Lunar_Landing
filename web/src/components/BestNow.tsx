// Mejores candidatos para la fecha y hora elegidas en la línea de tiempo.
import { fmtHours, MISSION_H } from '../lib/visibility'
import { useApp } from '../store'
import { CloseX } from './CloseX'

export function BestNow() {
  const { t, data, now, nowRanking, selectSite, site, focus, timeIndex, lang, dismissed, dismiss, restore } = useApp()
  const byId = Object.fromEntries(data.sites.map((s) => [s.id, s]))
  const withBoth = nowRanking.filter((id) => now[id].both)
  const top = withBoth.slice(0, 3)
  const date = new Date(data.times[timeIndex]).toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const win = (h: number) => (h >= MISSION_H ? `${fmtHours(MISSION_H)}+` : fmtHours(h))

  if (dismissed.has('bestNow'))
    return (
      <button
        className="w-full px-3 py-1 text-xs text-slate-400 hover:text-slate-100"
        onClick={() => restore('bestNow')}
      >
        <span className="text-both">★</span> {t('bestFor')} …
      </button>
    )

  return (
    <details className="mb-2 rounded-xl bg-white/[0.03] px-3 py-2">
      <summary className="cursor-pointer text-xs text-slate-400">{t('recommendations')} <span className="text-both">· {withBoth.length}</span></summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
        {t('bestFor')} {date} UTC
      </span>
      {top.length === 0 ? (
        (() => {
          const first = nowRanking[0]
          const n = now[first]
          return (
            <button className="text-sm text-slate-300 hover:text-slate-100" onClick={() => selectSite(first)}>
              {t('noneNow')}
              {n.nextBothInH > 0 && (
                <>
                  {' · '}
                  {t('firstWillBe')} <span className="text-slate-100">{byId[first].name}</span> {t('inHours')} {fmtHours(n.nextBothInH)}
                </>
              )}
            </button>
          )
        })()
      ) : (
        top.map((id, k) => {
          const n = now[id]
          const sel = focus && site.id === id
          return (
            <button
              key={id}
              onClick={() => selectSite(id)}
              className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-sm transition ${sel ? 'bg-white/10 text-slate-100' : 'text-slate-200 hover:bg-white/5'}`}
              title={`${t('next7')}: ${n.next7Pct}%`}
            >
              <span className={`font-mono text-[11px] ${k === 0 ? 'text-both' : 'text-slate-500'}`}>{k === 0 ? '★' : `${k + 1}º`}</span>
              {byId[id].name}
              <span className="font-mono text-[11px] text-slate-400">{win(n.windowH)}</span>
            </button>
          )
        })
      )}
      <CloseX onClick={() => dismiss('bestNow')} className="ml-auto" />
      </div>
    </details>
  )
}
