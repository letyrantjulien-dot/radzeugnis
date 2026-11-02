#!/usr/bin/env python3
"""Build grenze.json: the outer boundary of Berlin as one polygon.

Input: berliner-bezirke.geojson, the 12 districts, from
https://github.com/m-hoerz/berlin-shapes (data: Amt fuer Statistik
Berlin-Brandenburg, CC BY 3.0 DE).

The districts are merged into one shape. A tiny buffer (about 1.5 m) closes
the slivers between neighbouring districts and is removed again afterwards;
the result is simplified (about 3 m tolerance) and rounded to 1e-5 degrees.

Run on berliner-bezirke.geojson at commit d532e6c (2017-01-23), this
reproduces grenze.json exactly.

Usage: python3 build_grenze.py berliner-bezirke.geojson > grenze.json
Needs: pip install shapely

The output keeps the source licence: CC BY 3.0 DE, Amt fuer Statistik
Berlin-Brandenburg.
"""
import json, sys
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

with open(sys.argv[1], encoding="utf-8") as f:
    bezirke = [shape(ft["geometry"]) for ft in json.load(f)["features"]]

stadt = unary_union([b.buffer(0.00002) for b in bezirke]).buffer(-0.00002)
if stadt.geom_type == "MultiPolygon":            # keep the main body
    stadt = max(stadt.geoms, key=lambda g: g.area)
stadt = stadt.simplify(0.00004)

def runde(ring):
    out = []
    for x, y in ring:
        p = [round(x, 5), round(y, 5)]
        if not out or out[-1] != p:
            out.append(p)
    return out

g = mapping(stadt)
json.dump({"type": "Polygon",
           "coordinates": [runde(r) for r in g["coordinates"]]},
          sys.stdout, separators=(",", ":"))
