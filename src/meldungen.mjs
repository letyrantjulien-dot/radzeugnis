// Radzeugnis · community reports · Netlify function at /api/meldungen
//
// GET     active reports plus "chronic" spots (3+ devices in one ~30 m cell
//         within 180 days)
// POST    one report: position, GPS accuracy, category, random device token.
//         No free text, no account, no IP stored.
// DELETE  moderation; needs the header x-radzeugnis-schluessel to match the
//         environment variable RADZEUGNIS_SCHLUESSEL. If the variable is not
//         set, moderation is refused (fails closed).
//
// Build: npm run build  →  netlify/functions/meldungen.mjs

import { getStore } from "@netlify/blobs";

const STUNDE = 36e5;
const TAG = 24 * STUNDE;

// How long a report stays on the map, per category (null = until fixed)
const KATEGORIEN = {
  zugeparkt: 1 * STUNDE, // das Auto ist gleich weg
  scherben: 3 * TAG,     // bis zur Kehrmaschine oder zum Regen
  belag: 90 * TAG,       // Schlaglöcher haben Geduld
  kreuzung: null,        // baulich: bleibt, bis gebaut wird
  endet: null            // dito
};
const GEDAECHTNIS = 180 * TAG; // memory for chronic spots
const CHRONISCH_AB = 3;        // distinct devices per cell
const ZELLE_LAT = 27e-5;       // ~30 m
const ZELLE_LON = 44e-5;

const zelle = (lat, lon) =>
  Math.round(lat / ZELLE_LAT) + ":" + Math.round(lon / ZELLE_LON);

function meter(la1, lo1, la2, lo2) {
  const R = 6371e3;
  const dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 +
    Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default async (req) => {
  const store = getStore("meldungen");
  const jetzt = Date.now();

  if (req.method === "DELETE") {
    // No default key: without the environment variable, nobody moderates.
    const schluessel = process.env.RADZEUGNIS_SCHLUESSEL;
    if (!schluessel || req.headers.get("x-radzeugnis-schluessel") !== schluessel) {
      return Response.json({ fehler: "schluessel" }, { status: 403 });
    }
    let b;
    try { b = await req.json(); } catch (e) { b = {}; }
    if (b.alles === true) {
      await store.setJSON("alle", []);
      return Response.json({ ok: true, weg: "alles" });
    }
    const alle = (await store.get("alle", { type: "json" })) || [];
    let behalten;
    if (b.id) {
      behalten = alle.filter((m) => m.id !== b.id);
    } else if (b.kategorie && b.lat != null && b.lon != null) {
      const ziel = zelle(+b.lat, +b.lon);
      behalten = alle.filter((m) => !(m.kategorie === b.kategorie && zelle(m.lat, m.lon) === ziel));
    } else {
      return Response.json({ fehler: "ziel" }, { status: 400 });
    }
    await store.setJSON("alle", behalten);
    return Response.json({ ok: true, weg: alle.length - behalten.length });
  }

  if (req.method === "GET") {
    const alle = (await store.get("alle", { type: "json" })) || [];
    const aktiv = [];
    const muster = new Map();
    for (const m of alle) {
      const dauer = KATEGORIEN[m.kategorie];
      if (dauer === undefined) continue;
      if (dauer === null || jetzt - m.ts < dauer) {
        aktiv.push({ id: m.id, lat: m.lat, lon: m.lon, kategorie: m.kategorie, ts: m.ts });
      }
      if (jetzt - m.ts < GEDAECHTNIS) {
        const k = m.kategorie + "@" + zelle(m.lat, m.lon);
        let z = muster.get(k);
        if (!z) {
          z = { lat: m.lat, lon: m.lon, kategorie: m.kategorie, n: 0,
                geraete: new Set(), erste: m.ts, letzte: m.ts };
          muster.set(k, z);
        }
        z.n++;
        z.geraete.add(m.geraet || m.id);
        z.erste = Math.min(z.erste, m.ts);
        z.letzte = Math.max(z.letzte, m.ts);
      }
    }
    const chronisch = [];
    for (const z of muster.values()) {
      if (z.geraete.size >= CHRONISCH_AB) {
        chronisch.push({ lat: z.lat, lon: z.lon, kategorie: z.kategorie,
                         n: z.n, erste: z.erste, letzte: z.letzte });
      }
    }
    // Device tokens never leave the server.
    return Response.json({ aktiv, chronisch }, { headers: { "Cache-Control": "no-store" } });
  }

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch (e) { return new Response("bad json", { status: 400 }); }
    const lat = +b.lat, lon = +b.lon, genau = +b.genau;
    const geraet = String(b.geraet || "").slice(0, 64);
    if (!(b.kategorie in KATEGORIEN))
      return Response.json({ fehler: "kategorie" }, { status: 400 });
    if (geraet.length < 8)
      return Response.json({ fehler: "geraet" }, { status: 400 });
    if (!(lat > 52.3 && lat < 52.7 && lon > 13 && lon < 13.8))
      return Response.json({ fehler: "ausserhalb" }, { status: 400 });
    if (!(genau >= 0 && genau <= 200))
      return Response.json({ fehler: "ungenau" }, { status: 400 });

    const alle = (await store.get("alle", { type: "json" })) || [];
    // Plausibility: one device cannot report twice within 20 s,
    // or from two places further apart than 22 m/s allows.
    let letzte = null;
    for (const m of alle) {
      if (m.geraet === geraet && (!letzte || m.ts > letzte.ts)) letzte = m;
    }
    if (letzte) {
      const dt = (jetzt - letzte.ts) / 1e3;
      if (dt < 20) return Response.json({ fehler: "zuSchnell" }, { status: 429 });
      const v = meter(lat, lon, letzte.lat, letzte.lon) / dt;
      if (v > 22) return Response.json({ fehler: "zuSchnell" }, { status: 429 });
    }
    alle.push({ id: crypto.randomUUID(), lat, lon, kategorie: b.kategorie, ts: jetzt, geraet });
    const behalten = alle.filter((m) => KATEGORIEN[m.kategorie] === null || jetzt - m.ts < GEDAECHTNIS);
    while (behalten.length > 8e3) behalten.shift();
    await store.setJSON("alle", behalten);
    return Response.json({ ok: true });
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/meldungen" };
