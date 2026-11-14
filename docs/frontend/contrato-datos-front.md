# Contrato de datos para el Front End — Lunar Navigator

Fecha: 14 de noviembre de 2026. Estado: referencia del contrato existente y acuerdos propuestos para integración.

## 1. Objetivo y alcance

Implementar los MVP de la página 5 del documento «Lunar Navigator: idea, problema y propuesta»: nueve sitios, efemérides horarias de 2028, visibilidad de Sol y Tierra, mapa con semáforo, línea de tiempo, horizonte 2D y comparador con ranking. Este documento describe datos y responsabilidades; no acredita la precisión científica de los resultados.

El Back End actual es un pipeline Python que publica archivos JSON estáticos. No existe una API dinámica que reciba fechas y calcule respuestas. El Front End puede filtrar y comparar las series descargadas sin un servidor de cálculo.

## 2. Publicación y rutas

Fuente del paquete: `data-pipeline/public/`. Destino en el proyecto Vite: `web/public/data/`. Publicar todos los archivos de una misma generación juntos.

| Petición HTTP | Respuesta | Uso |
|---|---|---|
| `GET <base>/data/sites.json` | `Site[]` | Catálogo, mapa, perfiles del horizonte |
| `GET <base>/data/samples/<siteId>.json` | `Sample[]` | Tiempo, trayectorias, estados y métricas por intervalo |
| `GET <base>/data/summary.json` | `Summary` | Métricas precalculadas por mes y total |

`<base>` es la ruta base del despliegue. En Vite se obtiene con `import.meta.env.BASE_URL`; no asumir que siempre es `/`. Las respuestas deben ser JSON, con HTTP 200 y `Content-Type: application/json`. Un error HTTP o HTML devuelto como fallback no es un conjunto vacío válido.

El identificador relaciona `Site.id`, el nombre del archivo de muestras y `Summary.sites[id]`. Las muestras no repiten el identificador: lo aporta su archivo.

## 3. Contratos existentes

### Catálogo: `sites.json`

```ts
interface Site {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevM?: number | null;
  horizon: number[];
  horizonSource?: string;
}
```

| Campo | Significado y validación |
|---|---|
| `id` | Identificador único estable; por ejemplo `malapert-massif` |
| `name` | Nombre visible |
| `lat` | Latitud lunar en grados; sur negativo; rango -90 a 90 |
| `lon` | Longitud lunar en grados Este; convención del catálogo -180 a 180 |
| `elevM` | Elevación del terreno en metros; `null` indica que no está disponible |
| `horizon` | Exactamente 360 números finitos en grados. El índice es el azimut entero |
| `horizonSource` | Actualmente `LOLA DEM` o `flat`; el mock del front usa `mock` |

Azimut: 0° norte lunar, 90° este, 180° sur y 270° oeste. `horizon[90]` es el ángulo del horizonte hacia el este. Los valores negativos son válidos. El horizonte es un perfil angular desde un punto, no una malla 3D ni un mapa de elevaciones.

Los sitios del paquete son `peak-near-cabeus-b`, `haworth`, `malapert-massif`, `mons-mouton-plateau`, `mons-mouton`, `nobile-rim-1`, `nobile-rim-2`, `de-gerlache-rim-2` y `slater-plain`. Leerlos del catálogo en lugar de mantener una segunda lista en la UI.

### Serie temporal: `samples/<siteId>.json`

```ts
interface Sample {
  t: string;
  sunAz: number;
  sunEl: number;
  earthAz: number;
  earthEl: number;
}
```

Registro real de Malapert:

```json
{
  "t": "2028-01-01T00:00:00Z",
  "sunAz": 130.262,
  "sunEl": -1.964,
  "earthAz": 355.884,
  "earthEl": 6.427
}
```

`t` es ISO 8601 UTC. Los azimuts son grados en [0, 360); las elevaciones son grados sobre el horizonte matemático local, en [-90, 90]. Una elevación positiva no garantiza visibilidad: debe superar el terreno. Todos los números deben ser finitos. Las series deben estar ordenadas, sin fechas duplicadas y con separación de una hora.

### Resumen: `summary.json`

```ts
interface Metrics {
  hours: number;
  sunHours: number;
  earthHours: number;
  bothHours: number;
  sunPct: number;
  earthPct: number;
  bothPct: number;
  longestDarkHours: number;
  longestNoCommHours: number;
}
interface Summary {
  rule: string;
  sites: Record<string, {
    total: Metrics;
    months: Record<string, Metrics>; // clave YYYY-MM, en UTC
  }>;
}
```

