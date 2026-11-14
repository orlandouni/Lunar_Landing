// Mapa polar sur (proyección azimutal: radio = colatitud, 0° de longitud arriba, hacia la Tierra)
import { scoreColor } from '../lib/visibility'
import { useApp } from '../store'
import { Explain } from './Explain'

const SIZE = 400
const C = SIZE / 2
const R = 175
const MAX_COLAT = 6.5 // grados desde el polo que caben en el mapa (hasta 83.5°S)
const D = Math.PI / 180

function project(lat: number, lon: number) {
  const r = ((90 + lat) / MAX_COLAT) * R
  return { x: C + r * Math.sin(lon * D), y: C - r * Math.cos(lon * D) }
}

export function PolarMap() {
  const { data, site, setSiteId, yearMetrics, bestSiteId, compareIds, mode, t } = useApp()

  return (
    <section className="panel">
      <h2 className="panel-title">{t('mapTitle')}</h2>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[460px]">
        <defs>
          <radialGradient id="moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1d2638" />
            <stop offset="100%" stopColor="#0b111c" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r={R} fill="url(#moon)" stroke="#2a3a5a" />
        {[1, 2, 3, 4, 5, 6].map((c) => (
          <g key={c}>
            <circle cx={C} cy={C} r={(c / MAX_COLAT) * R} fill="none" stroke="#1f2b44" strokeDasharray="2 4" />
            <text x={C + 3} y={C - (c / MAX_COLAT) * R + 10} className="fill-slate-600 font-mono text-[9px]">
              {90 - c}°S
            </text>
          </g>
        ))}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((lon) => {
          const p = project(-90 + MAX_COLAT, lon)
          const lbl = project(-90 + MAX_COLAT * 1.08, lon)
          const name = lon === 0 ? '0°' : lon <= 180 ? `${lon}°E` : `${360 - lon}°W`
          return (
            <g key={lon}>
              <line x1={C} y1={C} x2={p.x} y2={p.y} stroke="#1f2b44" />
              <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 font-mono text-[9px]">
                {name}
              </text>
            </g>
          )
        })}
        <text x={C} y={14} textAnchor="middle" className="fill-earth font-mono text-[9px]">
          ↑ {t('earth')}
        </text>

        {data.sites.map((s) => {
          const p = project(s.lat, s.lon)
          const m = yearMetrics[s.id]
          const selected = s.id === site.id
          const compared = compareIds.includes(s.id)
          const best = mode === 'mission' && s.id === bestSiteId
          return (
            <g key={s.id} className="cursor-pointer" onClick={() => setSiteId(s.id)}>
              {(selected || compared) && (
                <circle cx={p.x} cy={p.y} r={14} fill="none" stroke={selected ? '#fff' : '#4ea8ff'} strokeWidth={1.5} />
              )}
              {best && <circle cx={p.x} cy={p.y} r={19} fill="none" stroke="#4ade80" strokeDasharray="3 3" />}
              <circle cx={p.x} cy={p.y} r={8} fill={scoreColor(m.bothPct)} stroke="#04070d" strokeWidth={2} />
              <text x={p.x + 12} y={p.y + 4} className={`font-mono text-[10px] ${selected ? 'fill-white' : 'fill-slate-400'}`}>
                {s.name}
              </text>
              <title>
                {s.name}: {t('both')} {m.bothPct}%
              </title>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-2 font-mono text-[10px] text-slate-400">
        <span>0%</span>
        <div className="h-2 w-40 rounded" style={{ background: `linear-gradient(90deg, ${scoreColor(0)}, ${scoreColor(50)}, ${scoreColor(100)})` }} />
        <span>100% {t('both')}</span>
      </div>
      <Explain k="explainMap" />
    </section>
  )
}
