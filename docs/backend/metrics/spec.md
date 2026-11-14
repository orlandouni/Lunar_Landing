# Especificación: métricas e integración de datos

Estado: borrador de desarrollo, no implementado. Responsable: persona 3.
Objetivo: convertir las series y los horizontes existentes en métricas verificadas y un paquete estático consumible por frontend. No crear una API ni una base de datos.

## Empieza aquí

1. Lee el [contrato de datos](contract.md): define formatos, tiempo, visibilidad y errores.
2. Trabaja con una copia de los datos actuales; no sobrescribas el paquete compartido durante las pruebas.
3. Reproduce el error del límite de 2029 con una prueba pequeña antes de corregirlo.
4. Implementa y prueba cada requisito de esta especificación; integra los nueve sitios al final.

Esta entrega crea únicamente documentación. No autoriza por sí sola ejecutar descargas, publicar datos, modificar código ni cambiar contratos que otros compañeros ya consumen.

## Dónde va cada cosa

Todas las rutas de esta tabla son relativas a la raíz de `Lunar_Landing`.

| Ruta | Contenido y propietario |
|---|---|
| `docs/backend/metrics/spec.md` | Alcance, tareas y aceptación de tu bloque. Actualiza aquí el progreso. |
| `docs/backend/metrics/contract.md` | Acuerdo de entradas y salidas con los otros bloques y frontend. |
| `data-pipeline/scripts/build.py` | Validación de integración, métricas y construcción del paquete. Persona 3. |
| `data-pipeline/scripts/run_all.py` | Orquestación completa. Persona 3. |
| `data-pipeline/tests/test_metrics.py` | Pruebas propuestas de visibilidad, duración y métricas; aún por crear. |
| `data-pipeline/tests/test_build.py` | Pruebas propuestas de entradas, errores y salidas; aún por crear. |
| `data-pipeline/tests/fixtures/metrics/` | Casos sintéticos pequeños propios del bloque; no datos NASA completos. |
| `data-pipeline/scripts/sites.json` | Catálogo de entrada. Persona 1: consultar, no editar desde este bloque. |
| `data-pipeline/horizons.json` | Horizontes de entrada entregados por persona 1. |
| `data-pipeline/samples/<id>.json` | Series de entrada entregadas por persona 2. |
| `data-pipeline/public/` | Paquete generado. Solo la persona 3 integra la versión compartida. |
| `web/public/data/` | Destino acordado para copiar el paquete al frontend, conservando su estructura. |

Los documentos se quedan en `docs/`; no van en `public/`. Los resultados reales no son fixtures de prueba. Los archivos temporales de pruebas deben quedar fuera del repositorio.

## Situación verificada el 2026-11-14

- `public/sites.json` contiene nueve sitios con 360 valores finitos por horizonte.
- Las nueve series de `public/samples/` contienen 8.785 muestras horarias, desde `2028-01-01T00:00:00Z` hasta `2029-01-01T00:00:00Z`, sin duplicados ni saltos.
- Los conteos de Sol, Tierra y ambos coinciden con la regla actual de Python; esto demuestra consistencia interna, no exactitud científica.
- `summary.json` cuenta 8.785 horas y contiene `2029-01`. La muestra final se está contando como otra hora.
- En `data-pipeline/samples/` solo estaba Malapert. No ejecutar `build.py` sobre entradas incompletas: hoy puede producir una salida parcial y conservar archivos antiguos.
- El DEM no estaba disponible localmente. La validación de métricas no necesita descargarlo si usa perfiles entregados y fixtures.
- La revisión de coordenadas, incluidos Nobile Rim 1 y los resultados extremos de Haworth/Slater, pertenece al bloque de terreno. No alterar sus valores para que parezcan razonables.

## Alcance y límites

Incluido: duración, visibilidad, porcentajes, rachas, intervalos seleccionados, datos para comparación/ranking, rechazo de entradas incompletas y entrega al frontend.

Fuera de alcance: corregir coordenadas, cambiar geometría del horizonte, descargar nuevas efemérides, construir componentes de UI, simular baterías, calcular enlaces de radio o certificar seguridad de alunizaje. El buscador automático de la mejor ventana sigue siendo un extra; calcular un intervalo elegido no lo implica.

## Requisitos y aceptación

### S1. Contar duración, no cantidad de muestras

- Usar el intervalo anual `[2028-01-01T00:00:00Z, 2029-01-01T00:00:00Z)`.
- La muestra de cierre puede conservarse en la serie, pero no aporta otra hora ni crea un mes en el resumen.
- El total anual debe ser 8.784 horas; febrero debe tener 696 y el resumen exactamente los doce meses de 2028.
- Una ventana de 24 horas con 25 muestras incluyendo sus extremos cuenta 24 horas.

### S2. Aplicar una sola regla de visibilidad

- Compartir la definición del contrato entre cálculo anual, mensual y por intervalo.
- Evaluar Sol y Tierra por separado; ambos es la conjunción de los dos resultados.
- Si la elevación es igual al horizonte, no hay visibilidad según la regla del MVP.
- Probar azimuts de medio grado y el paso de 359 a 0 grados. No cambiar silenciosamente el redondeo existente.

### S3. Calcular métricas verificables

- Mantener los nombres actuales de las métricas y sus unidades.
- Calcular rachas totales sobre toda la serie, sin reiniciarlas al cambiar de mes; recortar las rachas mensuales a su mes.
- No sumar porcentajes ni máximos mensuales para obtener los anuales.
- Rechazar periodos vacíos o sin cobertura completa; no devolver ceros que aparenten observaciones válidas.

### S4. Soportar comparación por intervalo

