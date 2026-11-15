// Floating top bar: brand, tabs (Explore / Metrics / Compare / Plan trip), guide and language.
import type { TKey } from '../i18n'
import { useApp } from '../store'
import type { Tab } from '../types'

const TABS: { id: Tab; key: TKey }[] = [
  { id: 'explore', key: 'tabExplore' },
  { id: 'metrics', key: 'tabMetrics' },
  { id: 'compare', key: 'tabCompare' },
  { id: 'plan', key: 'tabPlan' },
]

export function TopBar() {
  const { t, tab, setTab, mode, setMode, lang, setLang, data } = useApp()
  const flat = data.sites.every((s) => s.horizonSource === 'flat')
  const badge = data.source === 'mock' ? t('mockBadge') : flat ? t('realFlatBadge') : t('realBadge')

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex min-w-0 items-start justify-between gap-2 px-3 py-4 sm:gap-3 sm:px-6">
      <div className="pointer-events-auto hidden shrink-0 lg:block">
        <div className="text-sm font-semibold tracking-[0.35em] text-slate-100">{t('appTitle').toUpperCase()}</div>
        <div className="mt-0.5 text-[11px] text-slate-100/45">
          {badge}
        </div>
      </div>

      <nav className="glass pointer-events-auto flex min-w-0 overflow-x-auto p-1" aria-label="tabs">
        {TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            aria-current={tab === x.id ? 'page' : undefined}
            className={`shrink-0 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs transition sm:px-4 sm:text-sm ${tab === x.id ? 'bg-white/10 text-slate-100' : 'text-slate-100/55 hover:text-slate-100'}`}
          >
            {t(x.key)}
          </button>
        ))}
      </nav>

      <div className="pointer-events-auto flex shrink-0 gap-2">
        <button
          className={`glass h-9 px-3 text-xs transition ${mode === 'class' ? 'text-sun' : 'text-slate-100/60 hover:text-slate-100'}`}
          onClick={() => setMode(mode === 'class' ? 'mission' : 'class')}
          title={t('guideHint')}
          aria-label={t('guide')}
        >
          ? <span className="hidden sm:inline">{t('guide')}</span>
        </button>
        <button className="glass h-9 w-11 text-xs text-slate-100/70 hover:text-slate-100" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
      </div>
    </div>
  )
}
