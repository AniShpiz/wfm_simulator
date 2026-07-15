const puppeteer = require("puppeteer-core");
const fs = require("fs");
const APP = "c:/Users/Owner/OneDrive - post.bgu.ac.il/שולחן העבודה/Tikshoov/wfm_git/wfm_simulator/index.html";
const XLS = "C:/Users/Owner/OneDrive - post.bgu.ac.il/שולחן העבודה/Tikshoov/wfm_git/wfm_simulator/סידור עבודה מושלם שירות שבוע 27 עדכני.xls";

const fcCSV = (() => {
  const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע"];
  for (const d of ["05/07/2026","06/07/2026","07/07/2026","08/07/2026","09/07/2026","10/07/2026"])
    for (let h = 8; h < 20; h++) for (const m of ["00","30"]) rows.push(`${d},${h}:${m},${40+(h%5)*7},295`);
  return rows.join("\n");
})();
const crsCSV = "שם קורס,תאריך התחלה,משך בימים,כמות חניכים,אחוז הסמכה\nקורס יולי,20/07/2026,21,12,80\nקורס אוגוסט,46600,14,8,\n";

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.goto("file:///" + APP, { waitUntil: "load" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  const R = {};

  // 0. nav labels + footer logo
  R.nav = await p.evaluate(() => ({
    wf: document.getElementById("tab-workforce").textContent, sch: document.getElementById("tab-scheduler").textContent,
    logo: (document.getElementById("footerLogo").src || "").slice(0, 22)
  }));

  // 1. gating BEFORE iron: scheduler blocked, cards grayed
  await p.click("#tab-scheduler");
  R.gateBefore = await p.evaluate(() => ({
    runDisabled: document.getElementById("schRun").disabled,
    gateShown: document.getElementById("schGate").style.display !== "none"
  }));
  await p.click("#tab-workforce");
  R.gatedCards = await p.evaluate(() => ({
    impact: document.getElementById("wfImpactCard").classList.contains("ironGated"),
    val: document.getElementById("wfValCard").classList.contains("ironGated"),
    rosterCardOnWf: !!document.querySelector("#page-workforce #rosterWrap")
  }));

  // 2. ingest forecast + workbook
  const ing = async (b64, text, hint) => p.evaluate(async (b64x, tx, h) => {
    let buf;
    if (tx != null) buf = new TextEncoder().encode(tx).buffer;
    else { const bin = atob(b64x); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); buf = u.buffer; }
    try { const s = ingestRows(await bytesToGrid(buf), h); return { ok: true, type: s.type }; }
    catch (e) { return { ok: false, err: e.code || e.message }; }
  }, b64, text, hint);
  R.fc = await ing(null, fcCSV, "forecast");
  R.wb = await ing(fs.readFileSync(XLS).toString("base64"), null, "roster");

  // 3. workforce after iron: ungated, impact matrix from barzel, stars, metric note, drill
  await p.click("#tab-workforce");
  await p.evaluate(() => renderWorkforce());
  R.wfAfter = await p.evaluate(() => ({
    impactGated: document.getElementById("wfImpactCard").classList.contains("ironGated"),
    impactRows: document.querySelectorAll("#wfImpact tbody tr").length,
    metricNote: document.getElementById("wfImpactMetric").textContent.slice(0, 60),
    stars: document.getElementById("wfImpactStars").textContent.slice(0, 80),
    sampleCell: (document.querySelector("#wfImpact tbody td.tier-good,#wfImpact tbody td.tier-warn,#wfImpact tbody td.tier-bad") || {}).textContent
  }));
  // drill-down: click first treemap rect
  await p.evaluate(() => { document.querySelector("#wfTreemap rect[data-seg]").dispatchEvent(new Event("click")); });
  R.drill = await p.evaluate(() => ({
    title: (document.querySelector("#wfDrill b") || {}).textContent,
    bars: document.querySelectorAll("#wfDrill div[style*='flex']").length
  }));
  // switch drill dim to skill
  await p.evaluate(() => { const s = document.getElementById("wfDrillDim"); s.value = "skill"; s.dispatchEvent(new Event("change")); });
  R.drillSkill = await p.evaluate(() => (document.querySelector("#wfDrill b") || {}).textContent);

  // 4. metric-awareness: switch primary metric to AR → note changes
  const noteBefore = R.wfAfter.metricNote;
  await p.evaluate(() => { state.settings.primaryMetric = "ar"; renderWorkforce(); });
  R.metricSwitch = await p.evaluate(() => document.getElementById("wfImpactMetric").textContent.slice(0, 60));
  await p.evaluate(() => { state.settings.primaryMetric = "tsf"; });

  // 5. scheduler: enabled now, run, Tikshuv structure + gaps matrix
  await p.click("#tab-scheduler");
  await p.evaluate(() => renderScheduler());
  R.schedGateAfter = await p.evaluate(() => document.getElementById("schRun").disabled);
  await p.evaluate(async () => { await runScheduler(); });
  R.sched = await p.evaluate(() => ({
    outHeads: [...document.querySelectorAll("#schOutWrap thead th")].map(x => x.textContent).join("|"),
    outRows: document.querySelectorAll("#schOutWrap tbody tr").length,
    gapIsMatrix: !!document.querySelector("#schGapWrap tbody th"),
    gapCols: document.querySelectorAll("#schGapWrap thead th").length,
    banner: document.getElementById("schBanner").textContent.slice(0, 60)
  }));
  R.csvRow = await p.evaluate(() => state.optimizedOutput.length ? tikshuvRow(state.optimizedOutput[0]).join("|") : "none");

  // 6. course gantt upload
  R.crs = await p.evaluate(async (csv) => {
    const before = state.cohorts.length;
    const grid = csvToGrid(csv);
    const n = parseCoursesGrid(grid);
    return { n, added: state.cohorts.length - before, sample: state.cohorts[state.cohorts.length - 1] };
  }, crsCSV);

  // 7. matrix calibration note + audit
  await p.click("#tab-matrix");
  await p.evaluate(() => renderMatrix());
  R.calib = await p.evaluate(() => ({
    note: document.getElementById("mxCalibNote").textContent.slice(0, 70),
    audit: state.fcAudit
  }));

  console.log(JSON.stringify(R, null, 1));
  if (errs.length) console.log("ERRORS:", errs.slice(0, 8));
  await b.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
