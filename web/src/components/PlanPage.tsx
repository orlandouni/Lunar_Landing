// "Plan trip" tab: arrival and departure on the Moon → where to land and the best time to lift off.
// Every site is scored on the whole stay: Sun + Earth at landing, during the stay and at liftoff.
import { useMemo } from 'react'
import { bestLaunches, planStay, type PlanRow } from '../lib/plan'
import { fmtHours } from '../lib/visibility'
import { useApp } from '../store'
import type { Flags } from '../lib/visibility'
import { C } from './colors'
import { Explain } from './Explain'
import { Sheet } from './Sheet'

const H = 3600e3
const RANGE_D = 15 // search for better departures within ±15 days

function Dots({ sun, earth }: { sun: boolean; earth: boolean }) {
  return (
    <span className="inline-flex gap-0.5 align-middle">
      <span className={`h-2 w-2 rounded-full ${sun ? 'bg-sun' : 'bg-slate-600'}`} />
      <span className={`h-2 w-2 rounded-full ${earth ? 'bg-earth' : 'bg-slate-600'}`} />
    </span>
  )
}

/** Hour-by-hour strip of the stay: green = Sun + Earth, amber = Sun only, blue = Earth only, dark = neither */
function StayStrip({ f, land, leave, mark }: { f: Flags; land: number; leave: number; mark?: number }) {
  const n = leave - land + 1
  return (
    <svg viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" className="h-3 w-full rounded-sm">
      <rect width={n} height={1} fill="#0b1220" />
      {Array.from({ length: n }, (_, k) => {
        const s = f.sun[land + k]
        const e = f.earth[land + k]
        if (!s && !e) return null
        return <rect key={k} x={k} width={1.05} height={1} fill={s && e ? C.both : s ? C.sun : C.earth} opacity={s && e ? 0.9 : 0.55} />
      })}
      {mark != null && mark >= land && <rect x={mark - land} width={Math.max(0.6, n / 160)} height={1} fill="#fff" />}
    </svg>
  )
}

