// Vista panorámica 360° (2D): silueta del terreno + trayectorias del Sol (ámbar) y la Tierra (azul)
import { useMemo, useState } from 'react'
import { visible } from '../lib/visibility'
import { useApp } from '../store'
import type { Sample } from '../types'
import { Explain } from './Explain'

const W = 900
const H = 280
const PAD_L = 36
const PAD_B = 24
const PAD_T = 8
const SUN_RADIUS_DEG = 0.2665 // radio aparente del Sol
const EARTH_RADIUS_DEG = 0.95 // radio aparente de la Tierra vista desde la Luna (~1.9°)
const TRAILS = [1, 7, 15] // días a cada lado del instante

type P = { az: number; el: number; vis: boolean }

/** Corta la serie en tramos que no crucen el salto 360→0 ni cambien de visibilidad */
function segments(points: P[]) {
  const segs: P[][] = []
  let cur: P[] = []
  for (const p of points) {
    const prev = cur[cur.length - 1]
    if (prev && (Math.abs(p.az - prev.az) > 180 || p.vis !== prev.vis)) {
      if (Math.abs(p.az - prev.az) <= 180) cur.push(p) // une el tramo con el siguiente
      segs.push(cur)
      cur = []
    }
    cur.push(p)
  }
  if (cur.length) segs.push(cur)
  return segs
}

