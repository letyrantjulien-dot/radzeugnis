# Radzeugnis

**A report card for Berlin's cycling network.** Berlin's Mobility Act
(Mobilitätsgesetz, 2018) defines a cycling network street by street. The
Senate also publishes a register of the cycling infrastructure that actually
exists. Radzeugnis joins the two and grades the result like a German school
report, from 1 (very good) to 6 (fail), for the whole city, for each of the
twelve districts, and for whatever part of the map is on your screen. It also
routes you across Berlin on protected infrastructure and lets cyclists report
problems on the spot.

- **Live:** https://radzeugnis.netlify.app
- **Runs in:** any current browser with WebGL (Chrome, Firefox, Safari, Edge,
  on phone or desktop). It is a Progressive Web App: install it from the
  browser menu and it works offline after the first load.
- **Languages:** German and English.
- **Version:** 6.12.0

No account, no ads, no tracking, no Google. The official data is baked into
the app and kept on your device.

## How the grade works

The Senate's datasets share one key: every street segment carries the same
official element number in the designated network (`radverkehrsnetz`), in the
register of cycling facilities (`radverkehrsanlagen`) and in the street
network (`detailnetz`). So the join is a lookup by ID, not a map overlay or an
estimate.

Each segment of the designated network gets a class:

| Class | Colour | Meaning |
|---|---|---|
| `fahrrad` | light green | Fahrradstraße (bicycle street). Counts as fully compliant. |
| `gruen` | green | Physically separated cycle track |
| `orange` | orange | Paint only: advisory strips, painted lanes, bus lanes, shared footways split by a line |
| `rot` | red | In the designated network, but nothing is built |
| `grau` | grey | Quiet side street, not part of the designated network (not graded) |

The class comes from the facility's subtype (`sorvt_typ`), not its top-level
category: Berlin files shared footways under "Radwege", and a painted line
between people walking and people cycling is not separation. See `typKlasse()`
in `index.html`.

Grade = (fahrrad + gruen + ½ · orange) ÷ graded length. 85 % or more is a 1,
then 70, 55, 40, 25; below 25 % is a 6.

The data says nothing about width or condition. A 1985 cycle track with tree
roots through it counts as separated. Every simplification here makes Berlin
look better, never worse.

## Routing

The router is Radzeugnis's own code: a Dijkstra search over the Senate's
street network (`bauGraph()` and `dijkstra()` in `index.html`). No routing
library, no routing service. Each street costs its length times a factor:

- Fahrradstraße or separated track: 1
- quiet side street: 1.15
- paint only: 1 + 1.3·s
- nothing built: 1 + 3.2·s
- rough surface (cobbles, gravel, sand), when the "Avoid rough surfaces" switch
  is on: × 2.4

`s` is the short↔safe slider. Roads where cycling is not allowed (motorways,
tunnels, roads in `verboten.json`) are left out of the graph, unless a
Fahrradstraße or an official cycling facility is recorded on them.

## Community reports

Five fixed categories, no free text: blocked by cars, broken surface,
glass/debris, dangerous crossing, lane ends. A report can only be made on the
spot, from the phone's GPS, with an accuracy of 200 m or better. Each one
fades after a time that fits its category (one hour for a parked car, three
months for a pothole, never for a dangerous crossing). When three different
devices report the same spot within 180 days, it becomes a chronic spot.

A report stores: position, time, category, and a random token created on the
device so the server can spot impossible reports (two reports less than
20 seconds apart, or faster than 22 m/s). No IP address, no account, no name.
The token is never sent back to other users.

**No real report is in this repository.** The file
`samples/meldungen-INVENTED.json` is an invented example of the storage format:

```json
{ "id": "00000000-0000-4000-8000-000000000001", "lat": 52.52, "lon": 13.405,
  "kategorie": "scherben", "ts": 1767225600000, "geraet": "beispiel-geraet-0001" }
```

Reports live in Netlify Blobs (store `meldungen`), through the function in
`src/meldungen.mjs`.

## Repository layout

