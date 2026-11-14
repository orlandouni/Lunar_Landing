// Barra superior flotante: marca, pestañas (Explorar / Métricas / Comparar), guía e idioma.
import type { TKey } from '../i18n'
import { useApp } from '../store'
import type { Tab } from '../types'

const TABS: { id: Tab; key: TKey }[] = [
  { id: 'explore', key: 'tabExplore' },
  { id: 'metrics', key: 'tabMetrics' },
  { id: 'compare', key: 'tabCompare' },
]

export function TopBar() {
  const { t, tab, setTab, mode, setMode, lang, setLang, data } = useApp()
  const flat = data.sites.every((s) => s.horizonSource === 'flat')
  const ok = data.source === 'real' && !flat
  const badge = data.source === 'mock' ? t('mockBadge') : flat ? t('realFlatBadge') : t('realBadge')

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-4">
      <div className="pointer-events-auto">
        <div className="font-mono text-sm font-semibold tracking-[0.35em] text-slate-100">{t('appTitle').toUpperCase()}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-100/45">
          <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-both' : 'bg-sun'}`} />
          {badge}
        </div>
      </div>

      <nav className="glass pointer-events-auto flex p-1" aria-label="tabs">
        {TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${tab === x.id ? 'bg-white/10 text-slate-100' : 'text-slate-100/55 hover:text-slate-100'}`}
          >
            {t(x.key)}
          </button>
        ))}
      </nav>

      <div className="pointer-events-auto flex gap-2">
        <button
          className={`glass h-9 px-3 text-xs transition ${mode === 'class' ? 'text-sun' : 'text-slate-100/60 hover:text-slate-100'}`}
          onClick={() => setMode(mode === 'class' ? 'mission' : 'class')}
          title={t('guideHint')}
        >
          ? {t('guide')}
        </button>
        <button className="glass h-9 w-11 font-mono text-xs text-slate-100/70 hover:text-slate-100" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
      </div>
    </div>
  )
}
