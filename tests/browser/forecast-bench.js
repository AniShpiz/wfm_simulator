// 📏 Forecast benchmark — is a change to the forecast really better? Not a pass / fail test: it prints a table.
// Twelve made-up call centers (stable, growing, a lasting jump, billing peaks, a small center, a drifting day shape …)
// are generated with a seeded random source. For each, the app gets only the weeks up to a cut date (3 cut dates per
// center) and forecasts the weeks AFTER it — which it never saw. Error = Σ|forecast − actual| ÷ Σactual, on the daily
// totals and on the half hours, for next week · the coming month (weeks 2–4) · months ahead (weeks 5–13).
//   node tests/browser/forecast-bench.js              → this index.html against the one on git main
//   node tests/browser/forecast-bench.js <other.html> → against any other build
const puppeteer = require("puppeteer-core");
const path = require("path"), fs = require("fs"), os = require("os"), cp = require("child_process");
const ROOT = path.join(__dirname, "..", "..");
const NEW = path.join(ROOT, "index.html");
let OLD = process.argv[2];
if (!OLD) { OLD = path.join(os.tmpdir(), "wfm-main-index.html"); fs.writeFileSync(OLD, cp.execSync("git show main:index.html", { cwd: ROOT, maxBuffer: 1 << 26 })); }

