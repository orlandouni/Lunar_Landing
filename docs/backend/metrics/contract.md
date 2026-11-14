# Contrato de datos: métricas y frontend

Estado: borrador v0.1 para coordinar el desarrollo de la persona 3.
Los formatos de archivos descritos existen; las reglas objetivo de duración y validación todavía requieren implementación. Las propuestas señaladas deben confirmarse con sus consumidores antes de cambiar comportamiento.

## Flujo y propiedad

```text
Persona 1: catálogo + horizontes ─┐
                                ├─ Persona 3: validar + calcular + empaquetar
Persona 2: series horarias ──────┘                     │
                                                     v
                                      data-pipeline/public/
                                                     │ copia del lote completo
                                                     v
                                           web/public/data/
```

La persona 3 no recalcula coordenadas ni efemérides. Frontend lee archivos estáticos; no hay endpoints HTTP de backend ni base de datos en este contrato. El directorio de documentación es `docs/backend/metrics/`; nunca se copia con los datos públicos.

## Entradas

| Archivo | Estructura | Validación |
|---|---|---|
| `data-pipeline/scripts/sites.json` | Objeto con `sites: SiteInput[]`; puede incluir notas. | IDs únicos, nombres y coordenadas presentes. |
| `data-pipeline/horizons.json` | Objeto indexado por ID: `{elev_m, horizon}`. | Todos los IDs del catálogo; elevación finita y exactamente 360 valores finitos. |
| `data-pipeline/samples/<id>.json` | Arreglo de `Sample`. | Serie ascendente, sin duplicados ni huecos y con cobertura del periodo. |

`SiteInput`: `id` y `name` son cadenas no vacías; `lat` está en [-90,90], `lon` en [-180,180], en grados de longitud este. `basis` es una nota opcional de procedencia y no se exporta actualmente.

Todos los números deben ser finitos: no se aceptan NaN, Infinity, cadenas numéricas ni booleanos como números. Para el lote completo se esperan los nueve IDs del catálogo, sin combinar versiones distintas de coordenadas, horizontes y efemérides.

Las series de `public/samples/` son resultados distribuidos, no una segunda fuente automática. Si se usan para recuperar entradas ausentes, debe hacerse explícitamente sobre una copia, con procedencia revisada por persona 2. No introducir un fallback silencioso.

## Salidas existentes que se conservan

### `sites.json`: arreglo de sitios

| Campo | Tipo / significado |
|---|---|
| `id` | Cadena estable, idéntica al nombre del archivo de muestras sin `.json`. |
| `name` | Nombre para mostrar. |
| `lat`, `lon` | Coordenadas en grados, mismas convenciones que la entrada. |
| `elevM` | Elevación del sitio en metros según el DEM. En el modo plano actual puede ser `null`. |
| `horizon` | 360 números en grados; se permiten elevaciones negativas. |
| `horizonSource` | Valor actual `"LOLA DEM"` o `"flat"`. Describe la fuente, no la validación científica. |

Un paquete completo requiere `elevM` finito y horizonte de terreno. Un ejemplo parcial/plano debe identificarse como demo y mantenerse separado; no presentar `flat` como terreno real.

### `samples/<id>.json`: arreglo de muestras

```json
[
  {
    "t": "2028-01-01T00:00:00Z",
    "sunAz": 120.0,
    "sunEl": 2.0,
    "earthAz": 180.0,
    "earthEl": 5.0
  }
]
```

Ejemplo sintético de una fila, no una serie válida para todo el periodo.

| Campo | Regla |
|---|---|
| `t` | ISO 8601 UTC, `YYYY-MM-DDTHH:mm:ssZ`; malla horaria para este MVP. |
| `sunAz`, `earthAz` | Grados en [0,360), desde el norte lunar hacia el este. |
| `sunEl`, `earthEl` | Grados en [-90,90], respecto al horizonte matemático local. |

### `summary.json`: objeto de métricas

```text
{
  rule: string,
  sites: {
    [siteId]: {
      total: Metrics,
      months: { [YYYY-MM]: Metrics }
    }
  }
}
```

El bloque anterior es notación de esquema, no JSON ejecutable. `rule` describe la regla efectiva; conservar la clave y no usar su texto como API para ejecutar código.

| Campo de `Metrics` | Definición |
|---|---|
| `hours` | Duración cubierta por el periodo, no cantidad de muestras. |
| `sunHours`, `earthHours`, `bothHours` | Duraciones con Sol, Tierra y ambos visibles. |
| `sunPct`, `earthPct`, `bothPct` | `100 * visibleHours / hours`, redondeado a un decimal. |
| `longestDarkHours` | Mayor duración continua sin Sol dentro del periodo. |
| `longestNoCommHours` | Mayor duración continua sin visibilidad del centro de la Tierra dentro del periodo. No es una simulación de enlace de radio. |

Duraciones en horas, porcentajes en [0,100]. `bothHours` no supera `sunHours` ni `earthHours`; ninguna duración supera `hours`. Los periodos vacíos son inválidos, no porcentajes cero. Para mostrar resúmenes precomputados, frontend utiliza sus valores sin recalcularlos con reglas distintas.

## Tiempo: propuesta de acuerdo con persona 2 y frontend

