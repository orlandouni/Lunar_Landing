// Vista panorámica 360°: silueta del terreno + trayectorias del Sol (ámbar) y la Tierra (azul)
import { useMemo } from 'react'
import { visible } from '../lib/visibility'
import { useApp } from '../store'
import type { Sample } from '../types'
import { Explain } from './Explain'

const W = 900
const H = 260
const PAD_L = 34
const PAD_B = 22
const WINDOW_H = 24 * 15 // trayectoria: ±15 días alrededor del instante actual

/** Convierte una serie (az, el) en segmentos que no crucen el salto 360→0 */
function segments(points: { az: number; el: number }[]) {
  const segs: { az: number; el: number }[][] = []
  let cur: { az: number; el: number }[] = []
  for (const p of points) {
    const prev = cur[cur.length - 1]
    if (prev && Math.abs(p.az - prev.az) > 180) {
      segs.push(cur)
      cur = []
    }
    cur.push(p)
  }
  if (cur.length) segs.push(cur)
  return segs
}

export function HorizonView() {
  const { site, data, timeIndex, t } = useApp()
  const samples = data.samples[site.id]
  const now: Sample = samples[Math.min(timeIndex, samples.length - 1)]

  // Rango vertical adaptado al sitio
  const [elMin, elMax] = useMemo(() => {
    const vals = [...site.horizon, ...samples.flatMap((s) => [s.sunEl, s.earthEl])]
    return [Math.floor(Math.min(...vals, -1)) - 1, Math.ceil(Math.max(...vals, 2)) + 1]
  }, [site, samples])

  const x = (az: number) => PAD_L + (az / 360) * (W - PAD_L)
  const y = (el: number) => (H - PAD_B) * (1 - (el - elMin) / (elMax - elMin))

  const terrain = useMemo(() => {
    const pts = site.horizon.map((h, az) => `${x(az)},${y(h)}`)
    return `${x(0)},${H - PAD_B} ${pts.join(' ')} ${x(359)},${y(site.horizon[0])} ${x(359)},${H - PAD_B}`
  }, [site, elMin, elMax])

  const win = samples.slice(Math.max(0, timeIndex - WINDOW_H), timeIndex + WINDOW_H)
  const path = (segs: { az: number; el: number }[][]) =>
    segs.map((s) => s.map((p, i) => `${i ? 'L' : 'M'}${x(p.az)},${y(p.el)}`).join(' ')).join(' ')
  const sunPath = path(segments(win.map((s) => ({ az: s.sunAz, el: s.sunEl }))))
  const earthPath = path(segments(win.map((s) => ({ az: s.earthAz, el: s.earthEl }))))

  const sunVis = visible(now.sunEl, now.sunAz, site.horizon)
  const earthVis = visible(now.earthEl, now.earthAz, site.horizon)

  return (
    <section className="panel">
      <div className="flex items-baseline justify-between">
        <h2 className="panel-title">
          {t('horizonTitle')} · <span className="text-white">{site.name}</span>
        </h2>
        <span className="font-mono text-xs text-slate-400">{now.t.replace('T', ' ').replace(':00Z', ' UTC')}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* rejilla */}
        {Array.from({ length: elMax - elMin + 1 }, (_, i) => elMin + i).map((el) => (
          <g key={el}>
            <line x1={PAD_L} x2={W} y1={y(el)} y2={y(el)} stroke={el === 0 ? '#2a3a5a' : '#131c2c'} />
            <text x={PAD_L - 4} y={y(el) + 3} textAnchor="end" className="fill-slate-600 font-mono text-[9px]">
              {el}°
            </text>
          </g>
        ))}
        {[0, 90, 180, 270].map((az) => (
          <text key={az} x={x(az) + 2} y={H - 6} className="fill-slate-500 font-mono text-[10px]">
            {['N', 'E', 'S', 'W'][az / 90]} {az}°
          </text>
        ))}

        <path d={sunPath} fill="none" stroke="#f5b642" strokeOpacity={0.45} strokeWidth={1.5} />
        <path d={earthPath} fill="none" stroke="#4ea8ff" strokeOpacity={0.45} strokeWidth={1.5} />

        <polygon points={terrain} fill="#3b4659" fillOpacity={0.95} stroke="#6b7a96" strokeWidth={1} />

        <circle cx={x(now.sunAz)} cy={y(now.sunEl)} r={7} fill={sunVis ? '#f5b642' : 'none'} stroke="#f5b642" strokeWidth={2} />
        <circle cx={x(now.earthAz)} cy={y(now.earthEl)} r={6} fill={earthVis ? '#4ea8ff' : 'none'} stroke="#4ea8ff" strokeWidth={2} />
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs">
        <span className={sunVis ? 'text-sun' : 'text-slate-500'}>
          ● {t('sun')}: {sunVis ? t('visible') : t('hidden')} · az {now.sunAz.toFixed(1)}° · el {now.sunEl.toFixed(2)}°
        </span>
        <span className={earthVis ? 'text-earth' : 'text-slate-500'}>
          ● {t('earth')}: {earthVis ? t('visible') : t('hidden')} · az {now.earthAz.toFixed(1)}° · el {now.earthEl.toFixed(2)}°
        </span>
        <span className="text-slate-500">▲ {t('terrain')}: {site.horizonSource ?? '—'}</span>
      </div>
      <Explain k="explainHorizon" />
    </section>
  )
}
