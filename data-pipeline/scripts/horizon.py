"""Perfil de horizonte del terreno para cada sitio a partir de un DEM LOLA polar
(NASA PGDA / PDS), en proyección estereográfica polar sur.

Para cada uno de 360 azimuts (0 = Norte geográfico lunar, 90 = Este) recorre el
terreno sobre el círculo máximo hasta --max-km y guarda la máxima elevación
angular. La curvatura lunar se trata de forma exacta en geometría esférica:
    el = atan2((R+h_t)·cos θ - (R+h_obs), (R+h_t)·sin θ),  θ = d/R

Uso:
  python horizon.py --dem ruta/al/DEM.tif [--max-km 150] [--obs-height 2]
Salida: horizons.json -> {site_id: {"elev_m": h, "slope_deg": s, "horizon": [360 floats]}}
"""
import argparse
import json
from pathlib import Path

import numpy as np
import rasterio
from pyproj import CRS, Transformer

R_MOON = 1737400.0  # m, radio de referencia de LOLA
HERE = Path(__file__).resolve().parent
OUT = HERE.parent


def destination(lat, lon, az, dist):
    """Punto destino en la esfera. lat/lon en grados, az en grados (arrays), dist en m."""
    p1, l1 = np.radians(lat), np.radians(lon)
    a, th = np.radians(az)[:, None], (dist / R_MOON)[None, :]
    p2 = np.arcsin(np.sin(p1) * np.cos(th) + np.cos(p1) * np.sin(th) * np.cos(a))
    l2 = l1 + np.arctan2(np.sin(a) * np.sin(th) * np.cos(p1), np.cos(th) - np.sin(p1) * np.sin(p2))
    return np.degrees(p2), np.degrees(l2)


class Dem:
    def __init__(self, path):
        self.ds = rasterio.open(path)
        print(f"DEM: {path}  {self.ds.width}x{self.ds.height}  res={self.ds.res[0]:.1f} m  crs={self.ds.crs}")
        z = self.ds.read(1, masked=True).astype("float64")
        self.z = z.filled(np.nan)
        self.scale = 1.0
        # Algunos productos vienen en km (p.ej. IMG de PDS con SCALING_FACTOR); detectarlo.
        if np.nanmax(np.abs(self.z)) < 50:
            self.scale = 1000.0
            print("  alturas en km -> convirtiendo a m")
        self.z *= self.scale
        crs = self.ds.crs or CRS.from_proj4(f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R={R_MOON} +units=m")
        geo = CRS.from_proj4(f"+proj=longlat +R={R_MOON} +no_defs")
        self.tf = Transformer.from_crs(geo, crs, always_xy=True)
        self.inv = ~self.ds.transform

    def sample(self, lat, lon):
        """Interpolación bilineal; NaN fuera del DEM."""
        x, y = self.tf.transform(lon, lat)
        c, r = self.inv * (x, y)
        c, r = np.asarray(c) - 0.5, np.asarray(r) - 0.5
        c0, r0 = np.floor(c).astype(int), np.floor(r).astype(int)
        H, W = self.z.shape
        ok = (c0 >= 0) & (r0 >= 0) & (c0 < W - 1) & (r0 < H - 1)
        out = np.full(c.shape, np.nan)
        c0o, r0o, fc, fr = c0[ok], r0[ok], (c - c0)[ok], (r - r0)[ok]
        z = self.z
        out[ok] = ((1 - fr) * ((1 - fc) * z[r0o, c0o] + fc * z[r0o, c0o + 1])
                   + fr * ((1 - fc) * z[r0o + 1, c0o] + fc * z[r0o + 1, c0o + 1]))
        return out


def horizon_for(dem, lat, lon, max_km, obs_h, n_az=360):
    h0 = float(dem.sample(np.array([lat]), np.array([lon]))[0])
    if np.isnan(h0):
        raise ValueError(f"Sitio ({lat},{lon}) fuera del DEM")
    step = abs(dem.ds.res[0])
    # paso fino cerca del sitio, creciente lejos (el error angular cae con la distancia)
    d = np.unique(np.concatenate([np.arange(step, 5000, step),
                                  np.geomspace(5000, max_km * 1000, 3000)]))
    az = np.arange(n_az, dtype=float)
    plat, plon = destination(lat, lon, az, d)
    ht = dem.sample(plat.ravel(), plon.ravel()).reshape(plat.shape)
    th = d / R_MOON
    rt, ro = R_MOON + ht, R_MOON + h0 + obs_h
    el = np.degrees(np.arctan2(rt * np.cos(th) - ro, rt * np.sin(th)))
    hz = np.nanmax(np.where(np.isnan(el), -90, el), axis=1)
    return h0, hz


def slope_deg(dem, lat, lon, half=160.0, n=5):
    """Pendiente (°) del plano que mejor ajusta el terreno en un cuadrado de 2·half m
    centrado en el punto (≈ huella del módulo + margen). Usa coordenadas de la proyección,
    casi conforme cerca del polo (factor de escala < 1.002 a 80°S)."""
    x0, y0 = dem.tf.transform(lon, lat)
    g = np.linspace(-half, half, n)
    dx, dy = np.meshgrid(g, g)
    lon_s, lat_s = dem.tf.transform((x0 + dx).ravel(), (y0 + dy).ravel(), direction="INVERSE")
    z = dem.sample(np.asarray(lat_s), np.asarray(lon_s))
    A = np.c_[dx.ravel(), dy.ravel(), np.ones(dx.size)]
    (a, b, _), *_ = np.linalg.lstsq(A, z, rcond=None)
    return float(np.degrees(np.arctan(np.hypot(a, b))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dem", required=True)
    ap.add_argument("--max-km", type=float, default=150.0)
    ap.add_argument("--obs-height", type=float, default=2.0, help="altura del observador/panel sobre el suelo (m)")
    args = ap.parse_args()
    dem = Dem(args.dem)
    sites = json.loads((HERE / "sites.json").read_text(encoding="utf-8"))["sites"]
    res = {}
    for s in sites:
        h0, hz = horizon_for(dem, s["lat"], s["lon"], args.max_km, args.obs_height)
        sl = slope_deg(dem, s["lat"], s["lon"])
        res[s["id"]] = {"elev_m": round(h0, 1), "slope_deg": round(sl, 1),
                        "horizon": [round(float(v), 3) for v in hz]}
        print(f"  {s['name']:<22} h={h0:8.0f} m  pendiente {sl:4.1f}°  horizonte min/med/max = "
              f"{hz.min():.2f} / {np.median(hz):.2f} / {hz.max():.2f} deg")
    (OUT / "horizons.json").write_text(json.dumps(res), encoding="utf-8")
    print("-> horizons.json")


if __name__ == "__main__":
    main()
