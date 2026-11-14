# Contrato de datos: métricas y frontend

Estado: borrador v0.2 para coordinar series, métricas y frontend.
Responsables: Marco (persona 1, catálogo y terreno), Bryan (persona 2, series temporales) y Angel (persona 3, métricas e integración).
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

Bryan entrega series y evidencia de procedencia en una carpeta o rama separada; no actualiza el paquete compartido. Angel valida la unión y es el único que integra `data-pipeline/public/` y su copia a frontend. Cada bloque prueba sus propias reglas; la validación de integración no sustituye las pruebas del productor.

## Entradas

| Archivo | Estructura | Validación |
|---|---|---|
| `data-pipeline/scripts/sites.json` | Objeto con `sites: SiteInput[]`; puede incluir notas. | IDs únicos, nombres y coordenadas presentes. |
| `data-pipeline/horizons.json` | Objeto indexado por ID: `{elev_m, horizon}`. | Todos los IDs del catálogo; elevación finita y exactamente 360 valores finitos. |
| `data-pipeline/samples/<id>.json` | Arreglo de `Sample`. | Serie ascendente, sin duplicados ni huecos y con cobertura del periodo. |

`SiteInput`: `id` y `name` son cadenas no vacías; `lat` está en [-90,90], `lon` en [-180,180], en grados de longitud este. `basis` es una nota opcional de procedencia y no se exporta actualmente.

Todos los números deben ser finitos: no se aceptan NaN, Infinity, cadenas numéricas ni booleanos como números. Para el lote completo se esperan los nueve IDs del catálogo, sin combinar versiones distintas de coordenadas, horizontes y efemérides.

Las series de `public/samples/` son resultados distribuidos, no una segunda fuente automática. Si se usan para recuperar entradas ausentes, debe hacerse explícitamente sobre una copia, con procedencia revisada por persona 2. No introducir un fallback silencioso.

## Procedencia y reproducibilidad de las series

Requisito objetivo: la entrega de Bryan debe permitir identificar el periodo solicitado y reproducir la consulta. La cantidad de filas o las fechas extremas, por sí solas, no definen el periodo: la última fila puede ser un inicio de intervalo o el cierre opcional.

Propuesta de manifiesto separado de los arreglos `Sample`, pendiente de acordar ubicación y esquema con Angel. No es un archivo existente ni un campo nuevo obligatorio del frontend. Debe registrar como mínimo:

- `start`, `end` en UTC y paso temporal; indicar si se conserva el cierre.
- IDs, versión o hash del catálogo y coordenadas efectivamente enviadas, incluida su precisión; altura del observador, unidades y referencia utilizada.
- URL del servicio y todos los parámetros efectivos de Horizons: cuerpos, centro observador, sistema de coordenadas, configuración angular y escala temporal verificada en la respuesta. No basta con añadir `Z` a una fecha sin comprobar su escala.
- Fecha de descarga de cada respuesta, versión o commit del generador y hashes SHA-256 de respuestas originales y series entregadas.
- Procedencia de entradas recuperadas desde `public/samples/`, si corresponde, y limitaciones conocidas. No atribuirles parámetros o fechas de descarga que no puedan demostrarse.

Angel contrasta esta evidencia con el catálogo y la entrega de terreno de Marco antes de integrar. El manifiesto técnico acompaña la entrega entre bloques; su inclusión en el paquete público requiere un acuerdo separado. Hasta definirlo, registrar esta evidencia en el informe de entrega; la procedencia no demostrada debe quedar explícita como limitación provisional.

La altura usada en la consulta de efemérides y `elevM` del DEM no se consideran intercambiables automáticamente: Marco y Bryan deben documentar sus referencias y acordar cualquier cambio.

### Identificación y validez de caché (Bryan)

La clave debe derivarse de una serialización estable de todos los parámetros efectivos enviados, incluidos coordenadas y altura, cuerpo, centro, inicio y fin completos, paso y opciones de salida. Un hash de esa representación permite distinguir consultas; el ID del sitio y las fechas recortadas al día no bastan.

