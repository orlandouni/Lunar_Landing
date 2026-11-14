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

## Diseño (estilo Google Earth)

Al entrar se ve **la Luna en 3D, en el espacio, a pantalla completa**. Todo lo demás flota encima en paneles de vidrio:

- **Arriba**: pestañas **Explorar · Métricas · Comparar**, botón **Guía** (explicaciones del modo Clase) y ES/EN.
- **Abajo**: la **línea de tiempo** (2028). Al reproducirla se mueven la luz del Sol, las sombras del relieve, la Tierra y todos los datos.
- **Explorar**: lista de los 9 sitios en semáforo (izquierda) y cámara Luna / Polo / Sitio (derecha). Al **elegir un sitio** (en la Luna o en la lista) la cámara vuela hacia él y aparece su **tarjeta**: Sol/Tierra ahora, % del año, horizonte 360° y botón a Métricas.
- **Métricas**: el sitio a fondo (estado, %, rachas, código de barras hora a hora, mejor ventana, horizonte, mes a mes).
- **Comparar**: ranking con peso Energía/Comunicación, visibilidad anual de los 9 sitios, fuentes.

La escena 3D (`Globe3D.tsx`, three.js + react-three-fiber):
- De lejos se ve la esfera con la textura LROC. Al acercarse al polo (< 2 600 km) aparece el **relieve LOLA real** (594 m/celda) con la curvatura lunar.
- La luz es el Sol de JPL Horizons a la hora elegida, con sombras. El Sol y la Tierra van en su dirección real y con su tamaño angular real.
- Cada sitio es una **región pegada al terreno** (disco que sigue el relieve, ~15 km de ancho de cerca, como las regiones de NASA), del color del semáforo. Crece al alejarse para seguir viéndose.
- El sitio elegido muestra N/E/S/W y líneas de visión al Sol y a la Tierra (punteadas si las tapa el terreno).

| Archivo | Qué hace |
|---|---|
| `src/App.tsx` | Estructura: escena 3D + barra superior + pestañas + línea de tiempo |
| `src/components/Globe3D.tsx` | Escena 3D (Luna, relieve, luz, Sol, Tierra, marcadores, cámara) |
| `src/components/TopBar.tsx`, `SiteList.tsx`, `SiteCard.tsx`, `Timeline.tsx` | Interfaz flotante de Explorar |
| `src/components/Pages.tsx` | Pestañas Métricas y Comparar |
| `src/lib/moon.ts` | Geometría: lat/lon → 3D, az/el → dirección, malla del relieve, discos sobre el terreno |
| `src/lib/visibility.ts` | Regla de visibilidad y métricas (igual que `build.py`) |
| `src/store.tsx` | Estado global (`useApp()`): sitio, hora, pestaña, foco, idioma, pesos |
| `src/i18n.ts` | Todos los textos ES/EN |
| `public/textures/moon_lroc_4k.jpg` | Textura LROC (NASA SVS CGI Moon Kit, dominio público) |
| `public/data/terrain/` | Relieve generado por `data-pipeline/scripts/terrain.py` |

Escena: unidades en km; el polo sur queda hacia +Y (`three = (X, −Z, Y)` del marco fijo a la Luna).

URL compartible: `#site=haworth&t=2000&view=pole&tab=metrics`. Atajos: espacio = reproducir, ←/→ = ±1 h, Shift+←/→ = ±1 día.