`hours` es actualmente el número de muestras, interpretado como horas por el paso fijo de 1 h. Los campos `*Hours` cuentan muestras visibles; `*Pct` son porcentajes de 0 a 100 redondeados a un decimal. Las rachas cuentan horas consecutivas sin Sol o sin Tierra dentro del intervalo evaluado. Las rachas mensuales quedan truncadas en los límites del mes.

No sumar rachas mensuales para obtener una anual. Tampoco promediar porcentajes mensuales sin ponderarlos por su número de horas. Para un intervalo arbitrario, calcular a partir de las muestras; el resumen solo contiene meses y total.

## 4. Tiempo y regla compartida de visibilidad

Acuerdo recomendado para el año: `[2028-01-01T00:00:00Z, 2029-01-01T00:00:00Z)`. El inicio está incluido y el fin excluido: 8,784 muestras horarias. Interpretar cada muestra como estado representativo del intervalo de una hora que comienza en `t`; es una aproximación horaria, no la duración exacta de una transición.

La muestra de Malapert publicada actualmente incluye el instante final de 2029 y tiene 8,785 registros. El resumen cuenta también ese registro. Antes de usarlo como total de 2028, filtrar el límite final y regenerar el resumen. Mientras tanto, el front puede filtrar las series y recalcular las métricas, sin mezclar estos resultados con el resumen antiguo.

Regla propuesta para unificar ambos lenguajes:

```ts
function isVisible(el: number, az: number, horizon: number[]): boolean {
  const normalized = ((az % 360) + 360) % 360;
  const index = Math.floor(normalized + 0.5) % 360;
  return el > horizon[index];
}
const sunVisible = isVisible(sample.sunEl, sample.sunAz, site.horizon);
const earthVisible = isVisible(sample.earthEl, sample.earthAz, site.horizon);
const bothVisible = sunVisible && earthVisible;
```

La igualdad se considera oculta. Se compara el centro aparente del astro, como simplificación del MVP. No se calcula fracción visible del disco. Visibilidad de la Tierra significa línea de vista geométrica al centro, no garantía de un enlace de radio; horas con Sol no equivalen a energía eléctrica producida.

**Diferencia existente a corregir:** Python usa `round` y JavaScript `Math.round`; difieren en ciertos valores terminados en `.5`. Adoptar `floor(azNormalizado + 0.5)` en ambos lados y regenerar métricas antes de exigir coincidencia exacta. Este documento propone el acuerdo; no modifica los scripts.

Para cada intervalo válido: contar Sol, Tierra y ambos; dividir cada conteo por las horas del intervalo y multiplicar por 100. Recorrer los estados consecutivos para obtener las rachas máximas. Un intervalo vacío debe mostrarse como «Sin datos», sin asignarle un ranking de 0%.

## 5. Flujo de integración recomendado

1. Descargar y validar `sites.json`.
2. Descargar las muestras por `site.id`. Para comparar los nueve sitios, disponer de los nueve archivos.
3. Validar estructura, fechas, paso horario y cobertura antes de indexar por posición.
4. Filtrar al periodo admitido y comprobar que cada sitio tiene exactamente el mismo eje temporal. Si faltan horas, informar cobertura incompleta; no convertir ausencias en oscuridad.
5. Construir el estado de aplicación mostrado abajo.
6. Seleccionar sitio, instante y ventana de análisis en un estado compartido. Mapa, horizonte y comparador deben usar la misma selección temporal.
7. Cargar el resumen solo si corresponde a la misma versión, periodo y regla de cálculo que las muestras.

```ts
interface Dataset {
  source: 'real' | 'mock';
  sites: Site[];
  samples: Record<string, Sample[]>;
  times: string[]; // eje común, después de comprobar igualdad
}
interface Selection { // propuesta para integrar el MVP
  siteId: string;
  timeIndex: number;
  startUtc: string;
  endUtcExclusive: string;
  compareIds: string[]; // máximo 3
}
```

El cargador existente está en `web/src/data/loader.ts`: carga catálogo y muestras, descarta sitios sin datos y toma el eje temporal del primer sitio. No valida igualdad de fechas ni consume `summary.json`. Si falla la carga puede recurrir al mock; `VITE_DATA=real` evita ese fallback general, pero aún permite descartar sitios individuales que fallan. Para la demo completa, exigir explícitamente los nueve sitios y mostrar fallos de carga.

## 6. Datos que consume cada vista

