import type { TKey } from '../i18n'
import { useApp } from '../store'

/** Recuadro explicativo que solo aparece en modo Clase */
export function Explain({ k }: { k: TKey }) {
  const { mode, t } = useApp()
  if (mode !== 'class') return null
  return (
    <p className="mt-3 rounded-lg border border-sun/30 bg-sun/5 p-3 text-sm leading-relaxed text-amber-100/90">{t(k)}</p>
  )
}
