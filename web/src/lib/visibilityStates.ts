import type { Flags } from './visibility'

export const VISIBILITY_STATES = [
  { id: 'both', label: 'stateBoth', color: '#86c29c' },
  { id: 'sunOnly', label: 'stateSunOnly', color: '#d8b36a' },
  { id: 'earthOnly', label: 'stateEarthOnly', color: '#7ea6d8' },
  { id: 'blackout', label: 'stateBlackout', color: '#374151' },
] as const

export type VisibilityState = typeof VISIBILITY_STATES[number]['id']

export function visibilityState(sun: boolean | number, earth: boolean | number): VisibilityState {
  return sun ? (earth ? 'both' : 'sunOnly') : earth ? 'earthOnly' : 'blackout'
}

/** Aggregate the same hourly flags used by the hourly chart; retain exact counts for stacking. */
export function monthlyStates(times: string[], flags: Flags) {
  const months = new Map<string, { month: string; total: number; counts: Record<VisibilityState, number> }>()
  times.forEach((time, i) => {
    const month = time.slice(0, 7)
    if (!months.has(month)) months.set(month, { month, total: 0, counts: { both: 0, sunOnly: 0, earthOnly: 0, blackout: 0 } })
    const bucket = months.get(month)!
    bucket.counts[visibilityState(flags.sun[i], flags.earth[i])]++
    bucket.total++
  })
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
}
