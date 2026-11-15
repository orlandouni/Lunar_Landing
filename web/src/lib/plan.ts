// Trip planner. The user always gives the Earth departure (launch) time; with the trip length and the
// planned surface stay that fixes the landing and the lunar liftoff. Each site is scored on the WHOLE stay:
// Sun + Earth at landing, during the stay and at liftoff. Same visibility rule as the rest of the app.
import type { Flags } from './visibility'

export interface PlanRow {
  id: string
  landOk: boolean // Sun + Earth at landing
  leaveOk: boolean // Sun + Earth at the planned liftoff
  landSun: boolean
  landEarth: boolean
  stayPct: number // % of the stay with Sun + Earth
  sunPct: number // % of the stay with Sun
  darkH: number // longest stretch without Sun during the stay
  noCommH: number // longest stretch without Earth during the stay
  bestLeave: number // best liftoff hour: the last hour ≤ planned liftoff with Sun + Earth (-1 = none)
  score: number
}

export const LAND_BONUS = 20
export const LEAVE_BONUS = 20

const both = (f: Flags, k: number) => f.sun[k] === 1 && f.earth[k] === 1

/** prefix[i] = hours with Sun + Earth in [0, i) — makes "% of any stay" O(1) */
export function bothPrefix(f: Flags): Uint32Array {
  const n = f.sun.length
  const p = new Uint32Array(n + 1)
  for (let i = 0; i < n; i++) p[i + 1] = p[i] + (both(f, i) ? 1 : 0)
  return p
}

/** Score of a stay [land, leave]: % with Sun + Earth, plus a bonus for each critical moment covered */
export function stayScore(f: Flags, p: Uint32Array, land: number, leave: number): number {
  const pct = (100 * (p[leave + 1] - p[land])) / (leave - land + 1)
  return pct + (both(f, land) ? LAND_BONUS : 0) + (both(f, leave) ? LEAVE_BONUS : 0)
}

function longestRun(arr: Uint8Array, a: number, b: number, value: number) {
  let best = 0
  let cur = 0
  for (let k = a; k <= b; k++) {
    cur = arr[k] === value ? cur + 1 : 0
    if (cur > best) best = cur
  }
  return best
}

export function planStay(flags: Record<string, Flags>, prefix: Record<string, Uint32Array>, ids: string[], land: number, leave: number): PlanRow[] {
  return ids
    .map((id): PlanRow => {
      const f = flags[id]
      let sun = 0
      for (let k = land; k <= leave; k++) sun += f.sun[k]
      let bestLeave = -1
      for (let k = leave; k >= land; k--)
        if (both(f, k)) {
          bestLeave = k
          break
        }
      const h = leave - land + 1
      return {
        id,
        landOk: both(f, land),
        leaveOk: both(f, leave),
        landSun: f.sun[land] === 1,
        landEarth: f.earth[land] === 1,
        stayPct: Math.round((1000 * (prefix[id][leave + 1] - prefix[id][land])) / h) / 10,
        sunPct: Math.round((1000 * sun) / h) / 10,
        darkH: longestRun(f.sun, land, leave, 0),
        noCommH: longestRun(f.earth, land, leave, 0),
        bestLeave,
        score: stayScore(f, prefix[id], land, leave),
      }
    })
    .sort((a, b) => b.score - a.score)
}

export interface Option {
  id: string
  launch: number // Earth departure hour
  score: number
}

/**
 * Better departure dates nearby: shift the launch up to ±rangeH hours (same trip length and stay) and keep,
 * for each site, the launch with the best stay score (ties go to the closest to the request). Best `k` sites.
 */
export function bestLaunches(
  flags: Record<string, Flags>,
  prefix: Record<string, Uint32Array>,
  ids: string[],
  launch: number,
  transitH: number,
  stayH: number,
  rangeH: number,
  n: number,
  k = 5,
): Option[] {
  const lo = Math.max(0, launch - rangeH)
  const hi = Math.min(launch + rangeH, n - 1 - transitH - stayH)
  const out: Option[] = []
  for (const id of ids) {
    let best: Option | null = null
    for (let L = lo; L <= hi; L++) {
      const s = stayScore(flags[id], prefix[id], L + transitH, L + transitH + stayH)
      if (!best || s > best.score + 1e-9 || (Math.abs(s - best.score) < 1e-9 && Math.abs(L - launch) < Math.abs(best.launch - launch)))
        best = { id, launch: L, score: s }
    }
    if (best) out.push(best)
  }
  return out.sort((a, b) => b.score - a.score || Math.abs(a.launch - launch) - Math.abs(b.launch - launch)).slice(0, k)
}
