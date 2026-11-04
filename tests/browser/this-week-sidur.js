// 📅 This week's sidur kept for the matrix + the iron / Friday memories under alternating uploads — the real page, the real .xls.
// "Today" is pinned to Tue 07-Jul-2026 (week 27 = the real workbook's week); week 28 = the same file, dates +7, one iron change.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "index.html").replace(/\\/g, "/");
const XLS = path.join(ROOT, "סידור עבודה מושלם שירות שבוע 27 עדכני.xls");

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
    const FIX = new Date(2026, 6, 7, 11, 0).getTime(), D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } }
    window.Date = FD;
  });
  await p.goto("file:///" + APP, { waitUntil: "load" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });

  await p.evaluate(async csv => { const f = new File([csv], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, fcCSV);
  const b64 = fs.readFileSync(XLS).toString("base64");
  // wk 27 = the file as is; wk 28 = dates +7 in the roster sheet, and rep #0 loses their Sunday in the iron
  await p.evaluate(async b64 => {
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    const res = await bytesToGrid(buf);
    const clone = g => g.map(r => r ? r.slice() : r);
    const w27 = res.grids.map(s => ({ name: s.name, grid: clone(s.grid || s) }));
    const w28 = res.grids.map(s => ({ name: s.name, grid: clone(s.grid || s) }));
    const iron = w28.find(s => /ברזל|iron|בסיס/i.test(s.name)), ros = w28.find(s => s !== iron && /סידור|roster|actual/i.test(s.name));
    const hd = findHeader(ros.grid);
    for (let r = hd.row + 1; r < ros.grid.length; r++) { const row = ros.grid[r]; if (!row) continue; const v = row[hd.map.date];
      if (typeof v === "number") row[hd.map.date] = v + 7; else { const ds = normDateAny(v); if (ds) row[hd.map.date] = addDays(ds, 7); }
      if (r % 4 === 0) { row[hd.map.start] = ""; row[hd.map.end] = ""; } } // week 28 is lighter: every 4th shift not filled yet
    const ih = findHeader(iron.grid); let first = null;
    for (let r = ih.row + 1; r < iron.grid.length; r++) { const row = iron.grid[r]; if (!row) continue; const n = String(row[ih.map.name] ?? "").trim();
      if (!n) continue; first = first || n; if (n === first && dayIdxOf(row[ih.map.day]) === 0) { row[ih.map.start] = ""; row[ih.map.end] = ""; } }
    // w26 = LAST week: dates −7, and its (older) iron has no Tuesday at all
    const w26 = res.grids.map(s => ({ name: s.name, grid: clone(s.grid || s) }));
    const i6 = w26.find(s => /ברזל|iron|בסיס/i.test(s.name)), r6 = w26.find(s => s !== i6 && /סידור|roster|actual/i.test(s.name)), h6 = findHeader(r6.grid), j6 = findHeader(i6.grid);
    for (let r = h6.row + 1; r < r6.grid.length; r++) { const row = r6.grid[r]; if (!row) continue; const v = row[h6.map.date];
      if (typeof v === "number") row[h6.map.date] = v - 7; else { const ds = normDateAny(v); if (ds) row[h6.map.date] = addDays(ds, -7); } }
    for (let r = j6.row + 1; r < i6.grid.length; r++) { const row = i6.grid[r]; if (row && dayIdxOf(row[j6.map.day]) === 2) { row[j6.map.start] = ""; row[j6.map.end] = ""; } }
    window.__wb = { w27, w28, w26, first };
  }, b64);
  const load = wk => p.evaluate(wk => { const g = window.__wb[wk].map(s => ({ name: s.name, grid: s.grid.map(r => r ? r.slice() : r) })); ingestSuccess(ingestRows({ grids: g }, "roster"), "roster"); }, wk);
  const snap = () => p.evaluate(() => {
    const capAt = ds => { const d = computeDay(ds); return d ? d.rows.filter(r => r.rec && !r.closed).reduce((s, r) => s + r.sched, 0) : null; };
    const chip = document.getElementById("sidurChip");
    return { kept: state.nowSidur && state.nowSidur.wk, chip: chip.textContent, keepBadge: !!chip.querySelector(".scKeep"),
      cap27: capAt("2026-07-07"), cap28: capAt("2026-07-14"), ironWks: (state.settings.ironHist || []).map(h => h.wk),
      ic: (() => { const C = ironChanges(); return C ? C.from + "→" + C.to + ":" + C.list.map(x => x.n + x.kinds.join("")).join(",") : null; })(),
      fri: JSON.stringify(state.settings.friHist), stored: !!localStorage.getItem("wfmSimNow") };
  });

  await load("w27"); const a = await snap();
  ok(a.kept === "2026-07-05", "wk 27 loaded → kept as this week's sidur (" + a.kept + ")");
  ok(!a.keepBadge, "the chip says nothing extra while this week's sidur is the loaded one");
  await load("w28"); const b1 = await snap();
  ok(b1.kept === "2026-07-05" && b1.keepBadge, "wk 28 loaded → week 27 still kept, the chip shows it: " + b1.chip);
  ok(b1.cap27 === a.cap27 && a.cap27 > 0, "a week-27 day keeps the week-27 sidur in the matrix (" + a.cap27 + " = " + b1.cap27 + ")");
  ok(b1.cap28 > 0 && b1.cap28 < a.cap27, "a week-28 day reads the loaded (lighter) sidur (" + b1.cap28 + " < " + a.cap27 + ")");
  ok(b1.ic && b1.ic.startsWith("2026-07-05→2026-07-12"), "iron changes: week 27 → 28 (" + (b1.ic || "").slice(0, 80) + ")");
  for (let i = 0; i < 2; i++) { await load("w27"); await load("w28"); }
  const c = await snap();
  ok(JSON.stringify(c.ironWks) === JSON.stringify(b1.ironWks), "iron memory after 27/28/27/28: still " + c.ironWks.join(", "));
  ok(c.ic === b1.ic, "iron changes: the same answer, not flipped");
  ok(c.fri === b1.fri, "Friday memory unchanged by the alternation");
  ok(c.cap27 === a.cap27 && c.cap28 === b1.cap28, "matrix capacity unchanged by the alternation");
  await load("w27"); const d = await snap();
  ok(d.ic === null, "wk 27 loaded again: its iron has no earlier week → the iron-changes card is silent (not reversed)");
  await load("w28");

  // 👥 who is on in a week-27 half hour = this week's kept sidur
  const who = await p.evaluate(() => { const W = whoOn("2026-07-07", "10:00"); return W && { src: W.src, n: W.reps.length }; });
  ok(who && who.src === "now" && who.n > 0, "👥 who-on for a week-27 half hour reads the kept sidur (" + JSON.stringify(who) + ")");
  const brk = await p.evaluate(() => { const bp = breakPlan("2026-07-07"), e = brkEntitle("2026-07-07"); return { sidur: bp.sidur, people: bp.people, ent: e ? e.length : 0 }; });
  ok(brk.sidur && brk.ent > 0, "☕ breaks on a week-27 day follow the kept sidur (" + JSON.stringify(brk) + ")");

  // last week's file loaded to look back: the future keeps the newest iron (week 28's), this week keeps its sidur
  const futTue = () => p.evaluate(() => { const d = computeDay("2026-07-21"); return d ? d.rows.filter(r => r.rec && !r.closed).reduce((s, r) => s + r.sched, 0) : null; });
  const fut28 = await futTue();
  await load("w26");
  const l = await p.evaluate(() => ({ kept: state.nowSidur && state.nowSidur.wk, ironWk: state.iron.wk, tip: document.getElementById("sidurChip").title, ic: ironChanges() }));
  const fut26 = await futTue(), cap27b = (await snap()).cap27;
  ok(fut28 > 0 && fut26 === fut28, "week 26 loaded: a week-29 Tuesday keeps week 28's iron (" + fut28 + " = " + fut26 + "), not week 26's (no Tuesday)");
  ok(l.kept === "2026-07-05" && cap27b === a.cap27, "week 26 loaded: this week stays on its kept sidur (" + cap27b + ")");
  ok(/28/.test(l.tip) && l.ic === null, "the chip's hover names the newer iron; the iron-changes card is silent for week 26");
  await load("w28");

  // refresh: the copy comes back from this computer
  await p.reload({ waitUntil: "load" });
  const e = await snap();
  ok(e.kept === "2026-07-05" && e.keepBadge && e.cap27 === a.cap27, "after a refresh: still kept, same week-27 capacity (" + e.cap27 + ")");
  // the badge → this week in the matrix
  await p.evaluate(() => document.querySelector("#sidurChip .scKeep").click());
  const f = await p.evaluate(() => ({ wk: document.getElementById("weekSelect").value, page: document.getElementById("page-matrix").classList.contains("active") || getComputedStyle(document.getElementById("page-matrix")).display !== "none" }));
  ok(f.wk === "2026-07-05" && f.page, "click 'this week' on the chip → the matrix on week 27 (" + JSON.stringify(f) + ")");

  // the week ends: Sunday 12-Jul with week 28 loaded → week 28 becomes this week's copy, week 27 is gone
  await p.evaluate(() => keepNowSidur("2026-07-12"));
  const g = await p.evaluate(() => ({ kept: state.nowSidur && state.nowSidur.wk, days27: state.nowSidur ? [...state.nowSidur.dates].filter(x => x < "2026-07-12").length : -1 }));
  ok(g.kept === "2026-07-12" && g.days27 === 0, "week over → the copy moves to week 28, nothing of week 27 left (" + JSON.stringify(g) + ")");

  ok(!errs.length, "no page errors " + errs.join(" | "));
  console.log(out.join("\n"));
  await b.close();
  process.exit(out.some(l => l.startsWith("not ok")) ? 1 : 0);
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
