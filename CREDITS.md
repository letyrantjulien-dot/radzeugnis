# Credits

Radzeugnis stands on other people's work. Everything the app uses is listed
here with its licence and a link. The code written for Radzeugnis is MIT
(see `LICENSE`); the files below keep their own licences.

## Data

| File | What it is | Source | Licence | Extract date |
|---|---|---|---|---|
| `netz-berlin.json` | The designated cycling network, the register of cycling facilities and the street network, joined by element ID and classified (format v5) | Senatsverwaltung für Mobilität, Verkehr, Klimaschutz und Umwelt via [Geoportal Berlin](https://gdi.berlin.de): WFS `radverkehrsnetz`, `radverkehrsanlagen` (layer `b_radverkehrsanlagen`), `detailnetz` (layer `c_strassenabschnitte`) | [Datenlizenz Deutschland – Zero – Version 2.0](https://www.govdata.de/dl-de/zero-2-0) | Exported 15 Aug 2026 |
| (live) | The same three WFS layers, fetched by the app when the baked file is missing or out of date | Geoportal Berlin, as above | dl-de/zero-2.0 | At runtime |
| `fahrradstrassen.json` | 926 ways tagged `bicycle_road=yes` or `cyclestreet=yes` (68.7 km) | [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, via Overpass API | [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/) | 11 Aug 2026 |
| `belag.json` | 11,466 street lines with a rough surface (sett, cobblestone, gravel, ground, sand) | OpenStreetMap contributors, via Overpass API | ODbL 1.0 | OSM data of 6 May 2026 and 1 Jun 2026 |
| `verboten.json` | 1,667 ways where cycling is not allowed (motorways, `motorroad=yes`, tunnels with `bicycle=no`) | OpenStreetMap contributors, via Overpass API | ODbL 1.0 | 15 Aug 2026 |
| `grenze.json` | The outer boundary of Berlin, merged from the 12 districts (889.7 km²) | Amt für Statistik Berlin-Brandenburg, via [m-hoerz/berlin-shapes](https://github.com/m-hoerz/berlin-shapes) (commit d532e6c) | [CC BY 3.0 DE](https://creativecommons.org/licenses/by/3.0/de/) | Built 24 Sep 2026 |

The three OSM-derived files are Derivative Databases under the ODbL and stay
under the ODbL: you may reuse them if you credit OpenStreetMap contributors
and share changes to them under the same licence. How each file is made:
`scripts/build_belag.py`, `scripts/build_grenze.py`, the buttons in
`probe.html` (Fahrradstraßen and the restricted-roads list), and
`rz-export.html` (the Senate network). See the README.

## Map

| What | Source | Licence |
|---|---|---|
| Base map tiles and style ("positron") | [OpenFreeMap](https://openfreemap.org), schema by [OpenMapTiles](https://openmaptiles.org) | Map data © OpenStreetMap contributors (ODbL 1.0); OpenMapTiles schema and Positron style: BSD 3-Clause (code), CC BY 4.0 (design) |
| [MapLibre GL JS](https://maplibre.org) 4.7.1, self-hosted in `lib/` | MapLibre contributors | BSD 3-Clause, text in `lib/MAPLIBRE-LICENSE.txt` |

## Code

| What | Used for | Licence |
|---|---|---|
| [@netlify/blobs](https://github.com/netlify/primitives) 11.1.7, with @netlify/otel 7.0.6 and @netlify/runtime-utils 3.0.0 | Storage for community reports; bundled into `netlify/functions/meldungen.mjs` | MIT, texts in `THIRD-PARTY-LICENSES.txt` |
| [esbuild](https://esbuild.github.io) 0.28.2 | Bundles the function (build tool only, not shipped) | MIT |
| [Shapely](https://shapely.readthedocs.io) | Merges the districts in `scripts/build_grenze.py` (build tool only) | BSD 3-Clause |

The routing engine is Radzeugnis's own code (a Dijkstra search over the
Senate's street network in `index.html`). No routing library and no routing
service is used.

## Typefaces

Self-hosted in `fonts/` (woff2 files from [Fontsource](https://fontsource.org)).
No font is loaded from Google or any other outside server.

| Typeface | Weights | Designer | Licence |
|---|---|---|---|
| [Barlow Condensed](https://github.com/jpt/barlow) | 600, 700 | Jeremy Tribby, The Barlow Project Authors | SIL Open Font License 1.1, `fonts/OFL-BarlowCondensed.txt` |
| [IBM Plex Sans](https://github.com/IBM/plex) | 400, 400 italic, 500, 600 | IBM Corp. | SIL Open Font License 1.1, `fonts/OFL-IBMPlexSans.txt` |
| [IBM Plex Mono](https://github.com/IBM/plex) | 400, 500 | IBM Corp. | SIL Open Font License 1.1, `fonts/OFL-IBMPlexMono.txt` |

## Services the app contacts

| Host | Why |
|---|---|
| `tiles.openfreemap.org` | Map tiles |
| `gdi.berlin.de` | Fallback first load, data updates, and a monthly check for a new data release (a count only) |
| The app's own Netlify site (`/api/meldungen`, Netlify Blobs) | Community reports |

Nothing else. No analytics, no Google, no account.

`probe.html` is a developer tool, not part of the app. Its regeneration buttons
also contact public Overpass API servers (overpass-api.de, overpass.kumi.systems,
overpass.private.coffee, overpass.osm.jp, overpass.osm.ch).

## Hosting

[Netlify](https://www.netlify.com) hosts the app and runs the reports function.
