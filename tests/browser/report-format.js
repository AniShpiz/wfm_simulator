// 📄 The executive report's course Gantt on paper: dd/mm dates without hidden direction marks, the name cell in three
// lines + a status (historical / active now / none), portrait A4 with 36pt margins, a 1pt last paragraph.
// "Today" is pinned to Wed 11-Nov-2026. Optional: REPORT_PNG=<path> saves a picture of the printed Gantt.
const puppeteer = require("puppeteer-core");
const path = require("path");
const APP = path.join(__dirname, "..", "..", "index.html").replace(/\\/g, "/");

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const p = await b.newPage();
  const errs = [], out = [];
  const ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.evaluateOnNewDocument(() => {
    const FIX = new Date(2026, 10, 11, 11, 0).getTime(), D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [FIX])); } static now() { return FIX; } }
    window.Date = FD;
  });
  await p.goto("file:///" + APP, { waitUntil: "load" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  const html = await p.evaluate(() => {
    setLang("he");
    state.cohorts = [
      { name: "קורס אוקטובר", site: "ב\"ש", count: 11, start: "2026-10-12", duration: 12, yield: 85, skill: "", wd: true },
      { name: "קורס נובמבר", site: "רחובות", count: 9, req: 10, start: "2026-11-02", duration: 12, yield: 85, skill: "", wd: true }, // its own target (not the class size 7)
      { name: "קורס דצמבר", site: "בית", count: 14, start: "2026-12-06", duration: 12, yield: 85, skill: "", wd: true },
      { name: "קורס ינואר", site: "ב\"ש", count: 12, start: "2027-01-10", duration: 12, yield: 85, skill: "", wd: true },
      // an old saved name, made with the screen's date (hidden marks around the month)
      { name: "קורס בית " + fmtDs("2027-02-07"), site: "בית", count: 10, start: "2027-02-07", duration: 12, yield: 85, skill: "", wd: true },
      // a course ahead, not recruited yet: a target, no reps
      { name: "קורס מרץ", site: "רחובות", req: 8, start: "2027-03-07", duration: 12, yield: 85, skill: "", wd: true }];
    state.settings.repSec = { kpi: false, traj: false, mon: false, plan: false, gantt: true, wi: false, shadow: false, out: false, rules: false };
    cohortsChanged();
    const g = rcReportHtml();
    state.settings.repSec = {}; // every section, for the whole-report check
    return [g, rcReportHtml(), state.cohorts[4].name];
  }).then(([g, all, nm]) => { globalThis.ALL = all; globalThis.NM = nm; return g; });
  const MARKS = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/;
  // Word has no isolates (LRI\u2026PDI = boxes); it does keep the RLM, which holds "5:00 \u2192 4:09" and "4%" together
  const ISO = new RegExp("[" + String.fromCharCode(0x2066) + "-" + String.fromCharCode(0x2069) + "]");
  ok(!MARKS.test(NM), "a saved course name loses its hidden marks (" + NM + ")");
  ok(!ISO.test(ALL), "no isolate marks anywhere in the full report");
  const g = html.slice(html.indexOf('<table class="gantt"'), html.indexOf("</table>", html.indexOf('<table class="gantt"')));
  ok(!ISO.test(g), "no isolate marks in the Gantt (Word keeps the RLM)");
  const H3 = [...ALL.matchAll(/<h3[^>]*>([^<]*)</g)].map(m => m[1]);
  // no forecast here: the plan / What-If / work plan sections stay out \u2014 the rest keeps the summary's order, the Gantt last
  ok(H3.join("|") === "המספרים|כמה נציגים יהיו לנו?|מגבלות קורסים|גאנט קורסים (גם ברשימה למטה)", "sections in the summary's order (" + H3.join(" | ") + ")");
  ok(/<h3 style="page-break-before:always">גאנט/.test(ALL), "the Gantt starts its own page");
  const L = ALL.slice(ALL.indexOf('<table class="clist"'));
  ok(/>פתיחת קורס<.*>ימי הקורס<.*>דרישת גיוס<.*>נציגים בקורס<.*>פער \(דרישה פחות נציגים\)<.*>סטטוס זמן</.test(L), "the course list: start, days, target, reps in course, gap, status");
  ok(/>קורס אוקטובר<\/td><td[^>]*>12\/10\/2026<\/td><td[^>]*>12<\/td><td[^>]*>12<\/td><td[^>]*>11<\/td><td[^>]*>1<\/td><td[^>]*>היסטורי</.test(L), "a row: target = class size (12), gap = 12 \u2212 11 = 1, historical");
  ok(/>קורס נובמבר<\/td><td[^>]*>02\/11\/2026<\/td><td[^>]*>12<\/td><td[^>]*>10<\/td><td[^>]*>9<\/td><td[^>]*>1<\/td>/.test(L), "a course's own recruiting target wins over the class size (10, gap 1)");
  ok(/>פעיל</.test(L) && />עתידי</.test(L) && />סה״כ</.test(L), "active, future, one total row");
  ok(/>קורס מרץ<\/td><td[^>]*>07\/03\/2027<\/td><td[^>]*>12<\/td><td[^>]*>8<\/td><td[^>]*>0<\/td><td[^>]*>8<\/td>/.test(L), "a course not recruited yet: its target, 0 reps, the whole target still to recruit");
  ok(!/<td[^>]*>\u2014<\/td>/.test(L), "no bare dashes in the list");
  ok(/<p class="n1">קורס מרץ<\/p><p class="n2">רחובות \u00b7 8<\/p>/.test(ALL), "\u2026and the Gantt counts it at its target (רחובות \u00b7 8)");
  ok(/>12\/10–\d\d\/10</.test(g), "the range reads dd/mm–dd/mm (12/10–…)");
  ok(/<th[^>]*class="wk[^"]*"[^>]*>\d\d\/\d\d</.test(g), "week headers are dd/mm");
  ok(/<td dir="rtl"/.test(g) && !/<t[dh](?![^>]*dir=)[\s>]/.test(ALL.slice(ALL.indexOf("<body"))), "every table cell carries the page's direction (Word reads cells as left-to-right otherwise)");
  ok(!/20\d\d/.test(g.replace(/style="[^"]*"/g, "")), "no year in the table");
  ok(/<p class="n1">קורס אוקטובר<\/p><p class="n2">ב"ש · 11<\/p><p class="n2">.?<span dir="ltr">12\/10–/.test(g), "name · location + count · range (start on the left, as in the summary) — three lines");
  const st = name => { const i = g.indexOf(">" + name + "<"), j = g.indexOf("</th>", i); const m = g.slice(i, j).match(/<p class="(st[hn])">([^<]*)/); return m ? m[1] + ":" + m[2] : ""; };
  ok(st("קורס אוקטובר") === "sth:היסטורי", "October course = historical (" + st("קורס אוקטובר") + ")");
  ok(st("קורס נובמבר") === "stn:פעיל כעת", "November course = active now (" + st("קורס נובמבר") + ")");
  ok(st("קורס דצמבר") === "" && st("קורס ינואר") === "", "future courses carry no label");
  ok(/@page WordSection1\{size:595\.3pt 841\.9pt;margin:36pt/.test(html) && /<div class="WordSection1">/.test(html), "portrait A4, 36pt margins (Word section)");
  ok(/<p class="endP">&nbsp;<\/p><\/div><\/body>/.test(html), "a 1pt last paragraph closes the document");
  ok(/<thead><tr>/.test(g), "the header row is a thead (repeats on the next page)");
  if (process.env.REPORT_PNG) { const q = await b.newPage(); await q.setViewport({ width: 794, height: 1123 }); await q.setContent(html); await q.emulateMediaType("print");
    await q.screenshot({ path: process.env.REPORT_PNG, fullPage: true }); }
  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  console.log(out.every(x => x.startsWith("ok")) && !errs.length ? "ALL PASS" : "FAILURES");
  await b.close();
})();