| Vista | Entradas | Resultado |
|---|---|---|
| Mapa polar | Coordenadas y estado del instante o métricas de la ventana | Marcadores y colores |
| Horizonte 2D | `horizon`, muestra actual y muestras de la ventana | Perfil, astros y trayectorias |
| Línea de tiempo | `times` y estados de visibilidad | Selección temporal y franjas Sol/Tierra/ambos |
| Métricas | Muestras filtradas y horizonte | Porcentajes, horas y rachas |
| Comparador | Mismo intervalo para 2–3 sitios | Tabla comparable |
| Ranking | Métricas del mismo intervalo para los nueve sitios | Orden por horas o porcentaje con ambos |
| Exportación CSV | Muestras filtradas y estados calculados | Archivo descargable |

Distinguir el instante mostrado de la ventana analizada. Propuesta de semáforo instantáneo: verde = ambos visibles; ámbar = solo uno; rojo = ninguno. Si el color representa porcentaje de una ventana, mostrar ese significado y su escala. Los umbrales de «buen sitio» son una decisión de producto pendiente, no un dato NASA.

Propuesta de ranking: `bothHours` descendente en una ventana común; desempatar por menor `longestDarkHours` y luego por `id`. Es una política del producto que debe documentarse en la UI. No presentar el ranking anual como recomendación para cualquier fecha de llegada.

CSV sugerido: `siteId,tUtc,sunAzDeg,sunElDeg,earthAzDeg,earthElDeg,sunVisible,earthVisible,bothVisible`. Para un CSV de métricas incluir también inicio y fin exclusivo del intervalo.

## 7. Metadatos recomendados para una siguiente versión

Los siguientes campos **no existen hoy** y no deben ser dependencias obligatorias del primer front. Añadir un `manifest.json` permitiría identificar el paquete sin modificar los arreglos actuales:

```ts
interface ManifestProposal {
  schemaVersion: string;
  datasetVersion: string;
  generatedAt: string;
  startUtc: string;
  endUtcExclusive: string;
  stepSeconds: number; // 3600
  expectedSamplesPerSite: number; // 8784 para 2028
  siteIds: string[];
  visibilityRuleVersion: string;
  observerHeightM: number;
  sources: { name: string; url: string }[];
}
```

También conviene publicar por sitio la procedencia de sus coordenadas y su estado de revisión. `scripts/sites.json` contiene `basis`, pero `build.py` no lo exporta. Hay puntos aproximados y Nobile Rim 1 está marcado como posiblemente mal ubicado. No eliminar esa incertidumbre al mostrar resultados al usuario.

## 8. Responsabilidades y criterios de entrega

**Equipo de datos:** confirmar coordenadas; generar horizontes y efemérides compatibles; corregir límite temporal y redondeo; regenerar resúmenes; entregar los nueve sitios en un paquete consistente con procedencia. Verificar que el horizonte corresponde a las mismas coordenadas usadas para las muestras.

**Equipo de front:** validar JSON en ejecución (los tipos TypeScript no validan una respuesta HTTP); manejar carga, error y ausencia de datos; filtrar en UTC; sincronizar vistas; comparar periodos idénticos; distinguir datos simulados, horizonte plano y terreno calculado.

**Criterios de aceptación propuestos:** nueve IDs únicos con archivos correspondientes; 360 valores finitos por horizonte; 8,784 muestras horarias por sitio para 2028, sin duplicados ni huecos; fechas iguales entre sitios; conteos y porcentajes en rango; `bothHours <= min(sunHours, earthHours)`; métricas del resumen coherentes con la regla compartida y las series. Son verificaciones por completar, no una certificación de que el paquete actual las cumple todas.

No bloquean el MVP: batería, mapa de calor, terreno 3D detallado, rutas EVA o cálculo de potencia. Estos requieren modelos o datos adicionales. El buscador de ventanas y CSV pueden desarrollarse con el contrato actual.

## 9. Referencias del repositorio

- [Generación del paquete](../data-pipeline/scripts/build.py)
- [Descarga de efemérides](../data-pipeline/scripts/fetch_horizons.py)
- [Cálculo de horizontes](../data-pipeline/scripts/horizon.py)
- [Coordenadas y notas](../data-pipeline/scripts/sites.json)
- [Catálogo publicado](../data-pipeline/public/sites.json)
- [Resumen publicado](../data-pipeline/public/summary.json)
- [Tipos del front](../web/src/types.ts)
- [Cargador actual](../web/src/data/loader.ts)
- [Cálculos actuales del front](../web/src/lib/visibility.ts)

Referencia funcional: «Lunar Navigator: idea, problema y propuesta.pdf», páginas 2–7, suministrado por el equipo. Las rutas y los contratos descritos corresponden al código revisado en esta fecha; las propuestas están identificadas explícitamente.