```
index.html                 the whole app (HTML, CSS, JS in one file)
sw.js, manifest.json       service worker and PWA manifest
netz-berlin.json           the Senate network, baked (format v5)
fahrradstrassen.json       Fahrradstraßen from OpenStreetMap
belag.json                 rough-surface streets from OpenStreetMap
verboten.json              roads closed to bikes, from OpenStreetMap
grenze.json                Berlin's outer boundary
fonts/, lib/               self-hosted fonts and MapLibre GL JS, with licences
src/meldungen.mjs          the reports function, readable source
netlify/functions/         the same function, bundled (what Netlify runs)
scripts/                   rebuild belag.json and grenze.json
probe.html                 developer tool: data diagnostics and regeneration
rz-export.html             developer tool: export the device's data to netz-berlin.json
samples/                   invented example data
```

## Build and deploy

The app needs no build. Only the reports function is bundled, and the bundle
is committed, so a plain upload works.

**Deploy on Netlify:**

1. Either drag the app files (everything except `src/`, `scripts/`, `samples/`,
   `node_modules/`) onto Netlify's deploy page, or connect this repository with
   publish directory `.` and no build command.
2. In the site's environment variables, set `RADZEUGNIS_SCHLUESSEL` to a long
   secret of your own. This is the moderation key. If it is not set,
   moderation is refused.
3. To moderate, tap the version number in the app's footer and enter the key.

**Rebuild the function** after changing `src/meldungen.mjs`:

```
npm install
npm run build
```

**Run locally:** any static server works for the map and the grade, for
example `npx serve .`. Reports need `netlify dev`.

## How the data files are made

| File | Made by |
|---|---|
| `netz-berlin.json` | The app loads the three Senate WFS layers into IndexedDB; `rz-export.html`, opened on the same site, writes them out as one file. The app reads this file on first launch and only falls back to the WFS when it is missing. Once a month it asks the WFS for a feature count, to notice a new release. |
| `belag.json` | `scripts/build_belag.py` from two Overpass API responses (the queries are in the script). Reproduces the shipped file byte for byte. |
| `grenze.json` | `scripts/build_grenze.py` from the district boundaries of the Amt für Statistik Berlin-Brandenburg. Reproduces the shipped file byte for byte. Needs `pip install shapely`. |
| `fahrradstrassen.json`, `verboten.json` | The buttons "Fahrradstraßen aus OSM holen" and "Sperrliste aus OSM holen" in `probe.html` (the Overpass queries are in that file). |

The OSM-derived files are matched to the Senate's street network in the
browser, on a grid of about 15 m (`rasterMatch()` in `index.html`).

Sources, licences and extract dates: see [CREDITS.md](CREDITS.md).

## Shared with Radfunk!

Radfunk!, the InvisibleChaos cycle navigation app (and the navigation brain
for an e-ink display), runs on the same engine. These parts are shared, and
this repository is their reference:

- **Classification:** `typKlasse()` and the five classes above.
- **Data format:** `netz-berlin.json` format v5 (`{v, netz, strassen, rau}`,
  plus an optional `verboten` list), read by both apps.
- **OSM layers:** `belag.json`, `fahrradstrassen.json`, `verboten.json`, and
  `rasterMatch()`, which matches them to the street network.
- **Router:** `bauGraph()`, `dijkstra()`, the cost factors, and the legality
  rule `istGesperrt()`.

Not shared: the report card, the district view, community reports and the
interface.

## Press

[Berliner Zeitung, Open Source section, 25 August 2026](https://www.berliner-zeitung.de/article/das-grosse-zeugnis-fuer-berlins-radwege-zehn-von-zwoelf-bezirken-fallen-durch-10281754),
by Julien Le Tyrant. The article was written with Claude, as declared to the
newsroom on 2 October 2026.

## Licence

Code: MIT, © 2026 Julien Le Tyrant / InvisibleChaos (see [LICENSE](LICENSE)).
The data files, MapLibre, the Netlify libraries and the fonts keep their own
licences; see [CREDITS.md](CREDITS.md). The OSM-derived data stays under the
ODbL.

## Legal

Radzeugnis is part of [InvisibleChaos](https://invisiblechaos.netlify.app).

- Impressum: https://invisiblechaos.netlify.app/impressum.html
- Privacy (Datenschutz): https://invisiblechaos.netlify.app/datenschutz.html

## How this was made

Built with AI assistance (Claude, Anthropic's AI): the code, the data scripts and this README were written by Claude in conversation with Julien, who decided what to build, tested every version on his bike in Berlin, and approved each release.

Every file is reviewed, credited and maintained by a person, and this repository is the maintained home of Radzeugnis, not a dump.

Written by Julien and Claude the AI
