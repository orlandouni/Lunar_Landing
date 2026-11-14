import { useApp } from '../store'

const SOURCES = [
  { label: 'JPL Horizons System (NASA/JPL SSD)', href: 'https://ssd.jpl.nasa.gov/horizons/' },
  { label: 'LOLA DEM 80 m/px, polo sur (NASA GSFC PGDA)', href: 'https://pgda.gsfc.nasa.gov/products/90' },
  { label: 'NASA: Artemis III landing regions (2024-10-28)', href: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/' },
  { label: 'USGS/IAU Gazetteer of Planetary Nomenclature', href: 'https://planetarynames.wr.usgs.gov/' },
]

export function About() {
  const { t, data } = useApp()
  return (
    <footer className="panel text-sm">
      <h2 className="panel-title">{t('aboutTitle')}</h2>
      <p className="leading-relaxed text-slate-300">{t('aboutBody')}</p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {SOURCES.map((s) => (
          <li key={s.href}>
            <a className="text-earth hover:underline" href={s.href} target="_blank" rel="noreferrer">
              {s.label} ↗
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 font-mono text-[11px] text-slate-500">
        {data.sites.length} sites · {data.times.length} h · {data.times[0]?.slice(0, 10)} → {data.times[data.times.length - 1]?.slice(0, 10)} · visible = el &gt; horizon[round(az) % 360]
      </p>
    </footer>
  )
}
