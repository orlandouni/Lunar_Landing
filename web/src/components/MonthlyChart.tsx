// Barras mes a mes de % Sol, % Tierra y % ambos del sitio elegido.
import { useMemo } from 'react'
import { MONTHS } from '../i18n'
import { monthlyMetrics } from '../lib/visibility'
import { useApp } from '../store'

const W = 720
const H = 170
const PL = 30
const PB = 18
const PT = 8

export function MonthlyChart() {
  const { site, data, timeIndex, lang, t } = useApp()
  const samples = data.samples[site.id]
  const months = useMemo(() => monthlyMetrics(samples, site.horizon), [samples, site])
  const current = data.times[timeIndex].slice(0, 7)
  const slot = (W - PL) / Math.max(months.length, 1)
  const bw = slot / 4.2
  const y = (p: number) => PT + (H - PB - PT) * (1 - p / 100)
  const series = [
    { key: 'sunPct' as const, color: '#d8b36a', label: t('sun') },
    { key: 'earthPct' as const, color: '#7ea6d8', label: t('earth') },
    { key: 'bothPct' as const, color: '#86c29c', label: t('both') },
  ]
  return (
    <section className="panel">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title !mb-0">{t('monthlyTitle')}</h2>
        <div className="flex gap-3 font-mono text-[10px] text-slate-400">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('monthlyTitle')}>
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line x1={PL} x2={W} y1={y(p)} y2={y(p)} stroke="#16213a" />
            <text x={PL - 4} y={y(p) + 3} textAnchor="end" className="fill-slate-600 font-mono text-[9px]">
              {p}%
            </text>
          </g>
        ))}
        {months.map(({ month, m }, i) => {
          const x0 = PL + i * slot
          const active = month === current
          return (
            <g key={month}>
              {active && <rect x={x0 + 1} y={0} width={slot - 2} height={H - PB} fill="#ffffff0d" rx={3} />}
              {series.map((s, j) => (
                <rect key={s.key} x={x0 + slot * 0.08 + j * bw * 1.1} y={y(m[s.key])} width={bw} height={H - PB - y(m[s.key])} fill={s.color} rx={1}>
                  <title>
                    {month} · {s.label}: {m[s.key]}%
                  </title>
                </rect>
              ))}
              <text x={x0 + slot / 2} y={H - 5} textAnchor="middle" className={`font-mono text-[9px] ${active ? 'fill-white' : 'fill-slate-500'}`}>
                {MONTHS[lang][+month.slice(5, 7) - 1]}
              </text>
            </g>
          )
        })}
      </svg>
    </section>
  )
}
