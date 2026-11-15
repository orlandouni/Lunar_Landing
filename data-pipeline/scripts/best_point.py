"""Busca, dentro de un radio alrededor de cada sitio, el punto con más horas de Sol y
Tierra a la vez durante 2028 y pendiente segura para aterrizar. Actualiza sites.json.

Por qué: NASA publica las 9 regiones Artemis como zonas (~15x15 km) sin coordenadas de
centro, y nuestros puntos se tomaron de la feature IAU más cercana. Algunos caían en el
fondo de cráteres en sombra permanente (0 % de Sol). Artemis apunta a crestas y bordes
iluminados dentro de cada región, así que elegimos ese punto con el mismo cálculo de
visibilidad del resto del pipeline (visible = el > horizonte LOLA).

Método:
  1. Malla de candidatos cada --step m dentro de --radius-km del punto original (lat0/lon0).
  2. Pendiente de cada candidato: plano ajustado en ±160 m (huella del módulo + margen).
  3. Horizonte rápido de cada candidato (180 azimuts, hasta 150 km).
  4. Sol/Tierra de cada hora: se toman de las efemérides Horizons del sitio original y se
     pasan al marco local del candidato (dirección casi idéntica a <=10 km: paralaje del Sol
     ~0, de la Tierra < 0.002°). Solo cambia el "arriba" local, que sí se corrige.
  5. Puntaje = horas con Sol y Tierra; desempate = horas de Sol. Solo pendiente <= --max-slope
     (si ningún candidato cumple, se relaja de 2 en 2 grados y se avisa).
Después hay que correr fetch_horizons.py, horizon.py (horizonte fino 360 az) y build.py,
que vuelven a calcular todo exactamente en el punto nuevo (run_all.py lo hace).

Uso: python best_point.py --dem ../raw/LDEM_80S_80MPP_ADJ.TIF [--radius-km 10] [--step 400]
"""
import argparse
import json
from pathlib import Path

import numpy as np

from horizon import R_MOON, Dem, destination, slope_deg

HERE = Path(__file__).resolve().parent
DATA = HERE.parent


def basis(lat, lon):
    """Vectores (E, N, U) del marco local en coordenadas fijas a la Luna."""
    p, l = np.radians(lat), np.radians(lon)
    e = np.array([-np.sin(l), np.cos(l), 0.0])
    n = np.array([-np.sin(p) * np.cos(l), -np.sin(p) * np.sin(l), np.cos(p)])
    u = np.array([np.cos(p) * np.cos(l), np.cos(p) * np.sin(l), np.sin(p)])
    return e, n, u


def to_vec(az, el, lat, lon):
    e, n, u = basis(lat, lon)
    a, h = np.radians(az)[:, None], np.radians(el)[:, None]
    return np.cos(h) * (np.sin(a) * e + np.cos(a) * n) + np.sin(h) * u


def to_azel(v, lat, lon):
    e, n, u = basis(lat, lon)
    el = np.degrees(np.arcsin(np.clip(v @ u, -1, 1)))
    az = np.degrees(np.arctan2(v @ e, v @ n)) % 360
    return az, el


class FastDem:
    """Muestreo bilineal con la estereográfica polar escrita en numpy (mucho más rápido
    que pyproj para millones de puntos). Se verifica contra pyproj al iniciar."""

    def __init__(self, dem):
        self.z = dem.z
        t = dem.ds.transform
        self.x0, self.dx, self.y0, self.dy = t.c, t.a, t.f, t.e
        lat, lon = np.array([-85.0, -88.3]), np.array([30.0, -120.0])
        xr, yr = dem.tf.transform(lon, lat)
        xm, ym = self.xy(lat, lon)
        assert np.allclose(xr, xm, atol=1) and np.allclose(yr, ym, atol=1), "proyección distinta a la esperada"

    @staticmethod
    def xy(lat, lon):
        rho = 2 * R_MOON * np.tan(np.radians(90 + lat) / 2)
        return rho * np.sin(np.radians(lon)), rho * np.cos(np.radians(lon))

    def sample(self, lat, lon):
        x, y = self.xy(lat, lon)
        c = (x - self.x0) / self.dx - 0.5
        r = (y - self.y0) / self.dy - 0.5
        c0, r0 = np.floor(c).astype(np.int64), np.floor(r).astype(np.int64)
        H, W = self.z.shape
        ok = (c0 >= 0) & (r0 >= 0) & (c0 < W - 1) & (r0 < H - 1)
        c0, r0 = np.clip(c0, 0, W - 2), np.clip(r0, 0, H - 2)
        fc, fr = c - c0, r - r0
        z = self.z
        out = ((1 - fr) * ((1 - fc) * z[r0, c0] + fc * z[r0, c0 + 1])
               + fr * ((1 - fc) * z[r0 + 1, c0] + fc * z[r0 + 1, c0 + 1]))
        return np.where(ok, out, np.nan)


def fast_horizon(fd, lat, lon, h0, obs_h=2.0, n_az=180, max_km=150):
    d = np.unique(np.concatenate([np.arange(160, 3000, 160), np.geomspace(3000, max_km * 1000, 260)]))
    az = np.arange(n_az) * (360 / n_az)
    plat, plon = destination(lat, lon, az, d)
    ht = fd.sample(plat, plon)
    th = d / R_MOON
    rt, ro = R_MOON + ht, R_MOON + h0 + obs_h
    el = np.degrees(np.arctan2(rt * np.cos(th) - ro, rt * np.sin(th)))
    return np.nanmax(np.where(np.isnan(el), -90, el), axis=1)


