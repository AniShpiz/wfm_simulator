/* Lost-day catch-up (↩) on 13 synthetic datasets with a KNOWN true demand for the next 10 working days:
   the shipped forecast with the layer OFF vs ON, error vs the true (noise-free) day total.
   Pass = clean sets unchanged · sets with a real comeback improve · a history with no comeback steps aside.
   Run: node tests/browser/forecast-events.js */
"use strict";
const puppeteer = require("puppeteer-core");
const path = require("path");
const APP = path.join(__dirname, "..", "..", "index.html").replace(/\\/g, "/");
const wait = ms => new Promise(r => setTimeout(r, ms));
// each set: weekday base, trend/day, noise sd, billing uplift, history events, comeback (c,q), a future level shift…
const SETS = [
  { id: 1, name: "clean · steady", noise: 0.04 },
  { id: 2, name: "clean · trend +0.3%/day", noise: 0.04, trend: 0.003 },
  { id: 3, name: "clean · noisy (12%)", noise: 0.12 },
  { id: 4, name: "clean · billing days +25%", noise: 0.04, bill: 0.25 },
  { id: 5, name: "election yesterday · calls come back (½·½)", noise: 0.04, ev: [{ d: -1, f: 0.15 }], c: 0.5, q: 0.5 },
  { id: 6, name: "election yesterday · nothing comes back", noise: 0.04, ev: [{ d: -1, f: 0.15 }], c: 0, q: 0.5 },
  { id: 7, name: "election a week ago · came back", noise: 0.04, ev: [{ d: -6, f: 0.15 }], c: 0.6, q: 0.5 },
  { id: 8, name: "closed day 3 days ago (no rows) · came back", noise: 0.04, ev: [{ d: -3, f: 0, closed: true }], c: 0.5, q: 0.5 },
  { id: 9, name: "4 past lost days + yesterday · come back (0.6·0.4)", noise: 0.04, ev: [{ d: -100, f: 0.2 }, { d: -75, f: 0.1 }, { d: -50, f: 0.2 }, { d: -25, f: 0.15 }, { d: -1, f: 0.15 }], c: 0.6, q: 0.4 },
  { id: 10, name: "4 past lost days + yesterday · nothing comes back", noise: 0.04, ev: [{ d: -100, f: 0.2 }, { d: -75, f: 0.1 }, { d: -50, f: 0.2 }, { d: -25, f: 0.15 }, { d: -1, f: 0.15 }], c: 0, q: 0.5 },
  { id: 11, name: "level shift +20% for 8 days (no anomaly)", noise: 0.04, shift: { from: -8, f: 1.2 } },
  { id: 12, name: "outage week at 65% a month ago", noise: 0.04, low: { from: -35, to: -29, f: 0.65 } },
  { id: 13, name: "spike day yesterday (+150%)", noise: 0.04, ev: [{ d: -1, f: 2.5 }], c: 0, q: 0.5 },
];
(async () => {
  const b = await puppeteer.launch({ protocolTimeout: 600000, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  const out = [];
  for (const S of SETS) for (const cu of [false, true]) {
    await p.goto("file:///" + APP, { waitUntil: "load" });
    await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
    const r = await p.evaluate(async (S, cu) => {
      state.settings.cuOn = cu; state.settings.autoHolidays = false; // isolate: the synthetic calendar has no Hebrew holidays
      let seed = S.id * 9973; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 1.0; };
      const pad2 = n => String(n).padStart(2, "0"), isoD = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, fmt = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
      const END = new Date(2026, 9, 27); // yesterday = the last actual day
      // working-day index relative to END (0 = END, −1 = the working day before, +1 = the next one…)
      const days = []; for (let d = -150; d <= 16; d++) { const dt = new Date(END); dt.setDate(END.getDate() + d); if (dt.getDay() !== 6) days.push(dt); }
      const i0 = days.findIndex(d => isoD(d) === isoD(END)), W = d => days[i0 + d];
      const BASE = [4200, 4000, 3900, 3800, 3700, 1500], fullRef = 3900;
      const expDay = (dt, k) => { let v = BASE[dt.getDay()] * (1 + (S.trend || 0) * k); const dom = dt.getDate(); if (S.bill && dom >= 8 && dom <= 14) v *= 1 + S.bill;
        if (S.shift && k >= S.shift.from) v *= S.shift.f; if (S.low && k >= S.low.from && k <= S.low.to) v *= S.low.f; return v; };
      const total = new Map(), closed = new Set(); // expected (noise-free) totals, comeback included
      days.forEach((dt, j) => total.set(isoD(dt), expDay(dt, j - i0)));
      for (const e of S.ev || []) { const dt = W(e.d), ds = isoD(dt), normal = total.get(ds), lost = normal * (1 - e.f);
        total.set(ds, normal * e.f); if (e.closed) closed.add(ds);
        for (let k = 1; k <= 8; k++) { const d2 = W(e.d + k); if (!d2) break; const size = Math.min(1, BASE[d2.getDay()] / fullRef);
          total.set(isoD(d2), total.get(isoD(d2)) + lost * (S.c || 0) * (1 - (S.q || 0.5)) * Math.pow(S.q || 0.5, k - 1) * size); } }
      // the file: history only (≤ END), with noise, spread over a fixed intraday shape
      const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע,נציגים,שיחות נענות"];
      for (const dt of days) { const ds = isoD(dt); if (ds > isoD(END) || closed.has(ds)) continue;
        const di = dt.getDay(), slots = []; for (let h = 8; h < (di === 5 ? 13 : 18); h++) for (const m of ["00", "30"]) slots.push(h + ":" + m);
        const shape = slots.map((_, i) => 1 + 0.6 * Math.sin(Math.PI * (i + 0.5) / slots.length)), sh = shape.reduce((a, b) => a + b, 0);
        const T = total.get(ds) * Math.max(0.2, 1 + S.noise * gauss());
        slots.forEach((tm, i) => { const v = Math.max(0, Math.round(T * shape[i] / sh)); rows.push(`${fmt(dt)},${tm},${v},300,40,${Math.round(v * 0.85)}`); }); }
      if (closed.size) state.settings.customHol = [...closed].map((d, i) => ({ id: i + 1, from: d, to: d, name: "closed", lvl: "closed" }));
      ingestRows(await bytesToGrid(new TextEncoder().encode(rows.join("\n")).buffer), "forecast");
      await new Promise(r => setTimeout(r, 300));
      // forecast vs truth over the next 10 working days
      const res = []; for (let k = 1; k <= 10; k++) { const dt = W(k), ds = isoD(dt); const m = forecastDay(ds); if (!m) continue; let f = 0; for (const x of m.values()) f += x.volume; res.push({ ds, f, a: total.get(ds) }); }
      const ape = res.map(x => Math.abs(x.f - x.a) / x.a), bias = res.reduce((s, x) => s + x.f, 0) / res.reduce((s, x) => s + x.a, 0) - 1;
      const first3 = res.slice(0, 3).map(x => Math.abs(x.f - x.a) / x.a);
      return { n: res.length, mape: ape.reduce((a, b) => a + b, 0) / ape.length * 100, mape3: first3.reduce((a, b) => a + b, 0) / first3.length * 100, bias: bias * 100,
        worst: Math.max(...ape) * 100, guard: !!(state.cuCheck && state.cuCheck.guard), par: state.cuParam ? Math.round(state.cuParam.c * 100) + "/" + Math.round(state.cuParam.q * 100) : "-",
        chk: state.cuCheck && state.cuCheck.n ? state.cuCheck.n + ": " + state.cuCheck.without.toFixed(1) + "→" + state.cuCheck.with.toFixed(1) : "-" };
    }, S, cu);
    out.push({ id: S.id, name: S.name, cu, ...r });
  }
  // the table: per set, OFF vs ON
  const f1 = v => v.toFixed(1).padStart(5);
  console.log("set | dataset                                              | 10-day MAPE off → on | first 3 days off → on | bias off → on | learned c/q · history check");
  for (const S of SETS) { const a = out.find(o => o.id === S.id && !o.cu), c = out.find(o => o.id === S.id && o.cu);
    console.log(`${String(S.id).padStart(3)} | ${S.name.padEnd(52)} | ${f1(a.mape)} → ${f1(c.mape)}       | ${f1(a.mape3)} → ${f1(c.mape3)}        | ${f1(a.bias)} → ${f1(c.bias)} | ${c.par}${c.guard ? " (stepped aside)" : ""} · ${c.chk}`); }
  console.log("page errors:", errs.length ? errs.join(" | ") : "none");
  const get = (id, cu) => out.find(o => o.id === id && o.cu === cu), fails = [];
  for (const id of [1, 2, 3, 4, 11, 12, 13]) if (Math.abs(get(id, true).mape - get(id, false).mape) > 0.05) fails.push("set " + id + " changed without a lost day");
  for (const id of [5, 7, 8, 9]) if (!(get(id, true).mape < get(id, false).mape)) fails.push("set " + id + " did not improve");
  if (!get(10, true).guard) fails.push("set 10: a history without comeback did not step aside");
  if (errs.length) fails.push("page errors");
  console.log(fails.length ? "FAIL — " + fails.join(" · ") : "PASS — clean sets unchanged, comeback sets improve, the guard steps aside");
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
