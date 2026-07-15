/* Forecast-pipeline audit in the REAL app (headless Edge):
   learning series, calibration, measured-vs-model, exceptions, policy decay,
   injections, outlier guard. Run: node tests/browser/forecast-logic.js */
"use strict";
const puppeteer = require("puppeteer-core");
const path = require("path");
const APP = path.join(__dirname, "..", "..", "index.html").replace(/\\/g, "/");

// 4 weeks of PERFECTLY constant history ending 2026-07-10:
// volume 60, AHT 300s, 10 agents, 42 answered → measured AR = 0.70 everywhere
function historyCSV() {
  const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע,נציגים,שיחות נענות"];
  const d0 = new Date("2026-06-14T00:00:00");
  for (let d = 0; d < 27; d++) {
    const dt = new Date(d0); dt.setDate(d0.getDate() + d);
    if (dt.getDay() === 6) continue; // Saturday closed
    const ds = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    const lastH = dt.getDay() === 5 ? 13 : 18;
    for (let h = 8; h < lastH; h++) for (const m of ["00", "30"])
      rows.push(`${ds},${h}:${m},60,300,10,42`);
  }
  return rows.join("\n");
}

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); };

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("file:///" + APP, { waitUntil: "load" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });

  const r = await p.evaluate(async (csv) => {
    const out = {};
    const ingest = async (text, hint) => ingestRows(await bytesToGrid(new TextEncoder().encode(text).buffer), hint);
    await ingest(csv, "forecast");

    // 1. calibration: Erlang with 10 agents over-predicts vs measured 0.70 → κ must pull DOWN
    out.calib = state.calib;

    // 2. historical cells show the MEASURED answer rate, never the model
    const hist = computeDay("2026-07-07");
    const hrow = hist.rows.find(x => x.rec && !x.nodata);
    out.histAR = hrow.perf.ar;
    out.histIsForecast = !!hist.forecast;

    // 3. forecast day: exists, model-driven, volume tracks the constant history
    const fc = computeDay("2026-07-14");
    out.fcIsForecast = !!fc.forecast;
    const frow = fc.rows.find(x => x.rec && !x.nodata && !x.closed);
    out.fcVolume = frow ? frow.rec.volume : null;
    out.fcReq = frow ? frow.req : null;
    out.fcPerfBounded = fc.rows.filter(x => x.perf).every(x =>
      x.perf.ar >= 0 && x.perf.ar <= 1 && x.perf.tsf >= 0 && x.perf.tsf <= 1);

    // 4. exception paint zeroes a day without destroying neighbours
    state.exceptions.add("2026-07-15");
    memo.clear(); state.fcCache.clear();
    const exc = computeDay("2026-07-15");
    out.excAllZero = exc.rows.filter(x => !x.closed).every(x => x.exc && x.rec.volume === 0);
    const notExc = computeDay("2026-07-14");
    out.neighbourAlive = notExc.rows.some(x => x.rec && x.rec.volume > 0);
    state.exceptions.delete("2026-07-15");

    // 5. policy decay honours maxDrops and floor
    state.policy = { enabled: true, maxDrops: 2, gapHours: 2, floor: 75 };
    state.policyApplied = true; memo.clear(); state.fcCache.clear();
    const pol = computeDay("2026-07-14");
    const drops = pol.rows.filter(x => x.dropped).length;
    out.polDrops = drops;
    out.polFloorOk = pol.rows.filter(x => x.dropped).every(x => x.reqEff >= 0);
    state.policy.enabled = false; memo.clear(); state.fcCache.clear();

    // 6. injections add exactly their headcount inside the window
    const base = computeDay("2026-07-14").rows.find(x => x.tm === "12:00");
    state.injections.push({ profile: "custom", count: 5, windows: [{ day: 2, start: "12:00", end: "17:00" }] });
    memo.clear(); state.fcCache.clear();
    const boosted = computeDay("2026-07-14").rows.find(x => x.tm === "12:00"); // 2026-07-14 is Tuesday (day 2)
    out.injDelta = boosted.sched - base.sched;
    state.injections.length = 0; memo.clear(); state.fcCache.clear();

    // 7. outlier guard: one insane historical day must not explode the forecast
    const before = computeDay("2026-07-14").rows.find(x => x.tm === "10:00").rec.volume;
    const crazy = state.days.get("2026-06-23");
    for (const rec of crazy.values()) rec.volume *= 20;
    rebuildLearningSeries(); memo.clear(); state.fcCache.clear();
    const after = computeDay("2026-07-14").rows.find(x => x.tm === "10:00").rec.volume;
    out.outlierBefore = before; out.outlierAfter = after;

    // 8. forecast audit is quiet on clean data
    auditForecast(); out.audit = state.fcAudit;
    return out;
  }, historyCSV());

  check("calibration pulls the model DOWN toward measured AR (κ<1)", r.calib > 0.2 && r.calib < 1, "κ=" + r.calib);
  check("historical cell shows measured AR 0.70 exactly", Math.abs(r.histAR - 0.7) < 0.005, "ar=" + r.histAR);
  check("historical day is not marked forecast", !r.histIsForecast);
  check("future day is model-driven forecast", r.fcIsForecast);
  check("forecast volume tracks constant history (60 ±20%)", r.fcVolume > 48 && r.fcVolume < 72, "vol=" + r.fcVolume);
  check("forecast requires agents (req>0)", r.fcReq > 0, "req=" + r.fcReq);
  check("all model outputs bounded to [0,1]", r.fcPerfBounded);
  check("exception day zeroes out", r.excAllZero);
  check("neighbour day untouched by exception", r.neighbourAlive);
  check("policy decay never exceeds maxDrops=2", r.polDrops <= 2, "drops=" + r.polDrops);
  check("policy floor keeps reqEff sane", r.polFloorOk);
  check("injection of 5 raises the window by exactly 5", r.injDelta === 5, "Δ=" + r.injDelta);
  check("outlier day (×20) does not explode the forecast (≤1.6× base)",
    r.outlierAfter <= r.outlierBefore * 1.6, `${r.outlierBefore} → ${r.outlierAfter}`);
  check("audit quiet on clean data", r.audit.imp === 0 && r.audit.aht === 0);
  check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));

  let fails = 0;
  for (const c of checks) { if (!c.ok) fails++; console.log(`${c.ok ? "ok " : "NOT OK"} - ${c.name}${c.detail ? "  [" + c.detail + "]" : ""}`); }
  console.log(`\n${checks.length - fails}/${checks.length} passed`);
  await b.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
