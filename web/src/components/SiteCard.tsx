// Tarjeta que aparece al elegir un sitio en la Luna: estado ahora, % del año y su horizonte.
import { fmtHours, MISSION_H, runAround, SAFE_SLOPE } from '../lib/visibility'
import { nowColor } from './colors'
import { useApp } from '../store'
import { HorizonView } from './HorizonView'

function Status({ on, label, sub, color }: { on: boolean; label: string; sub: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: on ? color : 'transparent', border: `1.5px solid ${color}` }} />
      <span style={{ color: on ? color : 'rgba(255,255,255,.55)' }}>{label}</span>
      <span className="ml-auto font-mono text-[11px] text-slate-100/40">{sub}</span>
    </div>
  )
}

export function SiteCard() {
  const { t, site, focus, setFocus, flags, timeIndex, yearMetrics, setTab, now, nowRanking, data } = useApp()
  if (!focus) return null
  const f = flags[site.id]
  const i = Math.min(timeIndex, f.sun.length - 1)
  const m = yearMetrics[site.id]
  const n = now[site.id]
  const rank = nowRanking.indexOf(site.id) + 1
  const until = (arr: Uint8Array) => {
    const r = runAround(arr, i)
    return r.end === arr.length - 1 ? t('never') : `${t('until')} ${fmtHours(r.end - i + 1)}`
  }

  return (
    <aside className="glass pointer-events-auto absolute right-4 top-20 z-20 w-[360px] max-w-[calc(100vw-2rem)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-lg font-medium text-slate-100">
            <span className="h-3 w-3 rounded-full" style={{ background: nowColor(now[site.id]) }} />
            {site.name}
            {rank === 1 && now[site.id].both && <span className="text-sm text-both">★</span>}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-100/40">
            {Math.abs(site.lat).toFixed(2)}°S {Math.abs(site.lon).toFixed(2)}°{site.lon >= 0 ? 'E' : 'W'}
            {site.elevM != null && ` · ${Math.round(site.elevM).toLocaleString()} m`}
          </div>
          {site.slopeDeg != null && (
            <div className={`mt-0.5 font-mono text-[11px] ${site.slopeDeg <= SAFE_SLOPE ? 'text-slate-100/40' : 'text-sun'}`} title={t('slopeHint')}>
              {t('slope')} {site.slopeDeg.toFixed(1)}° · {site.slopeDeg <= SAFE_SLOPE ? t('slopeOk') : t('slopeHigh')}
            </div>
          )}
        </div>
        <button className="rounded-full px-2 text-slate-100/50 hover:bg-white/10 hover:text-slate-100" onClick={() => setFocus(false)} aria-label="Cerrar">
          ✕
        </button>
      </div>

      {m.bothHours === 0 && <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">{t(m.sunHours === 0 ? 'permShadow' : 'noBoth')}</p>}

      <div className="mt-4 space-y-1.5">
        <Status on={!!f.sun[i]} label={f.sun[i] ? t('sunUp') : t('sunDown')} sub={until(f.sun)} color="#d8b36a" />
        <Status on={!!f.earth[i]} label={f.earth[i] ? t('commOk') : t('commLost')} sub={until(f.earth)} color="#7ea6d8" />
      </div>

      {/* Recomendación para la hora elegida */}
      <div className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-slate-400">
        <div className="flex justify-between">
          <span>{t('rankAt')}</span>
          <span className="font-mono text-slate-200">
            {rank}º / {data.sites.length}
          </span>
        </div>
        <div className="mt-1 flex justify-between">
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