/** `compact`: versión para la tarjeta del sitio (sin título, controles ni pie) */
export function HorizonView({ compact = false }: { compact?: boolean }) {
  const { site, data, timeIndex, t } = useApp()
  const samples = data.samples[site.id]
  const now: Sample = samples[Math.min(timeIndex, samples.length - 1)]
  const [trailDays, setTrailDays] = useState(15)
  const [hoverAz, setHoverAz] = useState<number | null>(null)

  // Rango vertical adaptado al sitio
  const [elMin, elMax] = useMemo(() => {
    let lo = Math.min(...site.horizon, -1)
    let hi = Math.max(...site.horizon, 2)
    for (const s of samples) {
      lo = Math.min(lo, s.sunEl, s.earthEl)
      hi = Math.max(hi, s.sunEl, s.earthEl)
    }
    return [Math.floor(lo) - 1, Math.ceil(hi) + 1]
  }, [site, samples])

  const x = (az: number) => PAD_L + (az / 360) * (W - PAD_L)
  const y = (el: number) => PAD_T + (H - PAD_B - PAD_T) * (1 - (el - elMin) / (elMax - elMin))
  const pxPerDeg = (H - PAD_B - PAD_T) / (elMax - elMin)

  const terrain = useMemo(() => {
    const pts = site.horizon.map((h, az) => `${x(az)},${y(h)}`)
    return `${x(0)},${H - PAD_B} ${pts.join(' ')} ${W},${y(site.horizon[0])} ${W},${H - PAD_B}`
  }, [site, elMin, elMax])

  const win = samples.slice(Math.max(0, timeIndex - trailDays * 24), timeIndex + trailDays * 24 + 1)
  const trail = (key: 'sun' | 'earth') =>
    segments(
      win.map((s) => {
        const az = key === 'sun' ? s.sunAz : s.earthAz
        const el = key === 'sun' ? s.sunEl : s.earthEl
        return { az, el, vis: visible(el, az, site.horizon) }
      }),
    )

  const sunVis = visible(now.sunEl, now.sunAz, site.horizon)
  const earthVis = visible(now.earthEl, now.earthAz, site.horizon)
  // Sol parcialmente visible: el centro está tapado pero el borde superior asoma
  const sunPartial = !sunVis && now.sunEl + SUN_RADIUS_DEG > site.horizon[((Math.round(now.sunAz) % 360) + 360) % 360]
  const sunR = Math.max(SUN_RADIUS_DEG * pxPerDeg, 4)
  const earthR = Math.max(EARTH_RADIUS_DEG * pxPerDeg, 5)

  const gridStep = elMax - elMin > 16 ? 2 : 1
  const grid = []
  for (let el = elMin; el <= elMax; el += gridStep) grid.push(el)

  return (
    <section className={compact ? '' : 'panel'}>
      {!compact && <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="panel-title">
          {t('horizonTitle')} · <span className="text-slate-100">{site.name}</span>
        </h2>
        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
          <span className="mr-1">{t('trail')}</span>
          {TRAILS.map((d) => (
            <button key={d} className={`btn !px-2 !py-0.5 text-[11px] ${trailDays === d ? 'btn-on' : ''}`} onClick={() => setTrailDays(d)}>
              ±{d}d
            </button>
          ))}
          <span className="ml-2 text-slate-300">{now.t.replace('T', ' ').replace(':00Z', ' UTC')}</span>
        </div>
      </div>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        role="img"
        aria-label={`${t('horizonTitle')} ${site.name}`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          setHoverAz(px < PAD_L ? null : Math.min(359, Math.max(0, Math.round(((px - PAD_L) / (W - PAD_L)) * 360))))
        }}
        onMouseLeave={() => setHoverAz(null)}
      >
        <defs>
          <linearGradient id="sky-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d1a30" />
            <stop offset="100%" stopColor="#1b2d4a" />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a6577" />
            <stop offset="100%" stopColor="#2a3240" />
          </linearGradient>
        </defs>
        {/* cielo: más claro cuando hay Sol */}
        <rect x={PAD_L} y={PAD_T} width={W - PAD_L} height={H - PAD_B - PAD_T} fill={sunVis ? 'url(#sky-day)' : '#05080f'} />

        {grid.map((el) => (
          <g key={el}>
            <line x1={PAD_L} x2={W} y1={y(el)} y2={y(el)} stroke={el === 0 ? '#3a4d72' : '#16213a'} strokeDasharray={el === 0 ? '4 3' : undefined} />
            <text x={PAD_L - 4} y={y(el) + 3} textAnchor="end" className="fill-slate-500 font-mono text-[9px]">
              {el}°
            </text>
          </g>
        ))}
        {Array.from({ length: 13 }, (_, i) => i * 30).map((az) => (
          <g key={az}>
            <line x1={x(az)} x2={x(az)} y1={PAD_T} y2={H - PAD_B} stroke="#121b2e" />
            <text x={x(az)} y={H - 8} textAnchor={az === 0 ? 'start' : az === 360 ? 'end' : 'middle'} className="fill-slate-500 font-mono text-[10px]">
              {az % 90 === 0 ? `${['N', 'E', 'S', 'W', 'N'][az / 90]} ` : ''}
              {az}°
            </text>
          </g>
        ))}

        {/* trayectorias: sólidas donde son visibles, punteadas donde las tapa el terreno */}
        {(['sun', 'earth'] as const).map((k) =>
          trail(k).map((seg, i) => (
            <path
              key={`${k}${i}`}
              d={seg.map((p, j) => `${j ? 'L' : 'M'}${x(p.az).toFixed(1)},${y(p.el).toFixed(1)}`).join('')}
              fill="none"
              stroke={k === 'sun' ? '#d8b36a' : '#7ea6d8'}
              strokeOpacity={seg[seg.length - 1].vis ? 0.75 : 0.3}
              strokeDasharray={seg[seg.length - 1].vis ? undefined : '3 3'}
              strokeWidth={1.5}
            />
          )),
        )}

        <polygon points={terrain} fill="url(#ground)" stroke="#8c99b3" strokeWidth={1} />

        {/* Tierra y Sol en el instante actual */}
        <circle cx={x(now.earthAz)} cy={y(now.earthEl)} r={earthR} fill={earthVis ? '#7ea6d8' : '#7ea6d822'} stroke="#7ea6d8" strokeWidth={1.5} />
        {sunVis && <circle cx={x(now.sunAz)} cy={y(now.sunEl)} r={sunR + 6} fill="#d8b36a" opacity={0.18} />}
        <circle
          cx={x(now.sunAz)}
          cy={y(now.sunEl)}
          r={sunR}
          fill={sunVis ? '#ffd27a' : sunPartial ? '#d8b36a88' : '#d8b36a22'}
          stroke="#d8b36a"
          strokeWidth={1.5}
        />

        {/* cursor */}
        {hoverAz !== null && (
          <g pointerEvents="none">
            <line x1={x(hoverAz)} x2={x(hoverAz)} y1={PAD_T} y2={H - PAD_B} stroke="#ffffff55" />
            <circle cx={x(hoverAz)} cy={y(site.horizon[hoverAz])} r={3} fill="#fff" />
            <g transform={`translate(${Math.min(x(hoverAz) + 6, W - 128)},${PAD_T + 4})`}>
              <rect width={122} height={32} rx={4} fill="#04070dcc" stroke="#2a3a5a" />
              <text x={6} y={13} className="fill-slate-200 font-mono text-[10px]">
                {t('azimuth')} {hoverAz}°
              </text>
              <text x={6} y={26} className="fill-slate-400 font-mono text-[10px]">
                {t('terrain')} {site.horizon[hoverAz].toFixed(2)}°
              </text>
            </g>
          </g>
        )}
      </svg>
      {!compact && <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
        <span className={sunVis ? 'text-sun' : 'text-slate-500'}>
          ● {t('sun')}: {sunVis ? t('visible') : t('hidden')}
          {sunPartial ? ' (½)' : ''} · az {now.sunAz.toFixed(1)}° · el {now.sunEl.toFixed(2)}°
        </span>
        <span className={earthVis ? 'text-earth' : 'text-slate-500'}>
          ● {t('earth')}: {earthVis ? t('visible') : t('hidden')} · az {now.earthAz.toFixed(1)}° · el {now.earthEl.toFixed(2)}°
        </span>
        <span className="text-slate-500">▲ {t('terrain')}: {site.horizonSource ?? '—'}</span>
      </div>}
      <Explain k="explainHorizon" />
    </section>
  )
}