1. Los periodos son semiabiertos: `[start, end)`. El inicio cuenta; el fin no.
2. Cada muestra en `t` representa el estado del intervalo `[t, t + 1 hora)` dentro del periodo solicitado. Es una aproximación horaria, no una hora exacta de salida/puesta del astro.
3. Se exige una muestra para cada inicio de hora incluido en el periodo. Se puede conservar una muestra adicional exactamente en `end`, pero no aporta duración.
4. No rellenar huecos, interpolar ni extrapolar silenciosamente.
5. El año objetivo va de `2028-01-01T00:00:00Z` a `2029-01-01T00:00:00Z`: 8.784 intervalos. La serie actual contiene 8.785 muestras por incluir el cierre.
6. El resumen solo incluye meses con duración dentro del periodo: doce claves de 2028, ninguna `2029-01`.
7. Propuesta para selecciones de usuario: horas UTC alineadas, `start < end`, dentro de la cobertura. Fechas arbitrarias/subhorarias requieren otro acuerdo antes de implementarse.

Los máximos mensuales se recortan a cada mes. El máximo anual se calcula sobre la serie completa; no es necesariamente el mayor máximo mensual.

## Visibilidad y compatibilidad de redondeo

Regla existente: el centro del astro es visible solo si `el > horizon[index]`. Igualdad significa no visible; `both = sunVisible AND earthVisible`.

**Discrepancia actual:** `build.py` usa `round()` de Python, mientras el README muestra `Math.round()` de JavaScript. En valores terminados en `.5` pueden elegir índices diferentes.

Propuesta compatible con los resultados actuales: conservar redondeo al entero más cercano con empates al par, y después aplicar módulo 360. Confirmarlo con frontend; no sustituir automáticamente por `Math.round()`.

| Azimut | Índice propuesto |
|---|---|
| 0.5 | 0 |
| 1.5 | 2 |
| 2.5 | 2 |
| 359.5 | 0 |

No incluir fracciones de disco solar/terrestre en este MVP. Si frontend calcula estados para una ventana, debe usar la misma regla; si solo dibuja resultados, no necesita duplicar el cálculo.

## Intervalos, comparación y ranking

- Comparar sitios usando exactamente el mismo periodo y cobertura completa.
- Reutilizar `Metrics` para cada sitio e intervalo; no renombrar campos entre vistas.
- La ubicación de ese cálculo (precalculado o en frontend) y su interfaz se acuerdan antes de implementarlas. Este documento no inventa un endpoint ni un nuevo comando existente.
- Propuesta de ranking para discutir: mayor `bothHours` en el mismo intervalo; empate explícito y orden estable por ID para presentación. No está aprobado como puntuación de misión.
- Los umbrales del semáforo son una decisión de producto pendiente; no derivarlos de valores arbitrarios.
- La exportación CSV del modo Misión puede derivarse del mismo resultado; no es necesaria para corregir duración y validar el paquete inicial.

## Errores y publicación

| Situación | Comportamiento objetivo |
|---|---|
| Falta una serie, un horizonte o un ID requerido | Detener el build completo y explicar qué falta. |
| Timestamps inválidos, repetidos, desordenados, con huecos o paso no admitido | Rechazar, indicando sitio y tiempo/campo afectado. |
| Número inválido, ángulo fuera de rango o horizonte distinto de 360 valores | Rechazar, sin sustituir por cero. |
| Periodo vacío o fuera de cobertura | Rechazar; frontend muestra falta de datos, no ausencia de Sol. |
| Entrada rechazada | Código de salida distinto de cero; no modificar el paquete público anterior. |
| Paquete completo válido | Sustituir el lote de forma controlada, evitando mezclar archivos nuevos y antiguos y eliminando resultados obsoletos del lote nuevo. |

Validar todas las entradas antes de publicar. Trabajar en un directorio de preparación separado; copiar a frontend únicamente un lote completo verificado. No ejecutar dos builds simultáneos sobre la misma salida compartida.

## Datos provisionales y cambios de contrato

Los JSON actuales no tienen `validated`, `status` ni `schemaVersion`: no asumir que existen. Hasta acordar un marcador explícito, el equipo identifica el lote provisional en su entrega y frontend lo presenta como pendiente de validación. No añadir campos obligatorios sin coordinar a sus consumidores.

Cambiar coordenadas obliga a regenerar horizonte y efemérides del sitio; conservar IDs salvo acuerdo explícito. Cambios de nombres, unidades, redondeo o semántica temporal requieren actualizar este contrato, pruebas y consumidores juntos. Los casos extremos de visibilidad no se corrigen por apariencia.

## Lista de entrega

- [ ] Catálogo, horizontes y series corresponden a la misma versión de sitios.
- [ ] Nueve sitios completos y métricas anuales de 8.784 horas.
- [ ] Resúmenes con doce meses de 2028 y sin horas del cierre de 2029.
- [ ] Pruebas de límites temporales y redondeo compartidas con frontend.
- [ ] Entradas inválidas no alteran el paquete anterior.
- [ ] Datos provisionales identificados; ninguna afirmación de validación científica sin evidencia.
- [ ] Copia completa en `web/public/data/`, no documentos ni entradas crudas.

Consulta la [especificación](spec.md) para las tareas, propietarios y pruebas de aceptación.
