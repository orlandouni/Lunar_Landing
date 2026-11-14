# Horizonte Sur · pipeline de datos

> Carpeta `data-pipeline/` del repo. Corre en tu laptop (la nube no llega a los servidores de NASA). Todo lo que genera queda dentro de esta carpeta: `raw/` y `samples/` se ignoran en git; `horizons.json` y `public/` sí se suben para que el front los use.

Genera, para 9 regiones candidatas Artemis del polo sur lunar, la posición horaria del Sol y la Tierra durante 2028 y el perfil del horizonte del terreno, en el formato que consume el front.

## Cómo correrlo

Requiere Python 3.10+ e internet (los servidores de NASA).

```bash
cd scripts
pip install -r requirements.txt
python run_all.py --quick   # Malapert, 24 h, horizonte plano. Tarda segundos.
python run_all.py           # 9 sitios × 8 784 h de 2028 + DEM LOLA (descarga 181 MB una vez). ~10–20 min.
```

Las respuestas de Horizons se guardan en `raw/horizons/`, así que si se corta se puede volver a correr sin repetir descargas.

## Salida (`public/`, copiar a `public/data/` del front)

| Archivo | Forma |
|---|---|
| `sites.json` | `Site[]` = `{id, name, lat, lon, elevM, horizon: number[360], horizonSource}` |
| `samples/<id>.json` | `Sample[]` = `{t, sunAz, sunEl, earthAz, earthEl}` (t ISO UTC, horario) |
| `terrain/height.bin` + `meta.json` | Relieve LOLA del polo sur para el globo 3D: Int16 N×N (metros sobre R), promedio por bloques del DEM (`terrain.py`, 1024² ≈ 594 m/celda) |
| `summary.json` | por sitio: `total` y `months["2028-01"]` con `sunPct, earthPct, bothPct, sunHours, earthHours, bothHours, longestDarkHours, longestNoCommHours` |

Convenciones: azimut en grados desde el Norte lunar hacia el Este (0 a 360), elevación en grados sobre el horizonte matemático local. `horizon[i]` es la elevación angular máxima del terreno en el azimut `i`.

Regla de visibilidad: `visible = el > horizon[Math.round(az) % 360]`. Se evalúa con el centro del disco solar (el Sol mide unos 0.53°, así que puede verse parcialmente cuando el centro está justo por debajo).

## Método

1. **Efemérides** (`fetch_horizons.py`): JPL Horizons API, `EPHEM_TYPE=OBSERVER`, `COMMAND` = 10 (Sol) y 399 (Tierra), `CENTER=coord@301`, `COORD_TYPE=GEODETIC`, `SITE_COORD` = lon E, lat, 0 km, `QUANTITIES=4` (azimut/elevación aparentes), `APPARENT=AIRLESS`, paso de 1 h, del 2028-01-01 al 2029-01-01 UTC.
1b. **Mejor punto por región** (`best_point.py`, opcional con `run_all.py --search`): NASA publica las regiones Artemis sin coordenadas de centro. Para cada sitio se prueba una malla cada 400 m en un radio de 10 km alrededor del punto original (`lat0/lon0` en `sites.json`) y se elige el de más horas con Sol y Tierra a la vez en 2028, con pendiente ≤ 8° (plano ajustado al DEM en ±160 m). Usa un horizonte rápido de 180 azimuts; después `horizon.py` y `build.py` recalculan todo con precisión en el punto elegido, y las cifras coinciden con la búsqueda en ±1 punto porcentual.

2. **Horizonte** (`horizon.py`): para cada uno de 360 azimuts recorre el círculo máximo desde el sitio hasta 150 km sobre el DEM LOLA (interpolación bilineal), con observador a 2 m del suelo. La curvatura lunar se trata de forma exacta: `el = atan2((R+h)·cos θ − (R+h₀), (R+h)·sin θ)`, con `θ = d/R` y `R = 1737.4 km`. Se probó con un DEM sintético: una montaña de 5 km a 50 km da 4.85° frente a 4.88° teóricos.
3. **Métricas** (`build.py`): porcentaje de horas con Sol, con Tierra y con ambos, más la noche más larga y el apagón de comunicaciones más largo, por mes y total.

## Coordenadas de los sitios

NASA publica las 9 regiones solo como zonas en un mapa, sin coordenadas de centro. Los puntos de `scripts/sites.json` son **aproximaciones** derivadas de la feature IAU más cercana; el campo `basis` explica cada una. "Peak near Cabeus B", "Mons Mouton Plateau", "Nobile Rim 2" y "de Gerlache Rim 2" son estimados y conviene afinarlos en LROC QuickMap. Si se edita `sites.json`, hay que volver a correr `run_all.py`.

## Fuentes (citar en la entrega)

- **JPL Horizons System**, NASA/JPL Solar System Dynamics: https://ssd.jpl.nasa.gov/horizons/ (API: https://ssd.jpl.nasa.gov/api/horizons.api).
- **LOLA DEM del polo sur, 80 m/px (LDEM_80S_80MPP_ADJ)**, NASA Goddard Planetary Geodesy Data Archive (PGDA): https://pgda.gsfc.nasa.gov/products/90. Barker, M. K. et al. (2023), *Planet. Sci. J.* 4, 183, doi:10.3847/PSJ/acf3e1. Dataset doi:10.60903/gsfcpgda-lola-spole.
- **Regiones candidatas Artemis III**: NASA, "NASA Provides Update on Artemis III Moon Landing Regions" (28 de octubre de 2024), https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/; George et al., LPSC 2026, NTRS 20250011660.
- **Coordenadas de features**: USGS/IAU Gazetteer of Planetary Nomenclature, https://planetarynames.wr.usgs.gov/ (Malapert 3603, Mons Mouton 16070, Nobile 4321, de Gerlache 1439).
