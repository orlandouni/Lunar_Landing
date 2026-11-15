// Línea de tiempo única: mueve los tres paneles a la vez.
import { useEffect, useMemo, useRef, useState } from 'react'
import { MONTHS } from '../i18n'
import { dailyBoth, nextChange, scoreColor } from '../lib/visibility'
import { useApp } from '../store'

const SPEEDS = [1, 4, 12, 24]
const W = 1000

export function Timeline() {
  const { data, site, flags, timeIndex, setTimeIndex, playing, setPlaying, speed, setSpeed, t, lang, tab } = useApp()
  const n = data.times.length
  const [collapsed, setCollapsed] = useState(false)
  const previousTab = useRef(tab)
  useEffect(() => {
    if (previousTab.current !== tab) {
      setCollapsed(true)
      previousTab.current = tab
    }
  }, [tab])
  const daily = useMemo(() => dailyBoth(data.samples[site.id], site.horizon), [data, site])
  const BAR = W / daily.length
  const f = flags[site.id]

  const monthTicks = useMemo(() => {
    const out: { i: number; m: number }[] = []
    data.times.forEach((tt, i) => {
      if (i === 0 || tt.slice(5, 7) !== data.times[i - 1].slice(5, 7)) out.push({ i, m: +tt.slice(5, 7) - 1 })
    })
    return out
  }, [data.times])

  // Un salto por astro: al próximo cambio de estado
  const nextSun = nextChange(f.sun, timeIndex, f.sun[timeIndex] ? 0 : 1)
  const nextEarth = nextChange(f.earth, timeIndex, f.earth[timeIndex] ? 0 : 1)

  const dateStr = new Date(data.times[timeIndex]).toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const go = (k: number) => {
    if (k < 0) return
    setPlaying(false)
    setTimeIndex(k)
  }

  return (
    <>
    <section id="explore-timeline" className={`glass pointer-events-auto absolute inset-x-4 bottom-4 z-30 px-4 py-3 transition-[transform,visibility] duration-300 ease-in-out motion-reduce:transition-none ${collapsed ? '-translate-x-[calc(100%+2rem)] invisible' : 'translate-x-0 visible'}`} title={t('shortcuts')}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm ${playing ? 'border-earth bg-earth/20 text-slate-100' : 'border-white/20 hover:border-white/50'}`}
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? t('pause') : t('play')}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="btn !px-2 !py-1 text-xs" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} title={t('speed')}>
          ×{speed}h
        </button>
        <span className="font-mono tabular-nums text-sm text-slate-100">{dateStr} UTC</span>
        <span className="flex-1" />
        <button className="btn !px-2 !py-1 text-xs" onClick={() => setCollapsed(true)} aria-label={t('hideTimeline')} title={t('hideTimeline')} aria-expanded={!collapsed} aria-controls="explore-timeline">←</button>
        <button className="btn !px-2 !py-1 text-xs text-sun disabled:opacity-30" disabled={nextSun < 0} onClick={() => go(nextSun)}>
          ⏭ {f.sun[timeIndex] ? t('nextSunset') : t('nextSunrise')}
        </button>
        <button className="btn !px-2 !py-1 text-xs text-earth disabled:opacity-30" disabled={nextEarth < 0} onClick={() => go(nextEarth)}>
          ⏭ {f.earth[timeIndex] ? t('nextCommLoss') : t('nextCommGain')}
        </button>
      </div>

      <div className="relative mt-2">
        <svg
          viewBox={`0 0 ${W} 40`}
          preserveAspectRatio="none"
          className="h-10 w-full cursor-pointer touch-none"
          onPointerDown={(e) => {
            const el = e.currentTarget
            const set = (x: number) => {
              const r = el.getBoundingClientRect()
              setTimeIndex(Math.min(n - 1, Math.max(0, Math.floor(((x - r.left) / r.width) * n))))
            }
            setPlaying(false)
            set(e.clientX)
            const move = (ev: PointerEvent) => set(ev.clientX)
            const up = () => {
              window.removeEventListener('pointermove', move)
              window.removeEventListener('pointerup', up)
            }
            window.addEventListener('pointermove', move)
            window.addEventListener('pointerup', up)
          }}
        >
          {daily.map((fr, i) => (
            <rect key={i} x={i * BAR} y={40 - 3 - fr * 35} width={Math.max(BAR - 0.4, 0.5)} height={3 + fr * 35} fill={scoreColor(fr * 100)} opacity={0.6} />
          ))}
          <line x1={(timeIndex / n) * W} x2={(timeIndex / n) * W} y1={0} y2={40} stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="relative h-3 text-[10px] text-slate-500">
          {monthTicks.map(({ i, m }) => (
            <span key={i} className="absolute" style={{ left: `${(i / n) * 100}%` }}>
              {MONTHS[lang][m]}
            </span>
          ))}
        </div>
      </div>
    </section>
    {collapsed && (
      <div className="glass absolute bottom-4 left-4 z-30 flex max-w-[calc(100vw-2rem)] items-center gap-2 p-2">
        <button className="btn text-xs" onClick={() => setCollapsed(false)} aria-expanded={!collapsed} aria-controls="explore-timeline">→ {t('showTimeline')}</button>
        <button className="btn" onClick={() => setPlaying(!playing)} aria-label={playing ? t('pause') : t('play')}>{playing ? 'Ⅱ' : '▶'}</button>
        <span className="hidden font-mono tabular-nums text-xs text-slate-400 sm:inline">{dateStr} UTC</span>
      </div>
    )}
    </>
  )
}