const pad = n => String(n).padStart(2, "0"), iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const D0 = new Date(2026, 0, 4); // a Sunday
const dayAt = (w, d) => new Date(D0.getFullYear(), D0.getMonth(), D0.getDate() + w * 7 + d);
const WEEKS = 44, CUTS = [22, 26, 30], WD = [1.15, 1.0, 0.97, 0.95, 0.93, 0.45];
const SLOTS = d => { const o = []; for (let h = 8; h < (d === 5 ? 13 : 18); h++) for (const m of [0, 30]) o.push([h, m]); return o; };
const hump = (x, c, s) => Math.exp(-((x - c) ** 2) / (2 * s * s));
const shapeStd = x => 0.55 + hump(x, 10.5, 1.3) + 0.75 * hump(x, 15, 1.6); // a morning and an afternoon peak
const SCEN = [
  { id: "stable", he: "יציב" }, { id: "growth", he: "צמיחה 1% לשבוע", lvl: w => 1.01 ** w }, { id: "decline", he: "ירידה", lvl: w => 0.992 ** w },
  { id: "step", he: "קפיצה שנשארת", lvl: w => w >= 18 ? 1.25 : 1 }, { id: "bend", he: "מגמה שנעצרה", lvl: w => w < 16 ? 1 + 0.02 * w : 1.32 },
  { id: "wave", he: "גל עונתי", lvl: w => 1 + 0.15 * Math.sin(2 * Math.PI * w / 26) }, { id: "peaks", he: "ימי שיא אקראיים", peak: 0.08 },
  { id: "billing", he: "שיאי חיוב", dom: dt => { const k = dt.getDate(); return k <= 3 ? 1.25 : k >= 10 && k <= 12 ? 1.2 : 1; } },
  { id: "small", he: "מוקד קטן", V: 260 }, { id: "short", he: "היסטוריה קצרה (10 שב׳)", lvl: w => 1.008 ** w, keep: 10 },
  { id: "shapeDrift", he: "צורת היום זזה", shape: (x, w) => 0.55 + hump(x, 10.5 + w * 0.05, 1.3) + 0.75 * hump(x, 15, 1.6) },
  { id: "dayShapes", he: "צורה שונה לכל יום", shape: (x, w, d) => 0.55 + hump(x, 9.6 + d * 0.45, 1.3) + (0.5 + d * 0.12) * hump(x, 15, 1.6), busy: 0.09 }
];
function gen(sc, seed) { // → {ds: {di, slots: {"HH:MM": {v, a}}}} for every working day of WEEKS weeks
  let a = seed * 7919 + 13; const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  const nrm = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const pois = l => { if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * nrm())); let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; };
  const out = {}, V = sc.V || 2100;
  for (let w = 0; w < WEEKS; w++) for (let d = 0; d < 6; d++) { const dt = dayAt(w, d), sl = SLOTS(d);
    const sh = sl.map(([h, m]) => (sc.shape || shapeStd)(h + m / 60 + 0.25, w, d)), ss = sh.reduce((x, y) => x + y, 0);
    const day = V * WD[d] * (sc.lvl ? sc.lvl(w) : 1) * (sc.dom ? sc.dom(dt) : 1) * Math.exp((sc.busy || 0.05) * nrm()) * (sc.peak && rnd() < sc.peak ? 1.5 : 1); // a random "busy day" factor on top
    const slots = {}; sl.forEach(([h, m], i) => { slots[pad(h) + ":" + pad(m)] = { v: pois(day * sh[i] / ss), a: Math.round(290 + 25 * hump(h, 12, 3) + 8 * nrm()) }; });
    out[iso(dt)] = { di: d, slots }; }
  return out;
}
const csvOf = (data, fromW, toW) => { const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע"];
  for (let w = fromW; w < toW; w++) for (let d = 0; d < 6; d++) { const dt = dayAt(w, d), day = data[iso(dt)], ds = pad(dt.getDate()) + "/" + pad(dt.getMonth() + 1) + "/" + dt.getFullYear();
    for (const tm in day.slots) rows.push(`${ds},${tm},${day.slots[tm].v},${day.slots[tm].a}`); }
  return rows.join("\n"); };

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const score = async (app, csv, truth, now) => { const p = await b.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.evaluateOnNewDocument(n => { window.__now = n; const D = Date; class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } } window.Date = FD; }, now);
    await p.goto("file:///" + path.resolve(app).replace(/\\/g, "/"), { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
    const r = await p.evaluate(async (csv, truth) => { state.settings.autoHolidays = false; // the made-up centers have no holidays
      const f = new File([csv], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast");
      const B = [0, 1, 2].map(() => ({ eD: 0, aD: 0, eI: 0, aI: 0 }));
      for (const [ds, wk, slots] of truth) { const m = forecastDay(ds); if (!m) continue; const k = wk <= 1 ? 0 : wk <= 4 ? 1 : 2; let F = 0, A = 0;
        for (const tm in slots) { const fv = (m.get(tm) || { volume: 0 }).volume, av = slots[tm]; F += fv; A += av; B[k].eI += Math.abs(fv - av); B[k].aI += av; }
        B[k].eD += Math.abs(F - A); B[k].aD += A; }
      return { B, vol: typeof hzBest === "function" ? (hzBest("volume") || [state.settings.modelVolume]).join("/") : state.settings.modelVolume, prof: typeof profMode === "function" ? profMode() : "" }; }, csv, truth);
    await p.close(); if (errs.length) throw new Error(errs[0]); return r; };
  const acc = () => [0, 1, 2].map(() => ({ eD: 0, aD: 0, eI: 0, aI: 0 })), add = (T, B) => B.forEach((x, i) => { for (const k in x) T[i][k] += x[k]; });
  const pct = (e, a) => a ? e / a * 100 : NaN, rows = [], tot = { o: acc(), n: acc() };
  for (const sc of SCEN) { const data = gen(sc, SCEN.indexOf(sc) + 1), O = acc(), N = acc(), picks = new Set();
    for (const cut of CUTS) { const csv = csvOf(data, sc.keep ? cut - sc.keep : 0, cut), truth = [];
      for (let w = cut; w < cut + 13; w++) for (let d = 0; d < 6; d++) { const ds = iso(dayAt(w, d)), s = {}; for (const tm in data[ds].slots) s[tm] = data[ds].slots[tm].v; truth.push([ds, w - cut + 1, s]); }
      const now = dayAt(cut, 0).getTime() + 9 * 36e5, o = await score(OLD, csv, truth, now), n = await score(NEW, csv, truth, now);
      add(O, o.B); add(N, n.B); picks.add(n.vol + (n.prof ? " · " + n.prof : "")); }
    add(tot.o, O); add(tot.n, N); rows.push({ sc, O, N, picks: [...picks] }); process.stderr.write("."); }
  await b.close();
  const f = v => v.toFixed(2).padStart(6), line = (name, O, N, extra) => name.padEnd(12) + [0, 1, 2].map(i => `${f(pct(O[i].eD, O[i].aD))} →${f(pct(N[i].eD, N[i].aD))}`).join("  |") + "  ||" + `${f(pct(O[0].eI, O[0].aI))} →${f(pct(N[0].eI, N[0].aI))}` + (extra ? "   " + extra : "");
  console.log("\n" + "".padEnd(12) + "  next week      |  coming month   |  months ahead   ||  half hours, next week      (error %: before → after)");
  rows.forEach(r => console.log(line(r.sc.id, r.O, r.N, r.picks.join("  ;  "))));
  console.log(line("ALL", tot.o, tot.n));
  let win = 0, lose = 0, same = 0; rows.forEach(r => [0, 1, 2].forEach(i => { const d = pct(r.N[i].eD, r.N[i].aD) - pct(r.O[i].eD, r.O[i].aD); if (d < -0.05) win++; else if (d > 0.05) lose++; else same++; }));
  console.log(`\ndaily totals, ${rows.length} centers × 3 horizons: better in ${win}, worse in ${lose}, the same (±0.05) in ${same}`);
})();