La misma consulta debe reutilizar la misma clave; cambiar cualquier parámetro efectivo debe invalidarla. Conservar los parámetros junto a la respuesta y validar esta antes de aceptarla. Una respuesta parcial, inválida o de error no constituye una entrada válida de caché. La caché antigua sin configuración demostrable no se reutiliza automáticamente; su migración debe ser explícita y verificable.

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

El productor valida números y rangos antes de redondear. Si se mantiene la precisión actual de tres decimales, el azimut exportado se calcula como `round(az, 3) % 360`: un azimut válido de `359.9996` se exporta como `0.0`, no como `360.0`. Esto no autoriza convertir valores originales inválidos en válidos mediante módulo. Las elevaciones no se normalizan mediante módulo. La respuesta original se conserva sin alterar; la selección del índice del horizonte pertenece al cálculo de visibilidad.

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

## Tiempo: contrato propuesto entre Bryan, Angel y frontend

1. Los periodos son semiabiertos: `[start, end)`. El inicio cuenta; el fin no.
2. Cada muestra en `t` representa el estado del intervalo `[t, t + 1 hora)` dentro del periodo solicitado. Es una aproximación horaria, no una hora exacta de salida/puesta del astro.
3. Se exige una muestra para cada inicio de hora incluido en el periodo. Se acepta la serie con o sin una única muestra adicional exactamente en `end`; esa muestra también debe ser válida, pero no aporta duración ni crea un intervalo. No exigir el cierre para inferir la última hora cubierta.
4. No rellenar huecos, interpolar ni extrapolar silenciosamente.
5. El año objetivo va de `2028-01-01T00:00:00Z` a `2029-01-01T00:00:00Z`: 8.784 intervalos. La serie actual contiene 8.785 muestras por incluir el cierre.
6. El resumen solo incluye meses con duración dentro del periodo: doce claves de 2028, ninguna `2029-01`.
7. Propuesta para selecciones de usuario: horas UTC alineadas, `start < end`, dentro de la cobertura. Fechas arbitrarias/subhorarias requieren otro acuerdo antes de implementarse.

El periodo base y el paso se proporcionan explícitamente al validador y al cálculo de métricas mediante la configuración acordada; no se infiere `end` de la última fila. Esto es un requisito de implementación, no una opción de CLI ya disponible. Los timestamps de la malla deben tener minutos y segundos cero; otros pasos admitidos por Horizons quedan fuera de la entrega horaria de este MVP.

| Periodo declarado | Filas aceptadas | Duración |
|---|---|---|
| Año 2028, sin cierre | 8.784; última `2028-12-31T23:00:00Z` | 8.784 h |
| Año 2028, con cierre | 8.785; última `2029-01-01T00:00:00Z` | 8.784 h |
| `[2028-01-01T00:00:00Z, 2028-01-02T00:00:00Z)` | 24, o 25 con cierre | 24 h |

Para validar una entrega base, rechazar filas anteriores a `start` o posteriores a `end`; la única fila opcional fuera del intervalo semiabierto es la situada exactamente en `end`. Para calcular una subventana sobre una entrega base ya validada, seleccionar los inicios de intervalo dentro de la subventana: las demás filas de la entrega base no son errores ni aportan duración a esa selección. Todos los sitios comparados deben cubrir exactamente la misma malla requerida; la presencia del cierre opcional no cambia esa cobertura.

Propuesta de transición: conservar el cierre en las series actuales para evitar reescrituras innecesarias; los validadores y consumidores deben admitir ambas variantes y producir las mismas métricas. Bryan confirma esta convención con Angel; frontend debe aplicarla también a estados, fechas navegables y agrupaciones diarias para no crear un día adicional de 2029.

Los máximos mensuales se recortan a cada mes. El máximo anual se calcula sobre la serie completa; no es necesariamente el mayor máximo mensual.

## Validación de series y responsabilidades

Bryan valida tanto la respuesta original como el JSON exportado; Angel vuelve a comprobar el contrato de entrada antes de integrar.

