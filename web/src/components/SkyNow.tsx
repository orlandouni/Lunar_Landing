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
  const sunState = sunM > 0 ? 'sunVisible' : s.sunEl > 0 ? 'sunOccluded' : 'sunNight'
  const angle = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)}°`
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
        <span className="ml-auto whitespace-nowrap text-[13px] text-slate-100">
          {c.hours == null ? (c.visible ? t('neverSets') : t('neverRises')) : `${t('inShort')} ${fmtCountdown(c.hours)}`}
        </span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400">{t('sunLocalElevation')}</div>
          <div className="font-mono text-3xl font-light tabular-nums" style={{ color: sunM > 0 ? C.sun : 'rgba(255,255,255,.5)' }}>
            {angle(sunM)}
          </div>
          <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${sunM > 0 ? 'border-sun/25 text-sun' : 'border-slate-500/30 text-slate-400'}`}>{t(sunState)}</span>
        </div>
        <div className="pb-1 text-right text-[11px] leading-snug text-slate-400">
          <div title={t('geometricElevation')}>
            <span className="font-mono tabular-nums">{angle(s.sunEl)}</span> {t('geometricShort')}
          </div>
          <div>
            {t('earth')} <span className="font-mono tabular-nums">{angle(s.earthEl)}</span> {t('geometricShort')}
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
