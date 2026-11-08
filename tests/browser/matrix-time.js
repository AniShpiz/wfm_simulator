// ⏱ The matrix's past · now · ahead marks on each cell (mxTimeMarks) — the real page, a movable clock.
// "Now" starts at Tue 07-Jul-2026 10:40: the half hours already gone are washed out, 10:30 carries the ring, the rest is as is.
const puppeteer = require("puppeteer-core");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "index.html").replace(/\\/g, "/");

const fcCSV = (() => {
  const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע"];
  for (let d = 5; d <= 17; d++) { if (d === 11) continue;
    for (let h = 8; h < 20; h++) for (const m of ["00", "30"]) rows.push(`${String(d).padStart(2, "0")}/07/2026,${h}:${m},${40 + (h % 5) * 7},295`); }
  return rows.join("\n");
})();

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const p = await b.newPage();
  const errs = [], out = [];
  const ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.evaluateOnNewDocument(() => {
    window.__now = new Date(2026, 6, 7, 10, 40).getTime(); const D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } }
    window.Date = FD;
  });
  await p.goto("file:///" + APP, { waitUntil: "load" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  await p.evaluate(async csv => { const f = new File([csv], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, fcCSV);
  const look = () => p.evaluate(() => {
    const cls = (ds, tm) => { const td = document.querySelector(`#matrixTable td[data-ds="${ds}"]${tm ? `[data-tm="${tm}"]` : ":not([data-tm])"}`); return td ? (td.classList.contains("mxNow") ? "now" : td.classList.contains("mxPast") ? "past" : "ahead") : "none"; };
    const nw = [...document.querySelectorAll("#matrixTable td.mxNow")];
    return { cls: { sun8: cls("2026-07-05", "08:00"), mon17: cls("2026-07-06", "17:00"), monSum: cls("2026-07-06"), tueSum: cls("2026-07-07"),
        tue10: cls("2026-07-07", "10:00"), tue1030: cls("2026-07-07", "10:30"), tue11: cls("2026-07-07", "11:00"), wed8: cls("2026-07-08", "08:00") },
      now: nw.map(td => td.dataset.ds + " " + td.dataset.tm + " " + td.style.getPropertyValue("--nowP")),
      hd: [...document.querySelectorAll("#matrixTable th.nowHd")].map(x => x.textContent),
      leg: ["mxNowLeg", "mxPastLeg"].map(id => getComputedStyle(document.getElementById(id)).display) };
  });
  await p.evaluate(() => { document.getElementById("tab-matrix").click(); state.week = sundayOf(iso(new Date())); renderMatrix(); });

  let s = await look();
  ok(s.now.length === 1 && s.now[0] === "2026-07-07 10:30 33%", "now = Tue 10:30, a third of it gone " + JSON.stringify(s.now));
  ok(s.hd.length === 1 && s.hd[0] === "10:30", "the 10:30 row header carries the now bar " + JSON.stringify(s.hd));
  ok(s.cls.sun8 === "past" && s.cls.mon17 === "past" && s.cls.tue10 === "past", "the days and half hours already gone are washed out " + JSON.stringify(s.cls));
  ok(s.cls.tue11 === "ahead" && s.cls.wed8 === "ahead", "what is ahead stays as is");
  ok(s.cls.monSum === "past" && s.cls.tueSum === "ahead", "the daily row: a day gone = washed out, today = as is");
  ok(s.leg[0] !== "none" && s.leg[1] !== "none", "both marks have their key");

  // the clock moves: the marks follow without a re-render
  const same = await p.evaluate(() => { window.__keep = document.querySelector('#matrixTable td[data-ds="2026-07-07"][data-tm="10:30"]');
    window.__now = new Date(2026, 6, 7, 11, 5).getTime(); mxTimeMarks();
    return window.__keep === document.querySelector('#matrixTable td[data-ds="2026-07-07"][data-tm="10:30"]'); });
  s = await look();
  ok(same, "a minute tick re-marks the cells in place (no re-render)");
  ok(s.now[0] === "2026-07-07 11:00 17%" && s.cls.tue1030 === "past", "11:05 → the ring moved to 11:00, 10:30 is gone " + JSON.stringify(s.now));

  // a new day: today's column moves (a re-render)
  await p.evaluate(() => { window.__now = new Date(2026, 6, 8, 8, 10).getTime(); mxTimeMarks(); });
  s = await look();
  ok(s.now[0] === "2026-07-08 08:00 33%" && s.cls.tue11 === "past", "the next morning → now = Wed 08:00, all of Tuesday gone " + JSON.stringify(s.now));
  ok(await p.evaluate(() => !!document.querySelector('#matrixTable td.todayCol[data-ds="2026-07-08"]')), "today's column frame moved to Wednesday");

  // another week: silence — no marks, no key
  const other = await p.evaluate(() => { state.week = addDays(state.week, 7); renderMatrix();
    return [document.querySelectorAll("#matrixTable .mxPast,#matrixTable .mxNow,#matrixTable .nowHd").length, ...["mxNowLeg", "mxPastLeg"].map(id => getComputedStyle(document.getElementById(id)).display)]; });
  ok(other[0] === 0 && other[1] === "none" && other[2] === "none", "a week without today: no marks, no key " + JSON.stringify(other));

  ok(!errs.length, "no page errors " + errs.join(" | "));
  console.log(out.join("\n"));
  await b.close();
  process.exit(out.some(l => l.startsWith("not ok")) ? 1 : 0);
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
