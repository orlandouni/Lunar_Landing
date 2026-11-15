// Barras mes a mes de % Sol, % Tierra y % ambos del sitio elegido.
import { useMemo } from 'react'
import { MONTHS } from '../i18n'
import { monthlyStates, VISIBILITY_STATES } from '../lib/visibilityStates'
import { useApp } from '../store'

const W = 720
const H = 170
const PL = 30
const PB = 18
const PT = 8

export function MonthlyChart() {
  const { site, data, flags, timeIndex, lang, t } = useApp()
  const f = flags[site.id]
  const months = useMemo(() => monthlyStates(data.times, f), [data.times, f])
  const current = data.times[timeIndex].slice(0, 7)
  const slot = (W - PL) / Math.max(months.length, 1)
  const y = (p: number) => PT + (H - PB - PT) * (1 - p / 100)
  return (
    <section className="panel">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title !mb-0">{t('monthlyTitle')}</h2>

      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('monthlyTitle')}>
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line x1={PL} x2={W} y1={y(p)} y2={y(p)} stroke="#16213a" />
            <text x={PL - 4} y={y(p) + 3} textAnchor="end" className="fill-slate-600 font-mono tabular-nums text-[9px]">
              {p}%
            </text>
          </g>
        ))}
        {months.map(({ month, total, counts }, i) => {
          const x0 = PL + i * slot
          const active = month === current
          let cumulative = 0
          return (
            <g key={month}>
              {active && <rect x={x0 + 1} y={0} width={slot - 2} height={H - PB} fill="#ffffff0d" rx={3} />}
              {VISIBILITY_STATES.map((state) => {
                const bottom = cumulative / total * 100
                cumulative += counts[state.id]
                const top = cumulative / total * 100
                return (
                  <rect key={state.id} x={x0 + slot * 0.18} y={y(top)} width={slot * 0.64} height={y(bottom) - y(top)} fill={state.color}>
                    <title>{month} · {t(state.label)}: {(counts[state.id] / total * 100).toFixed(1)}% ({counts[state.id]} h / {total} h)</title>
                  </rect>
                )
              })}
              <text x={x0 + slot / 2} y={H - 5} textAnchor="middle" className={`text-[9px] ${active ? 'fill-white' : 'fill-slate-500'}`}>
                {MONTHS[lang][+month.slice(5, 7) - 1]}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
