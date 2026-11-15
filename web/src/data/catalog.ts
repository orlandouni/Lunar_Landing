// Catálogo de sitios que la app conoce aunque no vengan en public/data/sites.json.
// Las coordenadas son las mismas que data-pipeline/scripts/sites.json (fuente de cada una ahí).
import type { SiteSpec } from '../types'

export const ARTEMIS: SiteSpec[] = [
  { id: 'peak-near-cabeus-b', name: 'Peak near Cabeus B', lat: -83.994, lon: -54.118, group: 'artemis' },
  { id: 'haworth', name: 'Haworth', lat: -86.781, lon: -3.765, group: 'artemis' },
  { id: 'malapert-massif', name: 'Malapert Massif', lat: -85.976, lon: 1.614, group: 'artemis' },
  { id: 'mons-mouton-plateau', name: 'Mons Mouton Plateau', lat: -85.4, lon: 31.664, group: 'artemis' },
  { id: 'mons-mouton', name: 'Mons Mouton', lat: -84.336, lon: 31.668, group: 'artemis' },
  { id: 'nobile-rim-1', name: 'Nobile Rim 1', lat: -86.68, lon: 49.395, group: 'artemis' },
  { id: 'nobile-rim-2', name: 'Nobile Rim 2', lat: -84.828, lon: 68.878, group: 'artemis' },
  { id: 'de-gerlache-rim-2', name: 'de Gerlache Rim 2', lat: -88.516, lon: -68.037, group: 'artemis' },
  { id: 'slater-plain', name: 'Slater Plain', lat: -87.763, lon: 111.628, group: 'artemis' },
]

/** Misiones que alunizaron, con sus coordenadas publicadas */
export const NOTABLE: SiteSpec[] = [
  { id: 'apollo-11', name: 'Apollo 11', lat: 0.6741, lon: 23.473, group: 'notable', note: 'NASA · 1969' },
  { id: 'change-4', name: "Chang'e 4", lat: -45.4446, lon: 177.5991, group: 'notable', note: 'CNSA · 2019' },
  { id: 'chandrayaan-3', name: 'Chandrayaan-3', lat: -69.3733, lon: 32.3191, group: 'notable', note: 'ISRO · 2023' },
  { id: 'slim', name: 'SLIM', lat: -13.316, lon: 25.251, group: 'notable', note: 'JAXA · 2024' },
  { id: 'im-1', name: 'Intuitive Machines IM-1', lat: -80.13, lon: 1.44, group: 'notable', note: 'Intuitive Machines · 2024' },
]

export const NOTABLE_IDS = new Set(NOTABLE.map((s) => s.id))
