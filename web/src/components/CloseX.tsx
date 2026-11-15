// Small ✕ button used by every closable info panel.
import { useApp } from '../store'

export function CloseX({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const { t } = useApp()
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`shrink-0 rounded-full px-1.5 text-xs leading-5 text-slate-500 transition hover:bg-white/10 hover:text-slate-100 ${className}`}
      aria-label={t('close')}
      title={t('close')}
    >
      ✕
    </button>
  )
}
