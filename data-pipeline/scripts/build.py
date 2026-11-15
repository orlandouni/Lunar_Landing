"""Une horizontes + efemérides en los archivos que consume el front.

Entradas: sites.json, ../horizons.json, ../samples/<site>.json
Salidas (en ../public/):
  sites.json             -> Site[]  {id, name, lat, lon, elevM, horizon[360]}
  samples/<site>.json    -> Sample[] {t, sunAz, sunEl, earthAz, earthEl}
  summary.json           -> métricas por sitio y mes
Regla de visibilidad: visible = el > horizon[round(az) % 360]
(el Sol cuenta como visible cuando su CENTRO supera el horizonte; radio solar ~0.27°)
"""
import json
import shutil
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent
PUB = DATA / "public"


def visible(el, az, hz):
    return el > hz[round(az) % 360]


def longest_run(flags, value):
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f == value else 0
        best = max(best, cur)
    return best


def metrics(samples, hz):
    sun = [visible(s["sunEl"], s["sunAz"], hz) for s in samples]
    earth = [visible(s["earthEl"], s["earthAz"], hz) for s in samples]
    both = [a and b for a, b in zip(sun, earth)]
    n = len(samples) or 1
    return {
        "hours": len(samples),
        "sunHours": sum(sun), "earthHours": sum(earth), "bothHours": sum(both),
        "sunPct": round(100 * sum(sun) / n, 1),
        "earthPct": round(100 * sum(earth) / n, 1),
        "bothPct": round(100 * sum(both) / n, 1),
        "longestDarkHours": longest_run(sun, False),
        "longestNoCommHours": longest_run(earth, False),
    }


def main():
    sites = json.loads((HERE / "sites.json").read_text(encoding="utf-8"))["sites"]
    hzs = json.loads((DATA / "horizons.json").read_text(encoding="utf-8")) if (DATA / "horizons.json").exists() else {}
    (PUB / "samples").mkdir(parents=True, exist_ok=True)
    out_sites, summary = [], {"rule": "visible = el > horizon[round(az)%360]", "sites": {}}
    for s in sites:
        h = hzs.get(s["id"])
        horizon = h["horizon"] if h else [0.0] * 360
        if not h:
            print(f"AVISO: {s['id']} sin horizonte del DEM (fuera de 80°S–90°S o sin calcular); se usa horizonte plano (0°)")
        out_sites.append({"id": s["id"], "name": s["name"], "lat": s["lat"], "lon": s["lon"],
                          "elevM": h["elev_m"] if h else None, "slopeDeg": h.get("slope_deg") if h else None,
                          "horizon": horizon,
                          "horizonSource": ("LOLA DEM" if h.get("coverage", 1) >= 0.99 else "LOLA DEM (parcial)") if h else "flat",
                          "group": s.get("group", "artemis"), **({"note": s["note"]} if "note" in s else {}),
                          **({"lat0": s["lat0"], "lon0": s["lon0"]} if "lat0" in s else {})})
        f = DATA / "samples" / f"{s['id']}.json"
        if not f.exists():
            print(f"AVISO: faltan efemérides de {s['id']}")
            continue
        samples = json.loads(f.read_text(encoding="utf-8"))
        shutil.copy(f, PUB / "samples" / f.name)
        by_month = defaultdict(list)
        for x in samples:
            by_month[x["t"][:7]].append(x)
        summary["sites"][s["id"]] = {
            "total": metrics(samples, horizon),
            "months": {m: metrics(v, horizon) for m, v in sorted(by_month.items())},
        }
        t = summary["sites"][s["id"]]["total"]
        print(f"  {s['name']:<22} Sol {t['sunPct']:5.1f}%  Tierra {t['earthPct']:5.1f}%  Ambos {t['bothPct']:5.1f}%  "
              f"(noche más larga {t['longestDarkHours']} h)")
    (PUB / "sites.json").write_text(json.dumps(out_sites), encoding="utf-8")
    (PUB / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(f"-> {PUB}")


if __name__ == "__main__":
    main()
