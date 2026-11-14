import { useApp } from '../store'
import type { Mode } from '../types'

export function Header() {
  const { t, mode, setMode, lang, setLang, data } = useApp()
  const modes: { id: Mode; label: string }[] = [
    { id: 'mission', label: t('modeMission') },
    { id: 'class', label: t('modeClass') },
    { id: 'explore', label: t('modeExplore') },
  ]
  const hint = mode === 'mission' ? t('modeHintMission') : mode === 'class' ? t('modeHintClass') : t('modeHintExplore')

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-space-700 pb-3">
      <div>
        <h1 className="font-mono text-xl font-semibold tracking-widest text-white">
          {t('appTitle').toUpperCase()}
          <span
            className={`ml-3 rounded px-2 py-0.5 align-middle text-[10px] tracking-wider ${
              data.source === 'mock' ? 'bg-sun/20 text-sun' : 'bg-both/20 text-both'
            }`}
          >
            {data.source === 'mock' ? t('mockBadge') : t('realBadge')}
          </span>
        </h1>
        <p className="text-sm text-slate-400">{t('appSubtitle')}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        {modes.map((m) => (
          <button key={m.id} className={`btn ${mode === m.id ? 'btn-on' : ''}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
        <button className="btn ml-2 font-mono" onClick={() => setLang(lang === 'es' ? 'en' : 'es')}>
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
      </div>
    </header>
  )
}