- Reutilizar el mismo cálculo para una selección temporal común a los sitios comparados.
- Propuesta inicial: límites alineados a horas UTC; confirmar con frontend antes de fijar una interfaz pública. No interpolar duraciones subhorarias sin un acuerdo adicional.
- Entregar métricas comparables y estados horarios que permitan dibujar las franjas temporales. Los estados pueden derivarse de las series: no se exige un archivo nuevo.
- El orden del ranking y los umbrales del semáforo requieren acuerdo con frontend; no inventar una puntuación científica.

### S5. Rechazar paquetes incompletos

- Verificar catálogo, horizontes, series y correspondencia de IDs antes de escribir la salida compartida.
- Para una entrega completa, exigir los nueve sitios, sus 360 valores y cobertura horaria válida.
- Fallar con código distinto de cero y un diagnóstico que identifique el sitio y el problema.
- Ante una entrada inválida, conservar intacto el paquete anterior. Preparar la salida por separado y publicar solo después de validarla; no prometer atomicidad entre múltiples archivos sin implementarla y probarla.
- No sustituir silenciosamente un horizonte ausente por uno plano en una entrega completa.

### S6. Entregar al frontend sin bloquear al equipo

- Mantener `sites.json`, `samples/<id>.json` y `summary.json` como archivos estáticos.
- Entregar primero una copia provisional claramente identificada; reemplazarla por un lote coherente cuando lleguen correcciones de los otros bloques.
- Coordinar el comportamiento de `--quick` y `--skip-dem`: no eliminarlos ni cambiar su significado sin avisar. Una demo parcial/plana no debe sobrescribir el paquete completo compartido.
- Actualizar la documentación de ejecución cuando se implementen cambios. No documentar opciones nuevas como existentes.

## Plan de desarrollo

| Tarea | Requisitos | Resultado | Estado |
|---|---|---|---|
| T1 | S1, S2 | Pruebas del límite anual y de redondeo; corrección mínima de duración. | Pendiente |
| T2 | S3, S4 | Cálculo reutilizable de métricas y ventanas, con resultados esperados. | Pendiente |
| T3 | S5 | Validación previa y protección del paquete ante entradas inválidas. | Pendiente |
| T4 | S6 | Integración de los nueve sitios y entrega acordada a frontend. | Pendiente |

No hace falta esperar a las personas 1 y 2 para T1-T3: usa fixtures y una copia del lote actual. Para T4, solicita sus entradas completas y registra cualquier limitación científica pendiente.

## Pruebas mínimas

Usar pruebas deterministas sin red. Propuesta de runner: `unittest` de Python, sin añadir dependencias. La siguiente orden será aplicable cuando existan los tests; no afirma que ya estén implementados:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s data-pipeline/tests -p "test_*.py"
```

| Caso | Resultado esperado |
|---|---|
| Tres muestras a las 00:00, 01:00 y 02:00; ventana [00:00, 02:00) | `hours=2`; el estado de 02:00 no aporta duración. |
| En esas dos horas: Sol `[true,false]`, Tierra `[true,true]` | Sol 1 h/50%; Tierra 2 h/100%; ambos 1 h/50%; oscuridad máxima 1 h; incomunicación máxima 0 h. |
| Última muestra de 2028 seguida del cierre de 2029 | Sin hora adicional ni clave mensual `2029-01`. |
| Dos horas oscuras a ambos lados de un límite mensual | Racha total de 2 h, racha mensual de 1 h en cada mes del fixture. |
| Falta un sitio/horizonte, hay NaN, duplicados, desorden o huecos | Error identificable, salida no exitosa, paquete anterior sin cambios. |
| Paquete anterior contiene un sitio que ya no pertenece al catálogo | El nuevo paquete no conserva archivos obsoletos; probarlo sobre un directorio temporal. |
| Modos rápido y sin descarga de DEM | Comportamiento explícito y probado; no degradan el paquete completo compartido. |

Observar una prueba fallando antes de corregir cada regla. Al cambiar `build.py`, comprobar también los consumidores existentes y los modos de `run_all.py`. No descargar NASA durante estos tests.

## Coordinación y decisiones pendientes

- Persona 1 conserva propiedad de catálogo y terreno; persona 2, de efemérides. Solicitar cambios, no editar sus scripts.
- Persona 2 debe confirmar la convención temporal propuesta en el contrato; persona 3 aplica esa convención a las métricas.
- Frontend debe confirmar límites horarios, redondeo de azimut, orden de ranking y presentación provisional antes de fijar esos acuerdos como estables.
- Solo la persona 3 integra `public/`. Cada colaborador trabaja en su rama/copia y entrega resultados aparte.
- El frontend no debe interpretar el campo `horizonSource` como certificación científica.

## Definición de terminado

- [ ] S1-S6 cubiertos por pruebas y revisión de salidas.
- [ ] Contrato temporal y de redondeo acordado con persona 2 y frontend.
- [ ] Nueve sitios y doce meses; total de 8.784 horas por sitio.
- [ ] No se alteran entradas ni se publica parcialmente ante errores de validación.
- [ ] Frontend carga una copia completa del paquete y distingue datos provisionales.
- [ ] Limitaciones científicas y decisiones aún abiertas documentadas.

## Referencias

- [Contrato de este bloque](contract.md).
- [README del pipeline](../../../data-pipeline/README.md).
- [Implementación actual de métricas](../../../data-pipeline/scripts/build.py).
- Documento de contexto: "Lunar Navigator: idea, problema y propuesta", páginas 5-7. Archivo compartido por el usuario, no incorporado al repositorio. El alcance se limita al MVP de precálculo y web estática.
