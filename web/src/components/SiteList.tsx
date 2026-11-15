// Lista flotante de sitios, agrupada: regiones Artemis III, misiones notables y coordenadas propias.
// "Ahora" ordena según la fecha y hora elegidas; "Año" según todo 2028.
import { useEffect, useState, type FormEvent } from 'react'
import { SiteCard } from './SiteCard'
import { BestNow } from './BestNow'
import type { TKey } from '../i18n'
import { fmtHours, MISSION_H, scoreColor } from '../lib/visibility'
import { CloseX } from './CloseX'
import { useApp } from '../store'
import type { SiteGroup } from '../types'
import { nowColor } from './colors'

function Dots({ sun, earth }: { sun: boolean; earth: boolean }) {
  return (
    <span className="flex gap-0.5">
      <span className={`h-1.5 w-1.5 rounded-full ${sun ? 'bg-sun' : 'bg-slate-600'}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${earth ? 'bg-earth' : 'bg-slate-600'}`} />
    </span>
  )
}

const GROUPS: { id: SiteGroup; key: TKey }[] = [
  { id: 'artemis', key: 'groupArtemis' },
  { id: 'notable', key: 'groupNotable' },
  { id: 'custom', key: 'groupCustom' },
]

/** Formulario para agregar una coordenada (lat/lon en grados decimales) */
function AddCoord({ onDone }: { onDone: () => void }) {
  const { t, addCustomSite, selectSite } = useApp()
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const la = Number(lat.replace(',', '.'))
    const lo = Number(lon.replace(',', '.'))
    if (lat.trim() === '' || !Number.isFinite(la) || la < -90 || la > 90) return setErr(t('invalidLat'))
    if (lon.trim() === '' || !Number.isFinite(lo) || lo < -180 || lo > 360) return setErr(t('invalidLon'))
    const id = addCustomSite(la, lo, name)
    selectSite(id)
    onDone()
  }
  const input = 'w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-white/25'
  return (
    <form onSubmit={submit} className="space-y-1.5 px-3 pb-3 pt-1">
      <div className="grid grid-cols-2 gap-1.5">
        <label className="text-[10px] text-slate-500">
          {t('latLabel')}
          <input className={input} inputMode="decimal" placeholder="-85.50" value={lat} onChange={(e) => setLat(e.target.value)} autoFocus />
        </label>
        <label className="text-[10px] text-slate-500">
          {t('lonLabel')}
          <input className={input} inputMode="decimal" placeholder="20.00" value={lon} onChange={(e) => setLon(e.target.value)} />
        </label>
      </div>
      <input className={input} placeholder={t('nameOptional')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      <div className="text-[10px] leading-snug text-slate-500">{err ? <span className="text-red-300">{err}</span> : t('coordHint')}</div>
      <div className="flex justify-end gap-1.5">
        <button type="button" className="rounded-full px-3 py-1 text-xs text-slate-400 hover:text-slate-100" onClick={onDone}>
          {t('cancel')}
        </button>
        <button type="submit" className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100 hover:bg-white/20">
          {t('addSite')}
        </button>
      </div>
    </form>
  )
}

