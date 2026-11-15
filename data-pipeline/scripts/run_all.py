"""Pipeline completo en un comando.

  python run_all.py --quick    # solo Malapert, 24 h, horizonte plano (~10 s) para desbloquear al front
  python run_all.py            # 9 sitios, año 2028, con DEM LOLA (descarga ~181 MB una vez)
  python run_all.py --search   # además reubica cada región Artemis en su mejor punto (best_point.py)
  python run_all.py --lat -85.5 --lon 20 --name "Mi sitio"   # agrega una coordenada nueva y genera solo sus datos
  python run_all.py --site apollo-11                          # regenera solo un sitio de sites.json
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
DATA = HERE.parent
DEM_URL = "https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF"
DEM = DATA / "raw" / "LDEM_80S_80MPP_ADJ.TIF"


def run(*args):
    print("\n$", " ".join(args))
    subprocess.run([sys.executable, *args], cwd=HERE, check=True)


def download_dem():
    if DEM.exists() and DEM.stat().st_size > 100_000_000:
        return
    DEM.parent.mkdir(parents=True, exist_ok=True)
    print(f"Descargando DEM LOLA (~181 MB): {DEM_URL}")
    tmp = DEM.with_suffix(".part")
    with requests.get(DEM_URL, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        done = 0
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
                done += len(chunk)
                if total:
                    print(f"\r  {100 * done / total:5.1f}%", end="")
    tmp.replace(DEM)
    print()


def add_site(lat, lon, name):
    """Agrega (o actualiza) una coordenada propia en sites.json y devuelve su id."""
    if not -90 <= lat <= 90:
        raise SystemExit("--lat debe estar entre -90 y 90")
    lon = (lon + 180) % 360 - 180
    name = name or f"{abs(lat):.2f}°{'S' if lat < 0 else 'N'} {abs(lon):.2f}°{'E' if lon >= 0 else 'W'}"
    sid = "custom-" + (re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or f"{lat:.3f}_{lon:.3f}")
    p = HERE / "sites.json"
    cfg = json.loads(p.read_text(encoding="utf-8"))
    cfg["sites"] = [s for s in cfg["sites"] if s["id"] != sid]
    cfg["sites"].append({"id": sid, "name": name, "lat": round(lat, 4), "lon": round(lon, 4),
                         "group": "custom", "basis": "agregado con run_all.py --lat --lon"})
    p.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"sites.json: {sid} ({lat}, {lon})")
    return sid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--skip-dem", action="store_true")
    ap.add_argument("--search", action="store_true",
                    help="antes, mover cada sitio al mejor punto (Sol+Tierra, pendiente < 8°) en 10 km (best_point.py, ~10 min)")
    ap.add_argument("--lat", type=float, help="latitud de una coordenada nueva (grados, sur negativo)")
    ap.add_argument("--lon", type=float, help="longitud Este de la coordenada nueva (grados)")
    ap.add_argument("--name", help="nombre de la coordenada nueva")
    ap.add_argument("--site", help="regenerar solo este id de sites.json")
    a = ap.parse_args()
    if (a.lat is None) != (a.lon is None):
        raise SystemExit("usa --lat y --lon juntos")
    one = add_site(a.lat, a.lon, a.name) if a.lat is not None else a.site
    if one:
        run("fetch_horizons.py", "--site", one)
        if not a.skip_dem:
            download_dem()
            run("horizon.py", "--dem", str(DEM), "--site", one)
        run("build.py")
        print("Copia data-pipeline/public/* a web/public/data/ para verlo en la app.")
        return
    if a.quick:
        run("fetch_horizons.py", "--site", "malapert-massif",
            "--start", "2028-01-01 00:00", "--stop", "2028-01-02 00:00")
    else:
        if a.search:
            run("fetch_horizons.py")  # best_point.py necesita las efemérides del punto actual
            download_dem()
            run("best_point.py", "--dem", str(DEM))
        run("fetch_horizons.py")
        if not a.skip_dem:
            download_dem()
            run("horizon.py", "--dem", str(DEM))
            run("terrain.py", "--dem", str(DEM))  # relieve para el globo 3D del front
    run("build.py")


if __name__ == "__main__":
    main()
