import { useMemo } from 'react'
import { MONTHS } from '../i18n'
import { dailyBoth, scoreColor } from '../lib/visibility'
import { useApp } from '../store'
import { Explain } from './Explain'

const SPEEDS = [1, 4, 12, 24]

export function Timeline() {
  const { data, site, timeIndex, setTimeIndex, playing, setPlaying, speed, setSpeed, t, lang } = useApp()
  const n = data.times.length
  const daily = useMemo(() => dailyBoth(data.samples[site.id], site.horizon), [data, site])
  const W = 1000
  const BAR = W / daily.length

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="panel-title !mb-0">
          {t('timelineTitle')} · {t('both')} · <span className="text-white">{site.name}</span>
        </h2>
        <div className="flex items-center gap-2">
          <button className={`btn ${playing ? 'btn-on' : ''}`} onClick={() => setPlaying(!playing)}>
            {playing ? `❚❚ ${t('pause')}` : `▶ ${t('play')}`}
          </button>
          <span className="text-xs text-slate-500">{t('speed')}</span>
          {SPEEDS.map((s) => (
            <button key={s} className={`btn !px-2 font-mono text-xs ${speed === s ? 'btn-on' : ''}`} onClick={() => setSpeed(s)}>
              {s}h
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} 60`}
        preserveAspectRatio="none"
        className="mt-3 h-16 w-full cursor-pointer"
        onClick={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          setTimeIndex(Math.floor(((e.clientX - r.left) / r.width) * n))
        }}
      >
        {daily.map((f, i) => (
          <rect key={i} x={i * BAR} y={60 - 4 - f * 52} width={Math.max(BAR - 0.4, 0.5)} height={4 + f * 52} fill={scoreColor(f * 100)} opacity={0.85} />
        ))}
        <line x1={(timeIndex / n) * W} x2={(timeIndex / n) * W} y1={0} y2={60} stroke="#fff" strokeWidth={2} />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-slate-500">
        {MONTHS[lang].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={n - 1}
        value={timeIndex}
        onChange={(e) => setTimeIndex(+e.target.value)}
        className="mt-2 w-full"
        aria-label={t('timelineTitle')}
      />
      <Explain k="explainTimeline" />
    </section>
  )
}
