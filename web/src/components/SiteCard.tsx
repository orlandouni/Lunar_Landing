// Tarjeta que aparece al elegir un sitio en la Luna: estado ahora, % del año y su horizonte.
import { fmtCoord, fmtHours, MISSION_H, SAFE_SLOPE } from '../lib/visibility'
import { CloseX } from './CloseX'
import { useApp } from '../store'
import { nowColor } from './colors'
import { DataBadge } from './DataBadge'
import { HorizonView } from './HorizonView'
import { SkyNow } from './SkyNow'

export function SiteCard() {
  const { t, site, focus, setFocus, yearMetrics, setTab, now, nowRanking, isCandidate, dismissed, dismiss } = useApp()
  if (!focus) return null
  const m = yearMetrics[site.id]
  const n = now[site.id]
  const candidate = isCandidate(site.id)
  const rank = nowRanking.indexOf(site.id) + 1

  return (
    <aside className="glass pointer-events-auto absolute right-4 top-20 z-20 max-h-[calc(100vh-15rem)] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-lg font-medium text-slate-100">
            <span className="h-3 w-3 rounded-full" style={{ background: nowColor(now[site.id]) }} />
            {site.name}
            {candidate && rank === 1 && now[site.id].both && <span className="text-sm text-both">★</span>}
          </div>
          {site.note && <div className="text-[11px] text-slate-100/50">{site.note}</div>}
          <div className="mt-0.5 font-mono text-[11px] text-slate-100/40">
            {fmtCoord(site.lat, site.lon)}
            {site.elevM != null && ` · ${Math.round(site.elevM).toLocaleString()} m`}
          </div>
          {site.slopeDeg != null && (
            <div className={`mt-0.5 font-mono text-[11px] ${site.slopeDeg <= SAFE_SLOPE ? 'text-slate-100/40' : 'text-sun'}`} title={t('slopeHint')}>
              {t('slope')} {site.slopeDeg.toFixed(1)}° · {site.slopeDeg <= SAFE_SLOPE ? t('slopeOk') : t('slopeHigh')}
            </div>
          )}
          <DataBadge site={site} />
        </div>
        <button className="rounded-full px-2 text-slate-100/50 hover:bg-white/10 hover:text-slate-100" onClick={() => setFocus(false)} aria-label={t('close')}>
          ✕
        </button>
      </div>

      {m.bothHours === 0 && !dismissed.has(`warn-${site.id}`) && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">
          <p className="flex-1">{t(m.sunHours === 0 ? 'permShadow' : 'noBoth')}</p>
          <CloseX onClick={() => dismiss(`warn-${site.id}`)} />
        </div>
      )}

      <div className="mt-4">
        <SkyNow />
      </div>

      {/* Recomendación para la hora elegida */}
      <div className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
        {candidate ? (
          <div className="mb-1 flex justify-between">
            <span>{t('rankAt')}</span>
            <span className="font-mono text-slate-200">
              {rank}º / {nowRanking.length}
            </span>
          </div>
        ) : (
          <div className="mb-1 text-[11px] text-slate-500">{t('notCandidate')}</div>
        )}
        <div className="flex justify-between">
          <span>{t('windowNow')}</span>
          <span className="font-mono text-slate-200">
            {n.both ? (n.windowH >= MISSION_H ? `${fmtHours(MISSION_H)}+` : fmtHours(n.windowH)) : n.nextBothInH > 0 ? `${t('inShort')} ${fmtHours(n.nextBothInH)}` : '—'}
          </span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>{t('next7')}</span>
          <span className="font-mono text-slate-200">{n.next7Pct}%</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { v: m.sunPct, l: t('sun'), c: '#d8b36a' },
          { v: m.earthPct, l: t('earth'), c: '#7ea6d8' },
          { v: m.bothPct, l: t('both'), c: '#86c29c' },
        ].map((x) => (
          <div key={x.l} className="rounded-xl bg-white/5 py-2">
            <div className="font-mono text-xl font-light" style={{ color: x.c }}>
              {x.v}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-100/40">{x.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 text-center text-[10px] text-slate-100/30">{t('year')}</div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] uppercase tracking-[0.15em] text-slate-100/40">{t('horizonTitle')}</div>
        <HorizonView compact />
      </div>

      <div className="mt-2 flex justify-between font-mono text-[11px] text-slate-100/50">
        <span>
          {t('longestDark')}: <span className="text-slate-100/80">{fmtHours(m.longestDarkHours)}</span>
        </span>
      </div>

      <button className="mt-4 w-full rounded-xl bg-white/10 py-2 text-sm text-slate-100 transition hover:bg-white/20" onClick={() => setTab('metrics')}>
        {t('seeMetrics')} →
      </button>
    </aside>
  )
}
