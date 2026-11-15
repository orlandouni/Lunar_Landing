// Panel 3 · Métricas del sitio: estado ahora, % del año, rachas, código de barras del mes y mejor ventana.
import { useMemo } from 'react'
import { MONTHS } from '../i18n'
import { fmtHours } from '../lib/visibility'
import { CloseX } from './CloseX'
import { useApp } from '../store'
import { Explain } from './Explain'
import { SkyNow } from './SkyNow'

function Big({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="font-mono text-3xl font-light tabular-nums" style={{ color }}>
        {value}
        <span className="text-lg">%</span>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  )
}

/** Racha más larga de horas con Sol y Tierra a la vez */
function bestWindow(sun: Uint8Array, earth: Uint8Array) {
  let best = { start: -1, len: 0 }
  let cur = 0
  for (let i = 0; i < sun.length; i++) {
    cur = sun[i] && earth[i] ? cur + 1 : 0
    if (cur > best.len) best = { start: i - cur + 1, len: cur }
  }
  return best
}

const BC_W = 720
const BC_ROW = 9

export function SiteMetrics() {
  const { site, data, timeIndex, setTimeIndex, setPlaying, yearMetrics, flags, t, mode, bestSiteId, lang, dismissed, dismiss } = useApp()
  const f = flags[site.id]
  const times = data.times
  const i = Math.min(timeIndex, f.sun.length - 1)
  const m = yearMetrics[site.id]

  // Código de barras del mes actual: una columna por hora
  const month = times[i].slice(0, 7)
  const [m0, m1] = useMemo(() => {
    let a = i
    let b = i
    while (a > 0 && times[a - 1].startsWith(month)) a--
    while (b < times.length - 1 && times[b + 1].startsWith(month)) b++
    return [a, b + 1]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [times, month])
  const hours = m1 - m0
  const colW = BC_W / hours

  const win = useMemo(() => bestWindow(f.sun, f.earth), [f])
  const fmtDate = (k: number) =>
    new Date(times[k]).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { timeZone: 'UTC', day: 'numeric', month: 'short' })

  const rows: { key: string; color: string; on: (k: number) => boolean }[] = [
    { key: 'sun', color: '#d8b36a', on: (k) => !!f.sun[k] },
    { key: 'earth', color: '#7ea6d8', on: (k) => !!f.earth[k] },
    { key: 'both', color: '#86c29c', on: (k) => !!(f.sun[k] && f.earth[k]) },
  ]

  return (
    <section className="panel">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="panel-title !mb-0">
          {t('metricsTitle')} · <span className="text-slate-100">{site.name}</span>
        </h2>
        {mode === 'mission' && site.id === bestSiteId && (
          <span className="rounded bg-both/15 px-2 py-0.5 font-mono text-[10px] text-both">★ {t('recommended')}</span>
        )}
      </div>

      {m.bothHours === 0 && !dismissed.has(`warn-${site.id}`) && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <p className="flex-1">{t(m.sunHours === 0 ? 'permShadow' : 'noBoth')}</p>
          <CloseX onClick={() => dismiss(`warn-${site.id}`)} />
        </div>
      )}

      <div className="mb-4">
        <SkyNow />
      </div>

      <div className="mb-1 text-[11px] text-slate-500">{t('year')}</div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Big label={t('sun')} value={m.sunPct} color="#d8b36a" />
        <Big label={t('earth')} value={m.earthPct} color="#7ea6d8" />
        <Big label={t('both')} value={m.bothPct} color="#86c29c" />
      </div>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-slate-400">
        <span>
          {t('longestDark')}: <span className="text-slate-200">{fmtHours(m.longestDarkHours)}</span>
        </span>
        <span>
          {t('longestNoComm')}: <span className="text-slate-200">{fmtHours(m.longestNoCommHours)}</span>
        </span>
      </div>

      {/* Código de barras del mes */}
      <div className="mb-1 flex items-baseline justify-between text-[11px] text-slate-500">
        <span>
          {t('barcode')} · {MONTHS[lang][+month.slice(5, 7) - 1]} {month.slice(0, 4)}
        </span>
        <span className="flex gap-2 font-mono text-[10px]">
          <span className="text-sun">{t('sun')}</span>
          <span className="text-earth">{t('earth')}</span>
          <span className="text-both">{t('both')}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${BC_W} ${BC_ROW * 3 + 4}`}
        preserveAspectRatio="none"
        className="h-10 w-full cursor-pointer"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setPlaying(false)
          setTimeIndex(m0 + Math.min(hours - 1, Math.floor(((e.clientX - r.left) / r.width) * hours)))
        }}
      >
        {rows.map((row, r) => (
          <g key={row.key}>
            <rect x={0} y={r * (BC_ROW + 2)} width={BC_W} height={BC_ROW} fill="#0b1220" />
            {Array.from({ length: hours }, (_, k) =>
              row.on(m0 + k) ? <rect key={k} x={k * colW} y={r * (BC_ROW + 2)} width={colW + 0.3} height={BC_ROW} fill={row.color} /> : null,
            )}
          </g>
        ))}
        <rect x={(i - m0) * colW - 1} y={0} width={2} height={BC_ROW * 3 + 4} fill="#fff" />
      </svg>

      {/* Buscador de ventana */}
      {win.len > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-both/25 bg-both/5 px-3 py-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-both/80">{t('bestWindow')}</div>
            <div className="text-sm text-slate-100">
              {fmtDate(win.start)} → {fmtDate(win.start + win.len - 1)} <span className="font-mono text-xs text-slate-400">· {fmtHours(win.len)}</span>
            </div>
          </div>
          <button
            className="btn !py-1 text-xs"
            onClick={() => {
              setPlaying(false)
              setTimeIndex(win.start)
            }}
          >
            {t('goThere')} →
          </button>
        </div>
      )}
      <Explain k="explainMetrics" />
    </section>
  )
}