def candidates(lat0, lon0, radius_m, step_m):
    g = np.arange(-radius_m, radius_m + 1, step_m)
    gx, gy = np.meshgrid(g, g)
    keep = np.hypot(gx, gy) <= radius_m
    gx, gy = gx[keep], gy[keep]
    dist = np.hypot(gx, gy)
    az = np.degrees(np.arctan2(gx, gy)) % 360
    lat, lon = [], []
    for a, dd in zip(az, dist):
        if dd == 0:
            lat.append(lat0), lon.append(lon0)
            continue
        p, l = destination(lat0, lon0, np.array([a]), np.array([dd]))
        lat.append(float(p[0, 0])), lon.append(float(l[0, 0]))
    lon = (np.array(lon) + 180) % 360 - 180
    return np.array(lat), lon, dist


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dem", default=str(DATA / "raw" / "LDEM_80S_80MPP_ADJ.TIF"))
    ap.add_argument("--radius-km", type=float, default=10.0)
    ap.add_argument("--step", type=float, default=400.0, help="separación de la malla (m)")
    ap.add_argument("--max-slope", type=float, default=8.0)
    a = ap.parse_args()

    dem = Dem(a.dem)
    fd = FastDem(dem)
    cfg_path = HERE / "sites.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    report = []
    for s in cfg["sites"]:
        if s.get("group", "artemis") != "artemis":
            continue  # solo se reubican las regiones Artemis; misiones y sitios propios quedan donde están
        lat0, lon0 = s.get("lat0", s["lat"]), s.get("lon0", s["lon"])
        f = DATA / "samples" / f"{s['id']}.json"
        smp = json.loads(f.read_text(encoding="utf-8"))
        smp = [x for x in smp if x["t"].startswith("2028")]
        # Las efemérides en caché pueden ser del punto ya movido: se refieren a (lat, lon) actual
        ref_lat, ref_lon = s["lat"], s["lon"]
        sun_v = to_vec(np.array([x["sunAz"] for x in smp]), np.array([x["sunEl"] for x in smp]), ref_lat, ref_lon)
        earth_v = to_vec(np.array([x["earthAz"] for x in smp]), np.array([x["earthEl"] for x in smp]), ref_lat, ref_lon)

        clat, clon, dist = candidates(lat0, lon0, a.radius_km * 1000, a.step)
        h = fd.sample(clat, clon)
        slope = np.array([slope_deg(dem, la, lo) for la, lo in zip(clat, clon)])
        both = np.zeros(len(clat), int)
        sun_h = np.zeros(len(clat), int)
        for k in range(len(clat)):
            hz = fast_horizon(fd, clat[k], clon[k], h[k])
            sa, se = to_azel(sun_v, clat[k], clon[k])
            ea, ee = to_azel(earth_v, clat[k], clon[k])
            sv = se > hz[np.round(sa / 2).astype(int) % 180]
            ev = ee > hz[np.round(ea / 2).astype(int) % 180]
            both[k], sun_h[k] = int((sv & ev).sum()), int(sv.sum())

        lim = a.max_slope
        while not (slope <= lim).any():
            lim += 2
        ok = slope <= lim
        key = np.where(ok, both * 100000 + sun_h, -1)
        b = int(np.argmax(key))
        k0 = int(np.argmin(dist))
        n = len(smp)
        row = {
            "name": s["name"], "n": len(clat),
            "old": (lat0, lon0, 100 * both[k0] / n, 100 * sun_h[k0] / n, slope[k0]),
            "new": (clat[b], clon[b], 100 * both[b] / n, 100 * sun_h[b] / n, slope[b], dist[b] / 1000, h[b]),
            "lim": lim,
        }
        report.append(row)
        print(f"{s['name']:<22} {len(clat)} candidatos | original: ambos {row['old'][2]:5.1f}% sol {row['old'][3]:5.1f}% "
              f"pend {row['old'][4]:4.1f}° -> nuevo ({clat[b]:.3f}, {clon[b]:.3f}) a {dist[b]/1000:4.1f} km: "
              f"ambos {row['new'][2]:5.1f}% sol {row['new'][3]:5.1f}% pend {slope[b]:4.1f}°"
              + (f"  (pendiente relajada a {lim}°)" if lim > a.max_slope else ""))

        s["lat0"], s["lon0"] = lat0, lon0
        s["lat"], s["lon"] = round(float(clat[b]), 4), round(float(clon[b]), 4)
        s["search"] = (f"punto con más horas de Sol+Tierra en 2028 y pendiente <= {lim:g}° dentro de "
                       f"{a.radius_km:g} km de (lat0, lon0); malla {a.step:g} m; best_point.py")

    cfg["_nota"] = ("lat0/lon0: punto original aproximado (feature IAU más cercana; NASA publica las regiones "
                    "Artemis sin coordenadas de centro). lat/lon: punto elegido por best_point.py. "
                    "lon = grados Este (-180..180).")
    cfg_path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    print("-> sites.json actualizado. Siguiente: fetch_horizons.py, horizon.py, build.py")


if __name__ == "__main__":
    main()
