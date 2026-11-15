// Etiqueta discreta del origen de los datos de un sitio (real / estimado / simulado y tipo de horizonte).
import { useApp } from '../store'
import type { Site } from '../types'

export function DataBadge({ site }: { site: Site }) {
  const { t, data } = useApp()
  const src = site.dataSource ?? (data.source === 'real' ? 'real' : 'mock')
  const ref = site.refSiteId ? data.sites.find((s) => s.id === site.refSiteId)?.name : undefined
  const label = src === 'real' ? t('srcReal') : src === 'estimated' ? t('srcEstimated') : t('srcMock')
  const tip = src === 'real' ? t('srcRealHint') : src === 'estimated' ? `${t('srcEstimatedHint')}${ref ? ` (${ref})` : ''}` : t('srcMockHint')
  const hz = site.horizonSource === 'flat' ? t('hzFlat') : site.horizonSource?.includes('parcial') ? t('hzPartial') : null
  return (
    <div className="mt-1 flex flex-wrap gap-1 text-[10px]" title={tip}>
      <span className={`rounded-full px-2 py-0.5 ${src === 'real' ? 'bg-both/10 text-both/80' : 'bg-sun/10 text-sun/80'}`}>{label}</span>
      {hz && (
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-slate-100/50" title={t('hzHint')}>
          {hz}
        </span>
      )}
    </div>
  )
}
