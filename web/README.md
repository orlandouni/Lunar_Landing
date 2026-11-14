# Horizonte Sur · front (web/)

Vite + React + TypeScript + Tailwind. Tema oscuro de control de misión.

## Correr

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # verifica tipos y genera dist/
```

## Datos

- **Sin hacer nada** la app usa datos **simulados** (`src/data/mock.ts`) con la misma forma que los reales. Arriba sale la etiqueta "DATOS SIMULADOS".
- **Para usar los reales**: copia todo lo de `data-pipeline/public/` a `web/public/data/` (queda `web/public/data/sites.json`, `web/public/data/samples/<id>.json`). Al recargar, la app los detecta sola y la etiqueta cambia a "JPL Horizons + LOLA".
- Forzar uno u otro: crea `web/.env.local` con `VITE_DATA=mock` o `VITE_DATA=real`.

Formas (`src/types.ts`): `Site {id, name, lat, lon, horizon:number[360]}` y `Sample {t, sunAz, sunEl, earthAz, earthEl}`.
Regla de visibilidad (`src/lib/visibility.ts`, igual que `build.py`): `visible = el > horizon[round(az) % 360]`.
Las métricas (% Sol, % Tierra, % ambos, noche más larga, apagón más largo) se calculan en el navegador con la misma fórmula que `build.py`.

## Estructura (para repartir entre el equipo)

| Archivo | Qué hace | Ideas pendientes |
|---|---|---|
| `src/components/PolarMap.tsx` | Mapa polar con los 9 sitios coloreados por % Sol+Tierra | Imagen de fondo LOLA/LROC, zoom |
| `src/components/HorizonView.tsx` | Panorama 360°: silueta del terreno + Sol (ámbar) y Tierra (azul) | Disco solar con tamaño real, sombreado de noche |
| `src/components/SiteMetrics.tsx` | Tarjetas de métricas del año y del mes actual | Gráfico mensual |
| `src/components/Timeline.tsx` | Tira de 366 días, reproducir, velocidad | Saltar a "próxima noche", fechas de misión |
| `src/components/Comparator.tsx` | Ranking de los 9 sitios | Gráfico radar, exportar |
| `src/components/Header.tsx` | Modos Misión / Clase / Explorar y ES/EN | |
| `src/components/Explain.tsx` | Recuadros explicativos (solo en modo Clase) | |
| `src/i18n.ts` | Todos los textos ES/EN | Agregar textos aquí, nunca sueltos en componentes |
| `src/store.tsx` | Estado global: sitio, tiempo, modo, idioma, comparación | |
| `src/data/` | Cargador real/simulado | |

Cada componente lee el estado con `useApp()` y no recibe props, así que se pueden editar en paralelo sin pisarse.
