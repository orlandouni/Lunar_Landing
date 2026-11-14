// Gráfico 2D del año completo: una fila por sitio, franja de Sol (arriba) y de Tierra (abajo).
// Se dibuja en canvas porque son 9 sitios × 8 784 horas.
import { useEffect, useMemo, useRef, useState } from 'react'
import { MONTHS } from '../i18n'
import { useApp } from '../store'
import { Explain } from './Explain'

const ROW = 26
const LANE = 9

export function VisibilityGantt() {
  const { data, flags, site, setSiteId, timeIndex, setTimeIndex, scores, lang, t } = useApp()
  const canvas = useRef<HTMLCanvasElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const n = data.times.length

  const rows = useMemo(() => [...data.sites].sort((a, b) => scores[b.id] - scores[a.id]), [data.sites, scores])
  const H = rows.length * ROW + 18

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const LABEL_W = width < 560 ? 104 : 150
  const plotW = width - LABEL_W

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = width * dpr
    c.height = H * dpr
    const g = c.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, width, H)
    g.font = `${width < 560 ? 10 : 11}px Inter, system-ui, sans-serif`
    g.textBaseline = 'middle'

    const cols = Math.floor(plotW)
    rows.forEach((s, r) => {
      const y0 = r * ROW
      const f = flags[s.id]
      if (s.id === site.id) {
        g.fillStyle = 'rgba(255,255,255,0.06)'
        g.fillRect(0, y0, width, ROW)
      }
      g.fillStyle = s.id === site.id ? '#e2e8f0' : '#94a3b8'
      g.fillText(s.name, 6, y0 + ROW / 2)
      g.fillStyle = '#0b1220'
      g.fillRect(LABEL_W, y0 + 3, plotW, LANE * 2 + 2)
      // una columna de píxel = fracción de horas visibles en ese tramo
      for (let cx = 0; cx < cols; cx++) {
        const a = Math.floor((cx / cols) * n)
        const b = Math.max(a + 1, Math.floor(((cx + 1) / cols) * n))
        let sun = 0
        let earth = 0
        for (let i = a; i < b; i++) {
          sun += f.sun[i]
          earth += f.earth[i]
        }
        if (sun) {
          g.fillStyle = `rgba(216,179,106,${(0.15 + (0.85 * sun) / (b - a)).toFixed(2)})`
          g.fillRect(LABEL_W + cx, y0 + 3, 1, LANE)
        }
        if (earth) {
          g.fillStyle = `rgba(126,166,216,${(0.15 + (0.85 * earth) / (b - a)).toFixed(2)})`
          g.fillRect(LABEL_W + cx, y0 + 3 + LANE + 2, 1, LANE)
        }
      }
    })

    // meses
    g.fillStyle = '#64748b'
    g.font = '10px "JetBrains Mono", monospace'
    data.times.forEach((tt, i) => {
      if (i === 0 || tt.slice(5, 7) !== data.times[i - 1].slice(5, 7)) {
        const x = LABEL_W + (i / n) * plotW
        g.fillRect(x, 0, 1, rows.length * ROW)
        g.fillText(MONTHS[lang][+tt.slice(5, 7) - 1], x + 3, H - 8)
      }
    })
    g.fillStyle = '#64748b'
  }, [rows, flags, site.id, width, H, plotW, LABEL_W, n, data.times, lang])

  const cursorX = LABEL_W + (timeIndex / n) * plotW

  return (
    <section className="panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="panel-title">{t('ganttTitle')}</h2>
        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-sun" /> {t('sun')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm bg-earth" /> {t('earth')}
          </span>
        </div>
      </div>
      <div ref={wrap} className="relative w-full min-w-0 overflow-hidden">
        <canvas
          ref={canvas}
          style={{ width, height: H }}
          className="block cursor-crosshair"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const px = e.clientX - r.left
            const row = Math.floor((e.clientY - r.top) / ROW)
            if (rows[row]) setSiteId(rows[row].id)
            if (px >= LABEL_W) setTimeIndex(Math.min(n - 1, Math.floor(((px - LABEL_W) / plotW) * n)))
          }}
        />
        <div className="pointer-events-none absolute top-0 w-0.5 bg-white" style={{ left: cursorX, height: rows.length * ROW }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{t('ganttHint')}</p>
      <Explain k="explainGantt" />
    </section>
  )
}
