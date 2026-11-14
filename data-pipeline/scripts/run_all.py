"""Pipeline completo en un comando.

  python run_all.py --quick    # solo Malapert, 24 h, horizonte plano (~10 s) para desbloquear al front
  python run_all.py            # 9 sitios, año 2028, con DEM LOLA (descarga ~181 MB una vez)
"""
import argparse
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--skip-dem", action="store_true")
    a = ap.parse_args()
    if a.quick:
        run("fetch_horizons.py", "--site", "malapert-massif",
            "--start", "2028-01-01 00:00", "--stop", "2028-01-02 00:00")
    else:
        run("fetch_horizons.py")
        if not a.skip_dem:
            download_dem()
            run("horizon.py", "--dem", str(DEM))
    run("build.py")


if __name__ == "__main__":
    main()
