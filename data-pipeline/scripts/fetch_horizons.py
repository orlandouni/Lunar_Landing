"""Descarga azimut/elevación horarios del Sol (10) y la Tierra (399) vistos desde
cada sitio lunar, usando la API de JPL Horizons (NASA/JPL SSD).

Uso:
  python fetch_horizons.py                       # 9 sitios, año 2028 completo
  python fetch_horizons.py --site malapert-massif --start 2028-01-01 --stop 2028-01-02

Salida: raw/horizons/<site>_<body>_<start>_<stop>.txt (respuesta cruda, cacheada)
        samples/<site>.json  -> [{t, sunAz, sunEl, earthAz, earthEl}, ...]
"""
import argparse
import json
import time
from pathlib import Path

import requests

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
BODIES = {"sun": "10", "earth": "399"}
HERE = Path(__file__).resolve().parent
OUT = HERE.parent  # /data


def q(v):
    return f"'{v}'"


def fetch(site, body_code, start, stop, step):
    params = {
        "format": "text",
        "COMMAND": q(body_code),
        "OBJ_DATA": q("NO"),
        "MAKE_EPHEM": q("YES"),
        "EPHEM_TYPE": q("OBSERVER"),
        "CENTER": q("coord@301"),
        "COORD_TYPE": q("GEODETIC"),
        # Horizons: E-longitud, latitud, altitud (km) sobre el elipsoide de referencia
        "SITE_COORD": q(f"{site['lon'] % 360:.4f},{site['lat']:.4f},0"),
        "START_TIME": q(start),
        "STOP_TIME": q(stop),
        "STEP_SIZE": q(step),
        "QUANTITIES": q("4"),
        "ANG_FORMAT": q("DEG"),
        "APPARENT": q("AIRLESS"),
        "CSV_FORMAT": q("YES"),
        "TIME_DIGITS": q("MINUTES"),
        "CAL_FORMAT": q("CAL"),
    }
    for attempt in range(5):
        try:
            r = requests.get(API, params=params, timeout=180)
            if r.status_code == 200 and "$$SOE" in r.text:
                return r.text
            if r.status_code == 503:  # Horizons limita a 1 consulta concurrente por IP
                time.sleep(5 * (attempt + 1))
                continue
            raise RuntimeError(f"Horizons respondió {r.status_code}:\n{r.text[:1500]}")
        except requests.RequestException as e:
            print(f"  reintento {attempt + 1}: {e}")
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("Horizons no respondió tras 5 intentos")


MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def parse(text):
    """Devuelve {iso_time: (az, el)} a partir de la tabla CSV entre $$SOE y $$EOE."""
    body = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0]
    rows = {}
    for line in body.strip().splitlines():
        cols = [c.strip() for c in line.split(",")]
        # cols: fecha, marca solar, marca lunar, Azi, Elev, ''
        date = cols[0]  # p.ej. "2028-Jan-01 00:00"
        nums = [c for c in cols[1:] if c and _isnum(c)]
        az, el = float(nums[-2]), float(nums[-1])
        d, hm = date.split()
        y, mon, day = d.split("-")
        iso = f"{y}-{MONTHS[mon]:02d}-{int(day):02d}T{hm}:00Z"
        rows[iso] = (az, el)
    return rows


def _isnum(s):
    try:
        float(s)
        return True
    except ValueError:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", help="id de un sitio (por defecto todos)")
    ap.add_argument("--start", default="2028-01-01 00:00")
    ap.add_argument("--stop", default="2029-01-01 00:00")
    ap.add_argument("--step", default="1h")
    args = ap.parse_args()

    sites = json.loads((HERE / "sites.json").read_text(encoding="utf-8"))["sites"]
    if args.site:
        sites = [s for s in sites if s["id"] == args.site]
        if not sites:
            raise SystemExit(f"Sitio desconocido: {args.site}")

    raw_dir = OUT / "raw" / "horizons"
    raw_dir.mkdir(parents=True, exist_ok=True)
    (OUT / "samples").mkdir(exist_ok=True)
    tag = f"{args.start[:10]}_{args.stop[:10]}"

    for s in sites:
        data = {}
        for name, code in BODIES.items():
            f = raw_dir / f"{s['id']}_{name}_{tag}.txt"
            if not f.exists():
                print(f"Horizons: {s['name']} / {name} {args.start} -> {args.stop}")
                f.write_text(fetch(s, code, args.start, args.stop, args.step), encoding="utf-8")
            data[name] = parse(f.read_text(encoding="utf-8"))
        samples = [
            {"t": t,
             "sunAz": round(data["sun"][t][0], 3), "sunEl": round(data["sun"][t][1], 3),
             "earthAz": round(data["earth"][t][0], 3), "earthEl": round(data["earth"][t][1], 3)}
            for t in sorted(data["sun"]) if t in data["earth"]
        ]
        out = OUT / "samples" / f"{s['id']}.json"
        out.write_text(json.dumps(samples, separators=(",", ":")), encoding="utf-8")
        print(f"  {out.name}: {len(samples)} muestras")


if __name__ == "__main__":
    main()
