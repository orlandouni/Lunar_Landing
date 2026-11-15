import { VISIBILITY_STATES } from '../lib/visibilityStates'
import { useApp } from '../store'

export function VisibilityLegend() {
  const { t } = useApp()
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
      {VISIBILITY_STATES.map((state) => (
        <li key={state.id} className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm border border-white/10" style={{ background: state.color }} />
          {t(state.label)}
        </li>
      ))}
    </ul>
  )
}
