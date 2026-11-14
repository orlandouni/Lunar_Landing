"""Mapa de alturas del polo sur para el globo 3D del front.

Reduce el DEM LOLA (LDEM_80S_80MPP_ADJ, 7600x7600 a 80 m/px, estereográfica polar sur)
a una malla de N x N promediando bloques (sin inventar relieve) y la guarda como
enteros de 16 bits en metros.

Uso:
  python terrain.py [--dem ../raw/LDEM_80S_80MPP_ADJ.TIF] [--size 1024]
Salida (../public/terrain/):
  height.bin   Int16 little-endian, fila 0 = arriba (y máx, lado de lon 0°), metros sobre R = 1737.4 km
  meta.json    {size, extentM, radiusM, minM, maxM, projection}
Proyección: x = ρ·sin(lon), y = ρ·cos(lon), ρ = 2R·tan(c/2), c = colatitud desde el polo sur.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling

HERE = Path(__file__).resolve().parent
DATA = HERE.parent


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dem", default=str(DATA / "raw" / "LDEM_80S_80MPP_ADJ.TIF"))
    ap.add_argument("--size", type=int, default=1024)
    a = ap.parse_args()

    with rasterio.open(a.dem) as ds:
        b = ds.bounds
        assert abs(b.left + b.right) < 1 and abs(b.top + b.bottom) < 1, "se espera un DEM centrado en el polo"
        # Promedio por bloques: cada celda de salida es la media de las celdas de 80 m que cubre
        z = ds.read(1, out_shape=(a.size, a.size), resampling=Resampling.average, masked=True).astype("float64")
        extent = b.right - b.left
    z = z.filled(np.nan)
    if np.isnan(z).any():
        z[np.isnan(z)] = np.nanmean(z)
    # LDEM_*_ADJ viene en metros sobre la esfera de 1737.4 km; si viniera en km lo convertimos
    if np.nanmax(np.abs(z)) < 50:
        z *= 1000.0

    out = DATA / "public" / "terrain"
    out.mkdir(parents=True, exist_ok=True)
    np.round(z).clip(-32768, 32767).astype("<i2").tofile(out / "height.bin")
    meta = {
        "size": a.size,
        "extentM": extent,
        "radiusM": 1737400.0,
        "minM": float(z.min()),
        "maxM": float(z.max()),
        "projection": "south polar stereographic, x = rho*sin(lon), y = rho*cos(lon), rho = 2R*tan(c/2); row 0 = +y",
        "source": "LOLA LDEM_80S_80MPP_ADJ (NASA GSFC PGDA), block-averaged",
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    print(f"{a.size}x{a.size}  {extent / a.size:.0f} m/celda  alturas {z.min():.0f} .. {z.max():.0f} m  -> {out}")


if __name__ == "__main__":
    main()
