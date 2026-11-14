# Lunar_Landing

# Horizonte Sur · NASA Space Apps 2026

Reto **Lunar Landing Site Navigator**: comparar sitios de alunizaje del polo sur lunar según horas de Sol y ventanas de comunicación directa con la Tierra.

## Estructura

- `data-pipeline/`: scripts en Python que bajan las efemérides de JPL Horizons, calculan el horizonte con el DEM LOLA y generan los JSON para el front. Instrucciones en [data-pipeline/README.md](data-pipeline/README.md).

## Inicio rápido de datos

```bash
cd data-pipeline/scripts
pip install -r requirements.txt
python run_all.py --quick   # prueba en segundos
python run_all.py           # año 2028 completo, 9 sitios (~10–20 min)
```

Los resultados quedan en `data-pipeline/public/`; cópienlos a `public/data/` del front.