- En el parser, detectar timestamps inválidos, duplicados y desorden antes de almacenarlos en un diccionario o de ordenar filas. No sobrescribir duplicados silenciosamente.
- Exigir la malla completa para Sol y Tierra por separado. Comprobar que sus fechas coinciden, incluido el cierre si está presente, antes de unirlos. No usar la intersección como sustituto de validación ni perder filas silenciosamente.
- En el JSON exportado, validar campos requeridos, tipos numéricos estrictos, finitud, rangos y UTC; no aceptar cadenas numéricas ni booleanos como números. El parser sí convierte las columnas textuales de Horizons a números, comprobando su validez. No rellenar ni interpolar valores ausentes o inválidos.
- El validador propio de Bryan debe poder revisar series existentes sin red ni modificaciones y recibir explícitamente periodo y paso. Un error debe identificar archivo o sitio y, cuando corresponda, fila, fecha o campo; terminar con código distinto de cero.
- Una respuesta rechazada no debe sobrescribir una serie previamente válida. Preparar y validar la serie antes de sustituir su archivo; no anunciar éxito de una entrega completa si faltan sitios.

Pruebas mínimas del bloque de series: año con y sin cierre; ventana de 24 horas con y sin cierre; hora ausente; duplicado y desorden en respuesta original; fechas distintas entre Sol y Tierra; fecha sin UTC o fuera del periodo; paso no horario; campo ausente, booleano o número no finito; ángulo inválido y redondeo cerca de 360; respuesta truncada; cambio de coordenadas, paso u horas de consulta que cambie la clave de caché. Usar fixtures pequeños sin red; una consulta real de contraste es una comprobación adicional.

## Visibilidad y compatibilidad de redondeo

Regla existente: el centro del astro es visible solo si `el > horizon[index]`. Igualdad significa no visible; `both = sunVisible AND earthVisible`.

**Discrepancia actual:** `build.py` usa `round()` de Python y `web/src/lib/visibility.ts` usa `Math.round()` de JavaScript. En valores terminados en `.5` pueden elegir índices diferentes.

Propuesta compatible con los resultados actuales: conservar redondeo al entero más cercano con empates al par, y después aplicar módulo 360. Confirmarlo con frontend; no sustituir automáticamente por `Math.round()`.

| Azimut | Índice propuesto |
|---|---|
| 0.5 | 0 |
| 1.5 | 2 |
| 2.5 | 2 |
| 359.5 | 0 |

No incluir fracciones de disco solar/terrestre en este MVP. Si frontend calcula estados para una ventana, debe usar la misma regla; si solo dibuja resultados, no necesita duplicar el cálculo.

El frontend actual también calcula duraciones con `samples.length` y agrupa días por bloques de 24 filas. Corregir solo `summary.json` no corrige esas vistas si siguen recalculando. Angel y frontend deben acordar qué vistas consumen resúmenes y cuáles calculan desde muestras, aplicando en todas el periodo semiabierto y el mismo redondeo. Bryan entrega ángulos; no los adapta al índice del horizonte para compensar diferencias entre consumidores.

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

- [ ] Catálogo, horizontes y series corresponden a la misma versión de sitios, con evidencia de procedencia y parámetros efectivos.
- [ ] Bryan entrega validador y pruebas de parser, cobertura y caché; no se ocultan duplicados ni diferencias entre Sol y Tierra.
- [ ] Periodo explícito y variantes con/sin cierre comprobadas: mismas métricas, sin día adicional en frontend.
- [ ] Convenciones temporal y de redondeo confirmadas con Angel y frontend; ubicación y esquema del manifiesto acordados antes de exigirlo como archivo.
- [ ] Nueve sitios completos y métricas anuales de 8.784 horas.
- [ ] Resúmenes con doce meses de 2028 y sin horas del cierre de 2029.
- [ ] Pruebas de límites temporales y redondeo compartidas con frontend.
- [ ] Entradas inválidas no alteran el paquete anterior.
- [ ] Datos provisionales identificados; ninguna afirmación de validación científica sin evidencia.
- [ ] Copia completa en `web/public/data/`, no documentos ni entradas crudas.

Consulta la [especificación](spec.md) para las tareas, propietarios y pruebas de aceptación.
