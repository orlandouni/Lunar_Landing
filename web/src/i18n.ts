import type { Lang } from './types'

const dict = {
  appTitle: { es: 'Horizonte Sur', en: 'Southern Horizon' },
  appSubtitle: { es: 'Navegador de sitios de alunizaje · Polo sur lunar 2028', en: 'Lunar landing site navigator · Lunar south pole 2028' },
  loading: { es: 'Cargando efemérides…', en: 'Loading ephemerides…' },
  mockBadge: { es: 'DATOS SIMULADOS', en: 'SIMULATED DATA' },
  realBadge: { es: 'JPL Horizons + LOLA', en: 'JPL Horizons + LOLA' },
  modeMission: { es: 'Misión', en: 'Mission' },
  modeClass: { es: 'Clase', en: 'Class' },
  modeExplore: { es: 'Explorar', en: 'Explore' },
  mapTitle: { es: 'Mapa polar · 9 regiones Artemis', en: 'Polar map · 9 Artemis regions' },
  horizonTitle: { es: 'Horizonte 360°', en: '360° horizon' },
  metricsTitle: { es: 'Métricas del sitio', en: 'Site metrics' },
  timelineTitle: { es: 'Línea de tiempo 2028', en: '2028 timeline' },
  compareTitle: { es: 'Comparador de sitios', en: 'Site comparison' },
  sun: { es: 'Sol', en: 'Sun' },
  earth: { es: 'Tierra', en: 'Earth' },
  both: { es: 'Sol + Tierra', en: 'Sun + Earth' },
  visible: { es: 'visible', en: 'visible' },
  hidden: { es: 'oculto', en: 'hidden' },
  now: { es: 'Ahora', en: 'Now' },
  month: { es: 'Este mes', en: 'This month' },
  year: { es: 'Año 2028', en: 'Year 2028' },
  longestDark: { es: 'Noche más larga', en: 'Longest night' },
  longestNoComm: { es: 'Apagón de comunicación más largo', en: 'Longest comms blackout' },
  hours: { es: 'h', en: 'h' },
  play: { es: 'Reproducir', en: 'Play' },
  pause: { es: 'Pausa', en: 'Pause' },
  speed: { es: 'Velocidad', en: 'Speed' },
  site: { es: 'Sitio', en: 'Site' },
  best: { es: 'Mejor sitio', en: 'Best site' },
  recommended: { es: 'Recomendado', en: 'Recommended' },
  azimuth: { es: 'Azimut', en: 'Azimuth' },
  elevation: { es: 'Elevación', en: 'Elevation' },
  terrain: { es: 'Terreno', en: 'Terrain' },
  compareHint: { es: 'Marca sitios para compararlos en el mapa', en: 'Tick sites to highlight them on the map' },
  explainMap: {
    es: 'Cada punto es una región candidata. El color indica qué porcentaje del año se ven el Sol (energía) y la Tierra (comunicación) a la vez: verde es mejor.',
    en: 'Each dot is a candidate region. Color shows how much of the year both the Sun (power) and Earth (comms) are visible: green is better.',
  },
  explainHorizon: {
    es: 'Imagina que estás parado en el sitio y giras 360°. La silueta gris son las montañas. Si el Sol (ámbar) o la Tierra (azul) quedan bajo la silueta, están tapados.',
    en: 'Imagine standing at the site and turning 360°. The grey silhouette is the mountains. If the Sun (amber) or Earth (blue) is below it, it is blocked.',
  },
  explainMetrics: {
    es: 'En el polo el Sol apenas sube unos grados, así que una montaña puede dejarte días sin luz. La noche más larga define cuánta batería necesita la misión.',
    en: 'At the pole the Sun only rises a few degrees, so one mountain can leave you in darkness for days. The longest night sets how much battery a mission needs.',
  },
  explainTimeline: {
    es: 'Cada barra es un día de 2028; más alta y verde = más horas con Sol y Tierra. Pulsa reproducir para ver cómo se mueven en el horizonte.',
    en: 'Each bar is a day of 2028; taller and greener = more hours with Sun and Earth. Press play to watch them move along the horizon.',
  },
  modeHintMission: { es: 'Modo Misión: ranking y recomendación para planificar el alunizaje.', en: 'Mission mode: ranking and recommendation for landing planning.' },
  modeHintClass: { es: 'Modo Clase: explicaciones paso a paso para el aula.', en: 'Class mode: step-by-step explanations for the classroom.' },
  modeHintExplore: { es: 'Modo Explorar: mueve la línea de tiempo y compara libremente.', en: 'Explore mode: scrub the timeline and compare freely.' },
} satisfies Record<string, Record<Lang, string>>

export type TKey = keyof typeof dict

export function translate(lang: Lang, key: TKey): string {
  return dict[key][lang]
}

export const MONTHS: Record<Lang, string[]> = {
  es: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}
