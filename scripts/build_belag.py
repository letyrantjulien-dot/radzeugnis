#!/usr/bin/env python3
"""Build belag.json: street lines in Berlin with a rough surface.

Input: the two Overpass API JSON responses used for the shipped file
(OSM data as of 2026-06-01 and 2026-05-06), fetched with these queries
over the Berlin frame:

  1 (cobblestones):
    [out:json][timeout:900];(
      way["surface"="cobblestone"]["highway"](52.33,13.08,52.68,13.77);
      way["surface"="sett"]["highway"](52.33,13.08,52.68,13.77);
      way["surface"="unhewn_cobblestone"]["highway"](52.33,13.08,52.68,13.77);
      way["surface"="cobblestone:flattened"]["highway"](52.33,13.08,52.68,13.77);
    );out geom;

  2 (loose surfaces):
    [out:json][timeout:900];(
      way["surface"="gravel"]["highway"](52.33,13.08,52.68,13.77);
      way["surface"="ground"]["highway"](52.33,13.08,52.68,13.77);
      way["surface"="sand"]["highway"](52.33,13.08,52.68,13.77);
    );out geom;

Only streets the router can use are kept (footways, paths, tracks, service
roads and steps are left out), and only lines whose midpoint lies in the
Berlin frame. Coordinates are rounded to 1e-5 degrees (about 1 m) and
consecutive duplicates removed.

Usage: python3 build_belag.py fetch1.json fetch2.json > belag.json

Run on the two original responses, this reproduces belag.json exactly.

Data: (c) OpenStreetMap contributors, ODbL 1.0. The output stays ODbL.
"""
import json, sys

STRASSEN = {"residential", "unclassified", "living_street", "tertiary",
            "secondary", "primary", "trunk", "pedestrian"}
S, W, N, O = 52.338, 13.088, 52.675, 13.761   # Berlin frame

def strasse(h):
    return h in STRASSEN or (h or "").endswith("_link")

linien, gesehen = [], set()
for pfad in sys.argv[1:]:
    with open(pfad, encoding="utf-8") as f:
        for e in json.load(f)["elements"]:
            if e.get("type") != "way" or e["id"] in gesehen:
                continue
            if not strasse(e.get("tags", {}).get("highway")):
                continue
            pts = []
            for g in e.get("geometry", []):
                p = [round(g["lon"], 5), round(g["lat"], 5)]
                if not pts or pts[-1] != p:
                    pts.append(p)
            if len(pts) < 2:
                continue
            mlon, mlat = pts[len(pts) // 2]
            if not (S < mlat < N and W < mlon < O):
                continue
            gesehen.add(e["id"])
            linien.append(pts)

json.dump({"linien": linien}, sys.stdout, separators=(",", ":"))
