// Para la fecha y hora elegidas: elevación del Sol destacada y cuenta regresiva al ocaso (sunset)
// y al ocultamiento de la Tierra (Earthset), o cuánto falta para que salgan si están ocultos.
import { crossing, fmtCountdown, margin } from '../lib/visibility'
import { useApp } from '../store'
import { C } from './colors'

export function SkyNow() {
  const { t, site, data, timeIndex } = useApp()
  const samples = data.samples[site.id]
  const i = Math.min(timeIndex, samples.length - 1)
  const s = samples[i]
  const sunM = margin(s, 'sun', site.horizon)
  const sun = crossing(samples, site.horizon, i, 'sun')
  const earth = crossing(samples, site.horizon, i, 'earth')

  const row = (body: 'sun' | 'earth', c: { visible: boolean; hours: number | null }) => {
    const color = body === 'sun' ? C.sun : C.earth
    const label = body === 'sun' ? (c.visible ? t('sunsetIn') : t('sunriseIn')) : c.visible ? t('earthsetIn') : t('earthriseIn')
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.visible ? color : 'transparent', border: `1.5px solid ${color}` }} />
        <span className="min-w-0 truncate" style={{ color: c.visible ? color : 'rgba(255,255,255,.55)' }} title={t('countdownHint')}>
          {label}
        </span>
        <span className="ml-auto whitespace-nowrap font-mono text-[13px] tabular-nums text-slate-100">
          {c.hours == null ? (c.visible ? t('neverSets') : t('neverRises')) : `${t('inShort')} ${fmtCountdown(c.hours)}`}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-100/40">{t('sunElevation')}</div>
          <div className="font-mono text-3xl font-light tabular-nums" style={{ color: sunM > 0 ? C.sun : 'rgba(255,255,255,.5)' }}>
            {s.sunEl >= 0 ? '+' : '−'}
            {Math.abs(s.sunEl).toFixed(2)}°
          </div>
        </div>
        <div className="pb-1 text-right font-mono text-[11px] leading-snug text-slate-100/45">
          <div className={sunM > 0 ? 'text-sun/80' : ''}>
            {Math.abs(sunM).toFixed(2)}° {sunM > 0 ? t('aboveRelief') : t('belowRelief')}
          </div>
          <div>
            {t('earth')} {s.earthEl >= 0 ? '+' : '−'}
            {Math.abs(s.earthEl).toFixed(2)}°
          </div>
        </div>
      </div>
      <div className="mt-2 space-y-1.5">
        {row('sun', sun)}
        {row('earth', earth)}
      </div>
    </div>
  )
}
