"""Centroides de polígonos de regiones (shapefile .shp/.zip, .geojson o .kml).

El centroide se calcula en proyección estereográfica polar sur (área real) y se
devuelve en lat/lon. Uso:  python region_centroids.py regiones.(shp|zip|geojson|kml)
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import numpy as np
from pyproj import CRS, Transformer

R = 1737400.0
GEO = CRS.from_proj4(f"+proj=longlat +R={R} +no_defs")
STERE = CRS.from_proj4(f"+proj=stere +lat_0=-90 +lon_0=0 +k=1 +R={R} +units=m")
FWD = Transformer.from_crs(GEO, STERE, always_xy=True)
INV = Transformer.from_crs(STERE, GEO, always_xy=True)


def read(path):
    """-> [(name, [ring (N,2) lon/lat, ...]), ...]"""
    p = Path(path)
    suf = p.suffix.lower()
    if suf in (".geojson", ".json"):
        fc = json.loads(p.read_text(encoding="utf-8"))
        out = []
        for f in fc["features"]:
            g, props = f["geometry"], f.get("properties", {})
            polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
            out.append((_name(props), [np.array(poly[0])[:, :2] for poly in polys]))
        return out
    if suf == ".kml":
        root = ET.parse(p).getroot()
        out = []
        for pm in root.iter():
            if not pm.tag.endswith("Placemark"):
                continue
            name = next((e.text for e in pm.iter() if e.tag.endswith("name")), "?")
            rings = [np.array([[float(v) for v in c.split(",")[:2]] for c in e.text.split()])
                     for e in pm.iter() if e.tag.endswith("coordinates")]
            out.append((name, rings))
        return out
    import shapefile  # pyshp
    if suf == ".zip":
        z = zipfile.ZipFile(p)
        shp = next(n for n in z.namelist() if n.lower().endswith(".shp"))
        base = shp[:-4]
        r = shapefile.Reader(shp=z.open(shp), dbf=z.open(base + ".dbf"),
                             prj=None)
        prj = next((z.read(n).decode() for n in z.namelist() if n.lower().endswith(".prj")), None)
    else:
        r = shapefile.Reader(str(p))
        prj_p = p.with_suffix(".prj")
        prj = prj_p.read_text() if prj_p.exists() else None
    fields = [f[0] for f in r.fields[1:]]
    out = []
    for sr in r.shapeRecords():
        pts, parts = np.array(sr.shape.points), list(sr.shape.parts) + [len(sr.shape.points)]
        rings = [pts[a:b] for a, b in zip(parts[:-1], parts[1:])]
        if prj and "stere" in prj.lower():  # ya viene en metros polares
            rings = [np.column_stack(INV.transform(r_[:, 0], r_[:, 1])) for r_ in rings]
        out.append((_name(dict(zip(fields, sr.record))), rings))
    return out


def _name(props):
    for k, v in props.items():
        if re.search("name|region|label|site", k, re.I) and isinstance(v, str):
            return v
    return json.dumps(props, default=str)[:60]


def centroid(rings):
    A = cx = cy = 0.0
    for ring in rings:
        x, y = FWD.transform(ring[:, 0], ring[:, 1])
        x, y = np.append(x, x[0]), np.append(y, y[0])
        cr = x[:-1] * y[1:] - x[1:] * y[:-1]
        a = cr.sum() / 2
        A += a
        cx += ((x[:-1] + x[1:]) * cr).sum() / 6
        cy += ((y[:-1] + y[1:]) * cr).sum() / 6
    lon, lat = INV.transform(cx / A, cy / A)
    return lat, (lon + 180) % 360 - 180, abs(A) / 1e6


if __name__ == "__main__":
    for name, rings in read(sys.argv[1]):
        lat, lon, km2 = centroid(rings)
        print(f"{name:<32} lat {lat:9.4f}  lon {lon:9.4f}  área {km2:7.1f} km²")
