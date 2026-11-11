// 📄 The report's "are the courses enough?" — a Gantt short of the need, then the same Gantt with the plan's additions applied
// (as a planner loads it before the meeting). The "what to add" table shows only while there is something to add; the
// lead keeps "provided we keep to the recruiting Gantt" while courses are still ahead. Today = Wed 11-Nov-2026.
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), APP = path.join(ROOT, "index.html").replace(/\\/g, "/");
const XLS = path.join(ROOT, "סידור עבודה מושלם שירות שבוע 27 עדכני.xls"), pad = n => String(n).padStart(2, "0");
const fc = (() => { const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע,נציגים,שיחות נענות"]; const d = new Date(2026, 6, 1);
  for (; d < new Date(2027, 1, 28); d.setDate(d.getDate() + 1)) { const di = d.getDay(); if (di === 6) continue; const past = d < new Date(2026, 10, 4);
    for (let h = 8; h < (di === 5 ? 13 : 20); h++) for (const m of ["00", "30"]) { const v = 120 + (h % 6) * 25; rows.push(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()},${h}:${m},${v},300,${past ? 40 : ""},${past ? Math.round(v * .85) : ""}`); } }
  return rows.join("\n"); })();
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const p = await b.newPage(); const errs = [], out = [], ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.evaluateOnNewDocument(() => { const FIX = new Date(2026, 10, 11, 11, 0).getTime(), D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } } window.Date = FD; });
  await p.goto("file:///" + APP, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
  await p.evaluate(() => setLang("he"));
  await p.evaluate(async csv => { const f = new File([csv], "fc.csv"); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, fc);
  const b64 = fs.readFileSync(XLS).toString("base64");
  await p.evaluate(async b64 => { const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer; const res = await bytesToGrid(buf);
    const g = res.grids.map(s => ({ name: s.name, grid: (s.grid || s).map(r => r ? r.slice() : r) })), iron = g.find(s => /ברזל/.test(s.name)), ros = g.find(s => s !== iron && /סידור/.test(s.name)), hd = findHeader(ros.grid);
    for (let r = hd.row + 1; r < ros.grid.length; r++) { const row = ros.grid[r]; if (row && typeof row[hd.map.date] === "number") row[hd.map.date] += 17 * 7; }
    ingestSuccess(ingestRows({ grids: g }, "roster"), "roster"); }, b64);
  const r = await p.evaluate(() => {
    state.settings.repSec = {}; state.settings.attrition = 6; const C = []; // small courses every four weeks: short of the need
    for (let i = 0; i < 3; i++) { C.push({ name: "באר שבע " + (150 + i), site: "ב\"ש", count: 2, start: addDays("2026-10-11", i * 28), duration: 12, yield: 85, skill: "", wd: true });
      C.push({ name: "רחובות " + (20 + i), site: "רחובות", count: 1, start: addDays("2026-10-12", i * 28), duration: 12, yield: 85, skill: "", wd: true }); }
    state.cohorts = C; cohortsChanged(); document.getElementById("tab-recruit").click();
    const look = () => { const p = hirePlan(), h = rcReportHtml(), lead = (h.match(/<h3[^>]*>הקורסים מספיקים\?<\/h3>[\s\S]*?<p class="lead">([\s\S]*?)<\/p>/) || [])[1] || "";
      const foot = (h.match(/<td[^>]*colspan="6"[^>]*>([^<]*)</) || [])[1] || "";
      return { total: p.total, top: p.courses.filter(x => p.add.get(x.i)).length, sug: p.sug.length, table: h.includes(">מה להוסיף, לפי קורס<"), old: h.includes("תזכורת לגאנט"),
        lead: lead.replace(/<[^>]+>/g, ""), foot, reqs: state.cohorts.map(c => c.req || 0), counts: state.cohorts.map(c => c.count || 0) }; };
    const before = look();
    // the page's own "apply" button (all ticked): the Gantt now holds the additions
    document.querySelector("#hpApply").click(); document.getElementById("tab-recruit").click();
    return { before, after: look() }; });
  const IF = "בתנאי שנצמדים לגאנט גיוס";
  ok(r.before.total > 0 && r.before.table, `short Gantt: the plan adds +${r.before.total} and the "what to add" table shows`);
  ok(r.before.lead.includes(IF), "short Gantt: the lead holds the Gantt condition (" + r.before.lead + ")");
  ok(r.after.total === 0 && !r.after.table, "the Gantt already holds the additions: nothing to add, no table");
  ok(r.after.lead.includes(IF), "…and the lead still holds the condition — the courses ahead must fill (" + r.after.lead + ")");
  ok(!r.before.old && !r.after.old, "the table is named for what it is (no \"reminder\" title)");
  // the closing line = the message to recruiting: the average over the next courses' top-ups, new courses named apart, and why
  const avgM = r.before.foot.match(/תוספת ממוצעת של ([\d.]+) נציגים לקורס/);
  ok(r.before.top > 0 && avgM && +avgM[1] <= 12, "the average is over the top-ups only (" + (avgM && avgM[1]) + " ≤ a class): " + r.before.foot);
  ok(!r.before.sug || /ועוד (קורס חדש אחד|\d+ קורסים חדשים) \(\d+ נציגים\)/.test(r.before.foot), "new courses are named apart, with their reps");
  ok(/לאחר אי עמידה בגיוס ב.* \(באר שבע 151 ורחובות 21\)/.test(r.before.foot), "why: each location's latest started course, short of its target");
  // apply = a higher target on the courses ahead, and the new courses come with a target, no reps (not recruited yet)
  ok(r.after.counts.slice(0, 6).join() === "2,1,2,1,2,1" && r.after.reqs.some(x => x > 0), "apply raised the targets, the reps stayed as recruited (" + r.after.reqs.join() + ")");
  ok(r.after.counts.slice(6).every(x => x === 0) && r.after.reqs.slice(6).every(x => x > 0), "new courses: a target, no reps yet");
  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  console.log(out.every(x => x.startsWith("ok")) && !errs.length ? "ALL PASS" : "FAILURES");
  await b.close();
})();
