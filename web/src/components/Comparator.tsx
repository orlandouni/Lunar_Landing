import { useApp } from '../store'

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded bg-space-700">
        <div className="h-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="w-12 font-mono text-xs">{value}%</span>
    </div>
  )
}

export function Comparator() {
  const { data, yearMetrics, site, setSiteId, compareIds, toggleCompare, bestSiteId, mode, t } = useApp()
  const rows = [...data.sites].sort((a, b) => yearMetrics[b.id].bothPct - yearMetrics[a.id].bothPct)

  return (
    <section className="panel overflow-x-auto">
      <h2 className="panel-title">
        {t('compareTitle')} · {t('year')}
      </h2>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="w-8" />
            <th className="py-1">#</th>
            <th>{t('site')}</th>
            <th>{t('sun')}</th>
            <th>{t('earth')}</th>
            <th>{t('both')}</th>
            <th>{t('longestDark')}</th>
            <th>{t('longestNoComm')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const m = yearMetrics[s.id]
            return (
              <tr
                key={s.id}
                className={`cursor-pointer border-t border-space-800 hover:bg-space-800/60 ${s.id === site.id ? 'bg-space-800' : ''}`}
                onClick={() => setSiteId(s.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={compareIds.includes(s.id)} onChange={() => toggleCompare(s.id)} title={t('compareHint')} />
                </td>
                <td className="py-1.5 font-mono text-slate-500">{i + 1}</td>
                <td className="text-white">
                  {s.name}
                  {mode === 'mission' && s.id === bestSiteId && <span className="ml-2 text-both">★</span>}
                </td>
                <td><Bar value={m.sunPct} color="#f5b642" /></td>
                <td><Bar value={m.earthPct} color="#4ea8ff" /></td>
                <td><Bar value={m.bothPct} color="#4ade80" /></td>
                <td className="font-mono">{m.longestDarkHours} h</td>
                <td className="font-mono">{m.longestNoCommHours} h</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">{t('compareHint')}</p>
    </section>
  )
}