export function PlanPage() {
  const { t, lang, data, flags, prefix, plan, setPlan, isCandidate, setTimeIndex, setPlaying, selectSite, setTab } = useApp()
  const times = data.times
  const n = times.length
  const t0 = Date.parse(times[0])
  const idxOf = (iso: string) => Math.min(n - 1, Math.max(0, Math.round((Date.parse(iso) - t0) / H)))
  const land = idxOf(plan.arrive)
  const leave = idxOf(plan.leave)
  const stayH = leave - land
  const fits = stayH > 0

  const fmt = (ms: number) =>
    new Date(ms).toLocaleString(lang === 'es' ? 'es-MX' : 'en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  const at = (k: number) => fmt(t0 + k * H)
  const iso = (k: number) => new Date(t0 + k * H).toISOString().replace('.000', '')

  const ids = useMemo(() => data.sites.filter((s) => plan.scope === 'all' || isCandidate(s.id)).map((s) => s.id), [data.sites, plan.scope, isCandidate])
  const byId = Object.fromEntries(data.sites.map((s) => [s.id, s]))
  const rows = useMemo(() => (fits ? planStay(flags, prefix, ids, land, leave) : []), [fits, flags, prefix, ids, land, leave])
  // Same stay shifted up to ±15 days (arrival and departure move together)
  const options = useMemo(() => (fits ? bestLaunches(flags, prefix, ids, land, 0, stayH, RANGE_D * 24, n) : []), [fits, flags, prefix, ids, land, stayH, n])
  const best = rows[0]

  const show = (id: string, k: number) => {
    setPlaying(false)
    setTimeIndex(k)
    selectSite(id)
    setTab('explore')
  }
  const leaveText = (r: PlanRow) =>
    r.bestLeave < 0 ? t('noLiftoffWindow') : r.bestLeave === leave ? t('leaveAsPlanned') : `${at(r.bestLeave)} · ${fmtHours(leave - r.bestLeave)} ${t('early')}`

  const dateInput = (label: string, k: number, onPick: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-[11px] text-slate-500">
      {label}
      <input
        type="datetime-local"
        step={3600}
        min={times[0].slice(0, 16)}
        max={times[n - 1].slice(0, 16)}
        value={iso(k).slice(0, 16)}
        onChange={(e) => e.target.value && onPick(`${e.target.value.slice(0, 13)}:00:00Z`)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-sm text-slate-100 outline-none [color-scheme:dark] focus:border-white/25"
      />
    </label>
  )

  return (
    <Sheet>
      {/* Inputs: arrival and departure only */}
      <section className="panel">
        <h2 className="panel-title">{t('planTitle')}</h2>
        <p className="mb-4 max-w-3xl text-sm text-slate-400">{t('planIntro')}</p>
        <div className="flex flex-wrap items-end gap-4">
          {dateInput(t('arriveLabel'), land, (v) => setPlan({ arrive: v }))}
          {dateInput(t('leaveLabel'), leave, (v) => setPlan({ leave: v }))}
          {fits && (
            <div className="pb-2 font-mono text-sm text-slate-400">
              {t('stayLength')}: <span className="text-slate-100">{fmtHours(stayH)}</span>
            </div>
          )}
          <div className="ml-auto flex rounded-full bg-white/5 p-0.5 text-xs">
            {(['artemis', 'all'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPlan({ scope: s })}
                className={`rounded-full px-3 py-1 transition ${plan.scope === s ? 'bg-white/10 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {s === 'artemis' ? t('scopeArtemis') : t('scopeAll')}
              </button>
            ))}
          </div>
        </div>
        {!fits && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-200">{t('leaveBeforeArrive')}</p>}
        <Explain k="explainPlan" />
      </section>

      {fits && best && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Recommendation */}
          <section className="panel">
            <h2 className="panel-title">{t('planBest')}</h2>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-2xl font-light text-slate-100">
                <span className="text-both">★</span> {byId[best.id].name}
              </div>
              <div className="font-mono text-3xl font-light text-both">
                {best.stayPct}
                <span className="text-lg">%</span>
              </div>
            </div>
            <div className="mb-3 text-right text-[11px] text-slate-500">{t('stayCoverage')}</div>
            <StayStrip f={flags[best.id]} land={land} leave={leave} mark={best.bestLeave} />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
              <span>{at(land)}</span>
              <span>{at(leave)}</span>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">{t('atLanding')}</dt>
                <dd className="flex items-center gap-2 font-mono text-slate-200">
                  <Dots sun={best.landSun} earth={best.landEarth} /> {best.landOk ? t('bothOk') : t('notBoth')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">{t('atLiftoff')}</dt>
                <dd className="flex items-center gap-2 font-mono text-slate-200">
                  <Dots sun={!!flags[best.id].sun[leave]} earth={!!flags[best.id].earth[leave]} /> {best.leaveOk ? t('bothOk') : t('notBoth')}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">{t('bestLiftoff')}</dt>
                <dd className="text-right font-mono text-slate-200">{leaveText(best)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">{t('longestDarkStay')}</dt>
                <dd className="font-mono text-slate-200">{best.darkH ? fmtHours(best.darkH) : '—'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400">{t('longestNoCommStay')}</dt>
                <dd className="font-mono text-slate-200">{best.noCommH ? fmtHours(best.noCommH) : '—'}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-xl bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/20" onClick={() => show(best.id, land)}>
                {t('showLanding')} →
              </button>
              {best.bestLeave >= 0 && (
                <button className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10" onClick={() => show(best.id, best.bestLeave)}>
                  {t('showLiftoff')} →
                </button>
              )}
            </div>
          </section>

          {/* Better departure dates */}
          <section className="panel">
            <h2 className="panel-title">{t('betterDates')}</h2>
            <p className="mb-3 text-xs text-slate-500">{t('betterDatesHint')}</p>
            <ul className="space-y-1.5">
              {options.map((o) => {
                const d = o.launch - land
                const same = d === 0
                const pct = Math.round((1000 * (prefix[o.id][o.launch + stayH + 1] - prefix[o.id][o.launch])) / (stayH + 1)) / 10
                return (
                  <li key={o.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-100">{byId[o.id].name}</span>
                    <span className="font-mono text-xs text-slate-400">
                      {at(o.launch)} → {at(o.launch + stayH)}
                      <span className={`ml-1 ${same ? 'text-slate-500' : 'text-sun/80'}`}>{same ? `(${t('asPlanned')})` : `(${d > 0 ? '+' : '−'}${fmtHours(Math.abs(d))})`}</span>
                    </span>
                    <span className="w-12 text-right font-mono text-xs text-both">{pct}%</span>
                    <button
                      className="rounded-full bg-white/10 px-3 py-0.5 text-xs text-slate-100 hover:bg-white/20 disabled:opacity-30"
                      disabled={same}
                      onClick={() => setPlan({ arrive: iso(o.launch), leave: iso(o.launch + stayH) })}
                    >
                      {t('useDate')}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {fits && rows.length > 0 && (
        <section className="panel">
          <h2 className="panel-title">{t('planRanking')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] whitespace-nowrap text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-1">#</th>
                  <th>{t('site')}</th>
                  <th>{t('colLanding')}</th>
                  <th className="w-[34%]">{t('colStay')}</th>
                  <th>{t('colLiftoff')}</th>
                  <th>{t('colBestLiftoff')}</th>
                  <th>{t('longestDarkStay')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="cursor-pointer border-t border-white/5 hover:bg-white/[0.04]" onClick={() => show(r.id, land)} title={t('showLanding')}>
                    <td className="py-2 font-mono text-slate-500">{i + 1}</td>
                    <td className="pr-4 text-slate-100">
                      {byId[r.id].name}
                      {i === 0 && <span className="ml-1.5 text-both">★</span>}
                    </td>
                    <td>
                      <Dots sun={r.landSun} earth={r.landEarth} />
                    </td>
                    <td className="pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <StayStrip f={flags[r.id]} land={land} leave={leave} />
                        </div>
                        <span className="w-12 text-right font-mono text-xs text-slate-300">{r.stayPct}%</span>
                      </div>
                    </td>
                    <td>
                      <Dots sun={!!flags[r.id].sun[leave]} earth={!!flags[r.id].earth[leave]} />
                    </td>
                    <td className="pr-4 font-mono text-xs text-slate-300">{leaveText(r)}</td>
                    <td className="font-mono text-xs text-slate-300">{r.darkH ? fmtHours(r.darkH) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">{t('planLegend')}</p>
        </section>
      )}
    </Sheet>
  )
}
