// Paleta de bajo contraste compartida por la interfaz y la escena 3D.
import type { NowInfo } from '../lib/visibility'
import { MISSION_H } from '../lib/visibility'

export const C = {
  sun: '#d8b36a',
  earth: '#7ea6d8',
  both: '#86c29c',
}

/** [h (0–360), s (0–100), l (0–100)] del sitio según su situación en la hora elegida */
export function nowHsl(n: NowInfo): [number, number, number] {
  if (n.both) {
    // verde más intenso cuanto más larga la ventana desde ahora
    const x = Math.min(1, n.windowH / MISSION_H)
    return [95 + 35 * x, 30 + 15 * x, 52 + 6 * x]
  }
  if (n.sun || n.earth) return [40, 40, 58] // solo uno de los dos
  return [8, 30, 56] // ninguno
}

export function nowColor(n: NowInfo): string {
  const [h, s, l] = nowHsl(n)
  return `hsl(${h} ${s}% ${l}%)`
}
