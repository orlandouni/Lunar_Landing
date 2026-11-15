import { useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SAFE_SLOPE, fmtCoord, fmtHours } from '../lib/visibility'
import { useApp } from '../store'
import type { Metrics, SiteGroup } from '../types'
import type { TKey } from '../i18n'
import { Explain } from './Explain'

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded bg-space-700">
        <div className="h-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="w-12 font-mono text-xs">{value}%</span>
    </div>
  )
}

type SortKey = 'now' | 'next7' | 'score' | 'slope' | keyof Pick<Metrics, 'sunPct' | 'earthPct' | 'bothPct' | 'longestDarkHours' | 'longestNoCommHours'>

export function Comparator() {
  const { data, yearMetrics, scores, weight, setWeight, site, setSiteId, bestSiteId, mode, t, now } = useApp()
  const [sort, setSort] = useState<SortKey>('now')
  const [groups, setGroups] = useState<SiteGroup[]>(['artemis', 'notable', 'custom'])
  const groupOf = (g?: SiteGroup) => g ?? 'artemis'
  const present = (['artemis', 'notable', 'custom'] as const).filter((g) => data.sites.some((s) => groupOf(s.group) === g))
  const GROUP_KEY: Record<SiteGroup, TKey> = { artemis: 'groupArtemisShort', notable: 'groupNotable', custom: 'groupCustom' }
  const bySlope = Object.fromEntries(data.sites.map((s) => [s.id, s.slopeDeg]))

  const val = (id: string, k: SortKey) =>
    k === 'now' ? now[id].score : k === 'next7' ? now[id].next7Pct : k === 'score' ? scores[id] : k === 'slope' ? (bySlope[id] ?? 99) : yearMetrics[id][k]
  // Para las rachas, menos es mejor
  const asc = sort === 'longestDarkHours' || sort === 'longestNoCommHours' || sort === 'slope'
  const rows = data.sites.filter((s) => groups.includes(groupOf(s.group))).sort((a, b) => (asc ? val(a.id, sort) - val(b.id, sort) : val(b.id, sort) - val(a.id, sort)))

  const groupLabel = (group?: SiteGroup) => t(GROUP_KEY[groupOf(group)])
  const csvCell = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`

  const exportCsvCurrent = () => {
    const delimiter = ';'
    const head = ['#', t('site'), 'group', 'coordinates', t('score'), t('sun'), t('earth'), t('both'), t('longestDark'), t('longestNoComm'), t('slope')]
    const lines = rows.map((s, i) => {
      const m = yearMetrics[s.id]
      return [
        i + 1,
        s.name,
        groupLabel(s.group),
        fmtCoord(s.lat, s.lon),
        scores[s.id],
        `${m.sunPct}%`,
        `${m.earthPct}%`,
        `${m.bothPct}%`,
        fmtHours(m.longestDarkHours),
        fmtHours(m.longestNoCommHours),
        s.slopeDeg != null ? `${s.slopeDeg.toFixed(1)}°` : '—',
      ].map(csvCell).join(delimiter)
    })
    const csv = [head.map(csvCell).join(delimiter), ...lines].join('\r\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kairos-comparacion-${data.source}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportCsv = () => {
    const head = ['rank', 'id', 'name', 'group', 'dataSource', 'lat', 'lon', 'score', 'sunPct', 'earthPct', 'bothPct', 'longestDarkHours', 'longestNoCommHours', 'slopeDeg']
    const lines = rows.map((s, i) => {
      const m = yearMetrics[s.id]
      return [i + 1, s.id, `"${s.name}"`, groupOf(s.group), s.dataSource ?? data.source, s.lat, s.lon, scores[s.id], m.sunPct, m.earthPct, m.bothPct, m.longestDarkHours, m.longestNoCommHours, s.slopeDeg ?? ''].join(',')
    })
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kairos-ranking-${data.source}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const chartRows = [...rows].sort((a, b) => scores[b.id] - scores[a.id]).slice(0, 8)
    const averageBoth = rows.length ? Math.round(rows.reduce((sum, s) => sum + yearMetrics[s.id].bothPct, 0) / rows.length) : 0
    const best = chartRows[0]
    doc.setProperties({ title: `${t('compareTitle')} ${t('year')}`, subject: 'Kairos site comparison report', author: 'Kairos' })
    doc.setFillColor(5, 7, 11)
    doc.rect(0, 0, 297, 210, 'F')
    doc.setTextColor(230, 236, 245)
    doc.setFontSize(18)
    doc.text(`${t('compareTitle')} · ${t('year')}`, 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(150, 164, 184)
    doc.text(`${t('weightTitle')}: ${Math.round(weight * 100)} / ${Math.round((1 - weight) * 100)} · ${rows.length} ${t('sites').toLowerCase()}`, 14, 23)
    doc.setFontSize(8)
    doc.text(`Emitido: ${new Date().toLocaleDateString()} · Fuente: ${data.source}`, 205, 23)

    doc.setFontSize(10)
    doc.setTextColor(190, 204, 224)
    doc.text('Resumen ejecutivo', 14, 35)
    const cards = [
      { label: 'Sitios evaluados', value: String(rows.length), color: [126, 166, 216] },
      { label: 'Mejor puntuación', value: best ? `${best.name} · ${scores[best.id]}` : '—', color: [216, 179, 106] },
      { label: 'Promedio Sol + Tierra', value: `${averageBoth}%`, color: [134, 194, 156] },
    ]
    cards.forEach((card, i) => {
      const x = 14 + i * 89
      doc.setFillColor(17, 24, 36)
      doc.roundedRect(x, 40, 83, 18, 2, 2, 'F')
      doc.setFillColor(card.color[0], card.color[1], card.color[2])
      doc.rect(x, 40, 2, 18, 'F')
      doc.setFontSize(7)
      doc.setTextColor(145, 160, 181)
      doc.text(card.label, x + 7, 46)
      doc.setFontSize(i === 1 ? 9 : 12)
      doc.setTextColor(235, 240, 248)
      doc.text(card.value, x + 7, 53)
    })

    doc.setFontSize(10)
    doc.setTextColor(190, 204, 224)
    doc.text('Comparativo de puntuación y disponibilidad conjunta', 14, 68)
    doc.setFontSize(7)
    doc.setTextColor(145, 160, 181)
    doc.setFillColor(216, 179, 106)
    doc.rect(205, 64, 4, 4, 'F')
    doc.text('Puntuación', 211, 68)
    doc.setFillColor(134, 194, 156)
    doc.rect(244, 64, 4, 4, 'F')
    doc.text('Sol + Tierra', 250, 68)
    chartRows.forEach((s, i) => {
      const y = 76 + i * 5
      const maxWidth = 156
      const scoreWidth = (scores[s.id] / 100) * maxWidth
      const bothWidth = (yearMetrics[s.id].bothPct / 100) * maxWidth
      doc.setTextColor(170, 184, 202)
      doc.text(s.name.slice(0, 24), 14, y + 2.5)
      doc.setFillColor(34, 46, 64)
      doc.roundedRect(70, y, maxWidth, 3.2, 1, 1, 'F')
      doc.setFillColor(216, 179, 106)
      doc.roundedRect(70, y, Math.max(scoreWidth, 1), 1.4, 0.5, 0.5, 'F')
      doc.setFillColor(134, 194, 156)
      doc.roundedRect(70, y + 1.8, Math.max(bothWidth, 1), 1.4, 0.5, 0.5, 'F')
      doc.setTextColor(198, 206, 219)
      doc.text(`${scores[s.id]} / ${yearMetrics[s.id].bothPct}%`, 231, y + 2.5)
    })

    autoTable(doc, {
      startY: 121,
      margin: { left: 10, right: 10 },
      head: [[t('site'), 'Group', t('colWindow'), t('score'), t('sun'), t('earth'), t('both'), t('longestDark'), t('longestNoComm'), t('slope')]],
      body: rows.map((s) => {
        const m = yearMetrics[s.id]
        return [
          s.name,
          groupLabel(s.group),
          now[s.id].both ? fmtHours(now[s.id].windowH) : now[s.id].nextBothInH > 0 ? `${t('inShort')} ${fmtHours(now[s.id].nextBothInH)}` : '—',
          scores[s.id],
          `${m.sunPct}%`,
          `${m.earthPct}%`,
          `${m.bothPct}%`,
          fmtHours(m.longestDarkHours),
          fmtHours(m.longestNoCommHours),
          s.slopeDeg != null ? `${s.slopeDeg.toFixed(1)}°` : '—',
        ]
      }),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.5, textColor: [198, 206, 219], fillColor: [16, 23, 34], lineColor: [45, 58, 77], lineWidth: 0.15 },
      headStyles: { fillColor: [48, 63, 84], textColor: [240, 244, 250], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [22, 31, 45] },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 30 },
        2: { cellWidth: 28 },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 28, halign: 'right' },
        8: { cellWidth: 31, halign: 'right' },
        9: { cellWidth: 20, halign: 'right' },
      },
      willDrawPage: ({ pageNumber }) => {
        if (pageNumber > 1) {
          doc.setFillColor(5, 7, 11)
          doc.rect(0, 0, 297, 210, 'F')
        }
      },
      didDrawPage: ({ pageNumber }) => {
        doc.setFontSize(8)
        doc.setTextColor(120, 136, 158)
        doc.text('KAIROS · JPL Horizons + LOLA', 14, 202)
        doc.text(`Página ${pageNumber}`, 270, 202)
      },
    })
    doc.save(`kairos-comparacion-${data.source}.pdf`)
  }

  const Th = ({ k, children }: { k: SortKey; children: string }) => (
    <th>
      <button className={`uppercase tracking-wider hover:text-slate-100 ${sort === k ? 'text-slate-100' : ''}`} onClick={() => setSort(k)}>
        {children}
        {sort === k ? (asc ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title !mb-0">
          {t('compareTitle')} · {t('year')}
        </h2>
        <div className="flex flex-wrap gap-2">
        <button className="btn text-xs" onClick={exportCsv}>
          ⤓ {t('exportCsv')}
        </button>
        <button className="btn text-xs" onClick={exportPdf}>
          ⤓ PDF
        </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-space-700 bg-space-800/40 px-3 py-2">
        <span className="text-xs text-slate-400">{t('weightTitle')}</span>
        <span className="font-mono text-xs text-earth">{t('comms')}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(weight * 100)}
          onChange={(e) => setWeight(+e.target.value / 100)}
          className="w-40"
          aria-label={t('weightTitle')}
        />
        <span className="font-mono text-xs text-sun">{t('power')}</span>
        <span className="font-mono text-xs text-slate-300">
          {Math.round(weight * 100)} / {Math.round((1 - weight) * 100)}
        </span>
        <span className="text-[11px] text-slate-500">{t('weightHint')}</span>
      </div>

      {present.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {present.map((g) => {
            const on = groups.includes(g)
            return (
              <button
                key={g}
                onClick={() => setGroups((v) => (on ? v.filter((x) => x !== g) : [...v, g]))}
                className={`rounded-full border px-3 py-1 transition ${on ? 'border-white/25 bg-white/10 text-slate-100' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}
              >
                {on ? '✓ ' : ''}
                {t(GROUP_KEY[g])}
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[1280px] whitespace-nowrap text-left text-sm [&_td]:px-3 [&_th]:px-3">
          <thead className="text-[11px] text-slate-500">
            <tr>
              <th className="py-2">#</th>
              <th className="uppercase tracking-wider">{t('site')}</th>
              <Th k="now">{t('colWindow')}</Th>
              <Th k="next7">{t('colNext7')}</Th>
              <Th k="score">{t('score')}</Th>
              <Th k="sunPct">{t('sun')}</Th>
              <Th k="earthPct">{t('earth')}</Th>
              <Th k="bothPct">{t('both')}</Th>
              <Th k="longestDarkHours">{t('longestDark')}</Th>
              <Th k="longestNoCommHours">{t('longestNoComm')}</Th>
              <Th k="slope">{t('slope')}</Th>
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
                  <td className="py-1.5 font-mono text-slate-500">{i + 1}</td>
                  <td className="text-slate-100">
                    {s.name}
                    {mode === 'mission' && s.id === bestSiteId && <span className="ml-2 text-both">★</span>}
                    {groupOf(s.group) !== 'artemis' && (
                      <span className="ml-2 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{t(groupOf(s.group) === 'notable' ? 'tagMission' : 'tagCustom')}</span>
                    )}
                    {s.dataSource && s.dataSource !== 'real' && data.source === 'real' && (
                      <span className="ml-1 text-[10px] text-sun/70" title={t('srcEstimatedHint')}>
                        {t('srcShort')}
                      </span>
                    )}
                    <div className="font-mono text-[10px] text-slate-500">{fmtCoord(s.lat, s.lon)}</div>
                  </td>
                  <td className="pr-4 font-mono text-xs">
                    <span className="mr-1.5 inline-flex gap-0.5 align-middle">
                      <span className={`h-1.5 w-1.5 rounded-full ${now[s.id].sun ? 'bg-sun' : 'bg-slate-600'}`} />
                      <span className={`h-1.5 w-1.5 rounded-full ${now[s.id].earth ? 'bg-earth' : 'bg-slate-600'}`} />
                    </span>
                    {now[s.id].both ? fmtHours(now[s.id].windowH) : now[s.id].nextBothInH > 0 ? `${t('inShort')} ${fmtHours(now[s.id].nextBothInH)}` : '—'}
                  </td>
                  <td className="font-mono text-xs">{now[s.id].next7Pct}%</td>
                  <td className="font-mono text-slate-100">{scores[s.id]}</td>
                  <td><Bar value={m.sunPct} color="#d8b36a" /></td>
                  <td><Bar value={m.earthPct} color="#7ea6d8" /></td>
                  <td><Bar value={m.bothPct} color="#86c29c" /></td>
                  <td className="font-mono">{fmtHours(m.longestDarkHours)}</td>
                  <td className="font-mono">{fmtHours(m.longestNoCommHours)}</td>
                  <td className={`font-mono ${s.slopeDeg != null && s.slopeDeg > SAFE_SLOPE ? 'text-sun' : ''}`}>
                    {s.slopeDeg != null ? `${s.slopeDeg.toFixed(1)}°` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Explain k="explainCompare" />
    </section>
  )
}
