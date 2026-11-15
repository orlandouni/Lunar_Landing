import type { TKey } from '../i18n'
import { useApp } from '../store'
import { CloseX } from './CloseX'

/** Explanation box shown only in Guide mode; each one can be closed */
export function Explain({ k }: { k: TKey }) {
  const { mode, t, dismissed, dismiss } = useApp()
  if (mode !== 'class' || dismissed.has(k)) return null
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-sun/30 bg-sun/5 p-3 text-sm leading-relaxed text-amber-100/90">
      <p className="flex-1">{t(k)}</p>
      <CloseX onClick={() => dismiss(k)} />
    </div>
  )
}