export function SiteList({ hover, setHover }: { hover: string | null; setHover: (id: string | null) => void }) {
  const { t, data, site, focus, selectSite, yearMetrics, scores, now, nowRanking, rankBy, setRankBy, removeCustomSite, dismissed, dismiss } = useApp()
  const [open, setOpen] = useState(true)
  const [layer, setLayer] = useState<'sites' | 'details'>(focus ? 'details' : 'sites')
  useEffect(() => {
    setLayer(focus ? 'details' : 'sites')
    if (focus) setOpen(true)
  }, [site.id, focus])
  const [adding, setAdding] = useState(false)
  const best = nowRanking[0]

  const right = (id: string) => {
    if (rankBy === 'year') return `${yearMetrics[id].bothPct}%`
    const n = now[id]
    if (n.both) return n.windowH >= MISSION_H ? `${fmtHours(MISSION_H)}+` : fmtHours(n.windowH)
    if (n.nextBothInH > 0) return `${t('inShort')} ${fmtHours(n.nextBothInH)}`
    return '—'
  }
  const sorted = (g: SiteGroup) =>
    data.sites
      .filter((s) => (s.group ?? 'artemis') === g)
      .sort((a, b) => (rankBy === 'now' ? now[b.id].score - now[a.id].score : scores[b.id] - scores[a.id]))

  return (
    <div className="glass pointer-events-auto absolute left-4 top-20 z-20 flex max-h-[calc(100dvh-16rem)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-1" role="group" aria-label={t('exploreLayers')}>
          {(['sites', 'details'] as const).map((id) => (
            <button key={id} disabled={id === 'details' && !focus} aria-pressed={layer === id}
              onClick={() => { setLayer(id); setOpen(true) }}
              className={`rounded-lg px-2 py-1 text-[11px] uppercase tracking-wider transition disabled:opacity-30 ${layer === id ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:text-slate-100'}`}>
              {t(id === 'sites' ? 'sites' : 'siteSummary')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <div className={`${layer === 'sites' ? 'flex' : 'hidden'} rounded-full bg-white/5 p-0.5 text-[11px]`}>
            {(['now', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRankBy(r)}
                className={`rounded-full px-2 py-0.5 transition ${rankBy === r ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {r === 'now' ? t('rankNow') : t('rankYear')}
              </button>
            ))}
          </div>
          <button className="w-7 text-slate-500 hover:text-slate-200" onClick={() => setOpen(!open)} aria-label={t(open ? 'collapsePanel' : 'expandPanel')} aria-expanded={open}>
            {open ? '−' : '+'}
          </button>
        </div>
      </div>
      {open && layer === 'details' && <SiteCard />}
      {open && layer === 'sites' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
          <BestNow />
          {GROUPS.map(({ id: g, key }) => {
            const list = sorted(g)
            if (!list.length) return null
            return (
              <section key={g} className="mb-1">
                <div className="px-2 pb-0.5 pt-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">{t(key)}</div>
                <ul>
                  {list.map((s) => {
                    const sel = focus && s.id === site.id
                    const color = rankBy === 'now' ? nowColor(now[s.id]) : scoreColor(yearMetrics[s.id].bothPct)
                    const star = g === 'artemis' && (rankBy === 'now' ? s.id === best && now[s.id].both : s.id === list[0].id)
                    return (
                      <li key={s.id} className="group relative">
                        <button
                          onClick={() => { selectSite(s.id); setLayer('details') }}
                          onMouseEnter={() => setHover(s.id)}
                          onMouseLeave={() => setHover(null)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition ${g === 'custom' ? 'pr-7' : ''} ${
                            sel ? 'bg-white/10 text-slate-100' : hover === s.id ? 'bg-white/5 text-slate-100' : 'text-slate-300 hover:text-slate-100'
                          }`}
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                          <span className="min-w-0 flex-1 truncate">
                            {s.name}
                            {star && <span className="ml-1 text-both">★</span>}
                            {s.note && <span className="ml-1.5 text-[10px] text-slate-500">{s.note.split(' · ').pop()}</span>}
                            {s.dataSource && s.dataSource !== 'real' && data.source === 'real' && (
                              <span className="ml-1.5 text-[10px] text-sun/70" title={t('srcEstimatedHint')}>
                                {t('srcShort')}
                              </span>
                            )}
                          </span>
                          {rankBy === 'now' && <Dots sun={now[s.id].sun} earth={now[s.id].earth} />}
                          <span className={`whitespace-nowrap text-right font-mono text-[11px] text-slate-500 w-[4.5rem]`}>{right(s.id)}</span>
                        </button>
                        {g === 'custom' && (
                          <button
                            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-xs text-slate-500 hover:bg-white/10 hover:text-slate-100"
                            onClick={() => removeCustomSite(s.id)}
                            title={t('removeSite')}
                            aria-label={t('removeSite')}
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
      {open && layer === 'sites' && (
        <div className="border-t border-white/5">
          {adding ? (
            <AddCoord onDone={() => setAdding(false)} />
          ) : (
            <button className="w-full px-3 py-2 text-left text-xs text-slate-400 transition hover:text-slate-100" onClick={() => setAdding(true)}>
              + {t('addCoord')}
            </button>
          )}
          {!dismissed.has('listLegend') && (
            <div className="flex items-start gap-1 px-3 pb-2 text-[10px] leading-snug text-slate-500">
              <span className="flex-1">{rankBy === 'now' ? t('legendNow') : t('legendBoth')}</span>
              <CloseX onClick={() => dismiss('listLegend')} className="-mr-1.5 -mt-0.5" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
