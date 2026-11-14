// 🤖 The model per horizon (next week · the coming month · months ahead), the call-weighted test, and the three added
// volume models (theta · sqrtses · comb). The real page; "today" = 05-Jul-2026, the file ends 02-Jul-2026.
const puppeteer = require("puppeteer-core");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "index.html").replace(/\\/g, "/");

const csv = weeks => { // Sun–Thu, ending 02-Jul-2026; a slow rise + a little noise
  const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע"], d0 = new Date(2026, 5, 28 - (weeks - 1) * 7);
  for (let w = 0; w < weeks; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5), ds = String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/2026";
    for (let h = 8; h < 18; h++) for (const m of ["00", "30"]) rows.push(`${ds},${h}:${m},${Math.round((40 + (h % 5) * 9 + d * 3) * (1 + w * 0.015) + ((w * 5 + h + d) % 4))},${280 + (h % 4) * 10 + (w % 2) * 6}`); }
  return rows.join("\n");
};

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const p = await b.newPage();
  const errs = [], out = [];
  const ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.evaluateOnNewDocument(() => {
    window.__now = new Date(2026, 6, 5, 9, 0).getTime(); const D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } }
    window.Date = FD;
  });
  await p.goto("file:///" + APP, { waitUntil: "load" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  const load = c => p.evaluate(async c => { const f = new File([c], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, c);

  // ---- the added models, on plain series ----
  const m = await p.evaluate(() => { const lin = Array.from({ length: 12 }, (_, i) => 100 + 10 * i), flat = Array(10).fill(400), pk = [400, 400, 400, 400, 900, 400, 400, 400, 400, 400];
    return { th1: thetaForecast(lin, 1), th8: thetaForecast(lin, 8), sqFlat: sqrtForecast(flat), sqPk: sqrtForecast(pk), sesPk: sesFit(pk).l, comb: combForecast(lin, 1),
      parts: [thetaForecast(lin, 1), sqrtForecast(lin), weightedMA4(lin), holtForecast(lin, 1), lin.slice(-8).reduce((a, c) => a + c, 0) / 8], ids: Object.keys(Models.volume) }; });
  ok(m.th1 > 200 && m.th1 < 225 && m.th8 > m.th1, `theta continues half the slope, more for a farther week (${m.th1.toFixed(1)} → ${m.th8.toFixed(1)})`);
  ok(Math.abs(m.sqFlat - 400) < 0.5, "√-scale smoothing returns a flat series' level (" + m.sqFlat.toFixed(2) + ")");
  ok(Math.min(...m.parts) <= m.comb && m.comb <= Math.max(...m.parts) && m.parts.filter(v => v < m.comb).length === 2, "comb = the median of its five methods");
  ok(["theta", "sqrtses", "comb"].every(k => m.ids.includes(k)) && ["ensemble5", "holt_damped", "wavg4", "lastweek", "prophet"].every(k => m.ids.includes(k)), "the three are ADDED to the registry — the existing models are all still there");

  // ---- 5 weeks of history: too little to choose by → the default model stays, no horizon picks ----
  await load(csv(5));
  let s = await p.evaluate(() => ({ by: hzBest("volume"), set: state.settings.modelVolume, n: (rankModels("volume")[0] || { r: {} }).r.n, mf: [1, 3, 9].map(h => modelFor("volume", h)) }));
  ok(s.by === null && s.set === "ensemble5" && s.mf.every(x => x === "ensemble5"), `a short file (${s.n} tested days) doesn't switch the model — ${JSON.stringify(s.mf)}`);

  // ---- 20 weeks: a winner per horizon, each forecast day uses its own ----
  await p.evaluate(() => { localStorage.clear(); }); await p.reload({ waitUntil: "load" });
  await load(csv(20));
  s = await p.evaluate(() => { const by = hzBest("volume"), rk = [0, 1, 2].map(b => rankModels("volume", b));
    const calls = []; for (const k of Object.keys(Models.volume)) { const f = Models.volume[k].fn; Models.volume[k].fn = (ser, h, ctx) => { if (ctx && ctx.interval === "day") calls.push([k, h]); return f(ser, h, ctx); }; }
    state.fcCache.clear(); const near = "2026-07-07", mid = "2026-07-21", far = "2026-09-08"; calls.length = 0;
    const use = ds => { calls.length = 0; state.fcCache.delete(ds); forecastDay(ds); const c = calls[0] || []; return { m: c[0], h: c[1] }; };
    const u = { near: use(near), mid: use(mid), far: use(far) };
    const w = backtestModel("volume", "lastweek", 1), tot = dayTotalsDi(0), manual = (() => { let e = 0, a = 0; for (let d = 0; d < 6; d++) { const t = dayTotalsDi(d); for (let k = 1; k <= 6; k++) { const i = t.length - k; if (i < 4 || !(t[i] > 0)) continue; e += Math.abs(t[i - 1] - t[i]); a += t[i]; } } return e / a * 100; })();
    return { by, tops: rk.map(r => r[0] && r[0].mid), ns: rk.map(r => r[0] && r[0].r.n), sorted: rk.every(r => r.every((x, i) => !i || r[i - 1].r.mape <= x.r.mape)), u, w: w.mape, manual, auto: state._modelAuto.volume, set: state.settings.modelVolume, weeks: tot.length }; });
  ok(s.by && s.by.length === 3 && s.by.every((x, i) => x === s.tops[i]) && s.sorted, `20 weeks: a winner per horizon by the lowest weighted error — ${JSON.stringify(s.by)} (tested days ${JSON.stringify(s.ns)})`);
  ok(Math.abs(s.w - s.manual) < 1e-9, `the volume error = Σ|forecast − actual| ÷ Σactual on the daily totals (${s.w.toFixed(3)}%)`);
  ok(s.u.near.m === s.by[0] && s.u.near.h === 1 && s.u.mid.m === s.by[1] && s.u.mid.h === 3 && s.u.far.m === s.by[2] && s.u.far.h >= 5, `next week → ${s.u.near.m}, in 3 weeks → ${s.u.mid.m}, in ${s.u.far.h} weeks → ${s.u.far.m}`);
  ok(s.set === s.by[0] && s.auto.by.join() === s.by.join(), "Settings shows the next-week winner; the far horizons need no control");

  // ---- a hand-picked model is the user's, for every horizon ----
  s = await p.evaluate(() => { const sel = document.getElementById("setModelVol"); sel.value = "lastweek"; sel.dispatchEvent(new Event("change")); const a = [1, 3, 9].map(h => modelFor("volume", h));
    sel.value = "auto"; sel.dispatchEvent(new Event("change")); return { a, back: [1, 3, 9].map(h => modelFor("volume", h)), by: hzBest("volume") }; });
  ok(s.a.every(x => x === "lastweek") && s.back.join() === s.by.join(), "picked by hand = that model at every horizon; 🤖 gives the horizons back");

  // ---- the 🧪 window: a line per horizon, no extra switch ----
  s = await p.evaluate(() => { setLang("en"); document.getElementById("tab-settings").click(); document.getElementById("backtestBtn").click();
    return { hz: [...document.querySelectorAll("#mList .btHz")].map(x => x.textContent), first: document.querySelector("#mList li").textContent.slice(0, 60), inputs: document.querySelectorAll("#mList input,#mList select,#mList button").length }; });
  ok(s.hz.length >= 3 && /Next week/.test(s.first) && s.hz.some(x => /coming month/.test(x)) && s.hz.some(x => /Months ahead/.test(x)) && s.inputs === 0, "🧪 shows next week · the coming month · months ahead, in words only — " + s.hz[0]);

  // ---- 📋 the interval split, copied for Excel: by half hour or by hour ----
  s = await p.evaluate(async () => { document.getElementById("mClose").click(); document.getElementById("profBtn").click(); const got = [];
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async x => { got.push(x); } }, configurable: true });
    const chips = [...document.querySelectorAll("#profCopy button[data-g]")]; for (const c of chips) { c.click(); await new Promise(r => setTimeout(r, 30)); }
    const grid = x => x.split("\n").map(r => r.split("\t")), sum = (g, c) => g.slice(1).reduce((a, r) => a + (parseFloat(r[c]) || 0), 0), h = grid(got[0]), hr = grid(got[1]);
    return { shown: !document.getElementById("profCopy").hidden, labels: chips.map(c => c.textContent), cols: h[0].length, rows: [h.length - 1, hr.length - 1], first: [h[1][0], h[2][0], hr[1][0], hr[2][0]], cell: h[1][1],
      sums: [sum(h, 1), sum(hr, 1), sum(h, 5), sum(hr, 5)], hourIsTwo: Math.abs(parseFloat(hr[1][1]) - parseFloat(h[1][1]) - parseFloat(h[2][1])) < 0.011, toast: document.getElementById("toast").textContent }; });
  ok(s.shown && s.labels.length === 2 && s.cols === 7 && s.rows[0] === 20 && s.rows[1] === 10 && s.first.join() === "08:00,08:30,08:00,09:00", `two copy chips in sight (${s.labels.join(" · ")}): 20 half hours or 10 hours × 6 weekdays`);
  ok(/^\d+\.\d\d%$/.test(s.cell) && s.sums.every(v => Math.abs(v - 100) < 0.2) && s.hourIsTwo && /Excel/.test(s.toast), `cells are percents (${s.cell}), every weekday adds to 100%, an hour = its two half hours — "${s.toast}"`);

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed");
  await b.close(); process.exit(bad ? 1 : 0);
})();
