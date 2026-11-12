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
      return { total: p.total, top: p.courses.filter(x => p.add.get(x.i)).length, sug: p.sug.length, table: h.includes(">מה להוסיף, לפי קורס (מעבר למה שכבר מוזן)<"), old: h.includes("תזכורת לגאנט"),
        lead: lead.replace(/<[^>]+>/g, ""), foot, reqs: state.cohorts.map(c => c.req || 0), counts: state.cohorts.map(c => c.count || 0) }; };
    const before = look();
    // the page's own "apply" button (all ticked): the Gantt now holds the additions
    document.querySelector("#hpApply").click(); document.getElementById("tab-recruit").click();
    return { before, after: look() }; });
  // reaching the target: the courses as entered, without improving → with the measures improved (the What-If sliders)
  const w = await p.evaluate(() => { const wiSec = h => h.slice(h.indexOf(">הגעה ליעד<"), h.indexOf("</table>", h.indexOf(">הגעה ליעד<")));
    const plain = wiSec(rcReportHtml());
    state.settings.shrinkage = 30; state.settings.absence = 10;
    for (const [id, v] of [["wiAht", 7], ["wiAttr", 45], ["wiShrink", 15], ["wiAbsence", 40]]) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input")); }
    const all = rcReportHtml(), sec = wiSec(all);
    const clean = h => h.replace(/<[^>]+>/g, "").split(String.fromCharCode(0x200F)).join("").split(String.fromCharCode(0x200E)).join("")
      .split(String.fromCharCode(0x202A)).join("").split(String.fromCharCode(0x202C)).join(""); // the marks Word needs
    const h3 = [...all.matchAll(/<h3[^>]*>([^<]*)</g)].map(m => m[1]);
    // the course lists (without, then with the improvement) — each as rows of cell texts
    const lists = [...all.matchAll(/<table class="clist">([\s\S]*?)<\/table>/g)].map(m => [...m[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c => clean(c[1]))));
    const titles = [...all.matchAll(/<p class="lead"[^>]*>(בלי שיפור במוקד|עם שיפור המדדים)<\/p>/g)].map(m => m[1]);
    const lev = clean((all.match(/עם שיפור המדדים<\/p><p class="sub">([\s\S]*?)<\/p>/) || [])[1] || "");
    return { plain, sec, basis: (all.match(/📚 ([^<]*)/) || [])[1] || "", h3, lists, titles, lev, sentences: /הפער לגיוס|מתוכם/.test(all) }; });
  ok(/המספרים לפי הקורסים כפי שהם מוזנים עכשיו \(\d+ נציגים בקורסים הבאים\)/.test(w.basis), "the top says what every number stands on (" + w.basis + ")");
  ok(/עם הקורסים כפי שנטענו/.test(w.plain) && !/→/.test(w.plain.slice(w.plain.indexOf("<table"))), "no improvement set: one column, no arrows");
  const cells = [...w.sec.matchAll(/<span dir="ltr">(\d+\.\d)% → (\d+\.\d)%<\/span>/g)];
  ok(cells.length > 3 && cells.every(m => +m[2] >= +m[1]), `improvements set: every date "without → with" (${cells.length} rows, e.g. ${cells[0] && cells[0][0].replace(/<[^>]+>/g, "")})`);
  ok(/בלי שיפור.*→.*עם השיפור/.test(w.sec) && /השיפור \(נק׳\)/.test(w.sec) && /\+\d+\.\d/.test(w.sec), "header \"without → with\" + a gain column in points");
  ok(/היעד \d+%: בלי שיפור — .* · עם השיפור — /.test(w.sec), "the target line says both: without and with the improvement");
  // one colored Gantt, then the course list twice: without improving the center, then with the measures improved — each
  // with its own total row, so the gap still to recruit reads side by side
  ok(w.h3.filter(h => /גאנט/.test(h)).join("|") === "גאנט קורסים (גם ברשימה למטה)", "one colored Gantt (" + w.h3.filter(h => /גאנט/.test(h)).join(" | ") + ")");
  ok(w.lists.length === 2 && w.titles.join("|") === "בלי שיפור במוקד|עם שיפור המדדים", "two course lists: without, then with (" + w.titles.join(" | ") + ")");
  // columns: name · start · days · target · addition · reps · gap · status; one total row: [סה״כ, target, addition, reps, gap, ""]
  const [A, B] = w.lists, tot = L => L[L.length - 1] || [], n = v => +(v || "0").replace("−", "-").replace("+", ""), rows = L => L.slice(1, -1);
  ok(A && B && tot(A)[0] === "סה״כ" && tot(B)[0] === "סה״כ", "each list ends with one total row");
  const sum = (L, c) => rows(L).reduce((x, r) => x + (r[c] === "?" ? 0 : n(r[c])), 0);
  ok([3, 4, 5, 6].every(c => n(tot(A)[c - 2]) === sum(A, c)) && [3, 4, 5, 6].every(c => n(tot(B)[c - 2]) === sum(B, c)), "the total row is each column summed (both lists)");
  ok(n(tot(B)[4]) < n(tot(A)[4]), `the gap with the improvement is smaller (${tot(A)[4]} → ${tot(B)[4]})`);
  ok(rows(A).some(r => r[7] === "מומלץ") && rows(A).some(r => /^\+\d+$/.test(r[4])) && A[0][4] === "שינוי בדרישה", "the plan's changes in their own column (+n), new courses \"recommended\"");
  ok(rows(A).every(r => { const n = v => +(v || "0").replace("−", "-").replace("+", ""); return r[6] === "?" || n(r[3]) + n(r[4]) - n(r[5]) === n(r[6]); }), "every row adds up: target + addition − reps = gap");
  ok(!rows(A).concat(rows(B)).some(r => r.includes("—")), "no bare dashes: a course not recruited yet shows 0 reps");
  const hist = L => rows(L).filter(r => r[7] === "היסטורי").map(r => r.join("|")).join("‖");
  ok(hist(A) === hist(B), "a course that started is the same in both (nothing left to plan there)");
  ok(/משך שיחה \d+:\d\d → \d+:\d\d \(−7%\)/.test(w.lev) && /עזיבה בחודש [\d.]+% → [\d.]+% \(−45%\)/.test(w.lev), "the improvement in plain numbers (" + w.lev + ")");
  ok(!w.sentences, "no sentences under the lists");
  // a big improvement leaves more than enough: the plan says what recruiting can let go (−n), the latest course first, never
  // below the reps a course has — and with those cuts applied the same plan needs nothing added (every month still holds)
  const cut = await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input")); };
    set("wiAht", 30); set("wiAttr", 100); set("wiShrink", 100); set("wiAbsence", 100);
    const sc = wiScenario(), P = hirePlan(sc), html = rcReportHtml(), li = html.slice(html.lastIndexOf('<table class="clist">'));
    const minus = (li.match(/<span dir="ltr">−\d+<\/span>/g) || []).length, keep = JSON.stringify(state.cohorts);
    const below = [...P.cut].some(([i, r]) => crsReps(state.cohorts[i]) - r < (+state.cohorts[i].count || 0));
    [...P.cut].forEach(([i, r]) => { state.cohorts[i].req = crsReps(state.cohorts[i]) - r; }); cohortsChanged();
    const after = hirePlan(sc); state.cohorts = JSON.parse(keep); cohortsChanged();
    set("wiAht", 7); set("wiAttr", 45); set("wiShrink", 15); set("wiAbsence", 40); // back to the scenario the next checks use
    return { cutTotal: P.cutTotal, n: P.cut.size, minus, below, afterTotal: after.total, header: /שינוי בדרישה/.test(li) }; });
  ok(cut.cutTotal > 0 && cut.minus > 0 && cut.header, `a big improvement: recruiting can let go ${cut.cutTotal} reps over ${cut.n} courses — shown as "−n" under "שינוי בדרישה"`);
  ok(!cut.below && cut.afterTotal === 0, `never below the reps a course has; with the cuts applied the plan needs +${cut.afterTotal} (every month still holds)`);
  // the sliders survive a reload (settings.wiSliders): the report still has "with the improvement"; ↺ clears them for good
  const WI = ["wiAht", "wiAttr", "wiShrink", "wiAbsence"];
  await p.evaluate(ids => ids.forEach(id => document.getElementById(id).dispatchEvent(new Event("change"))), WI); // a slider let go = saved
  await p.reload({ waitUntil: "load" });
  const kept = await p.evaluate(ids => { document.getElementById("tab-recruit").click();
    return { v: ids.map(id => +document.getElementById(id).value).join(), lists: (rcReportHtml().match(/<table class="clist">/g) || []).length,
      reset: document.getElementById("wiReset").style.display !== "none" }; }, WI);
  ok(kept.v === "7,45,15,40" && kept.lists === 2 && kept.reset, `after a reload the sliders are back (${kept.v}), the report still compares (${kept.lists} lists), ↺ shows`);
  await p.evaluate(() => document.getElementById("wiReset").click()); await p.reload({ waitUntil: "load" });
  const gone = await p.evaluate(ids => { document.getElementById("tab-recruit").click(); return ids.map(id => +document.getElementById(id).value).join(); }, WI);
  ok(gone === "0,0,0,0", "↺ then a reload: the sliders stay at 0 (" + gone + ")");
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
  // the reps = who came on day one: the courses that opened keep theirs, the ones ahead have none (their number became the target)
  ok(r.after.counts.slice(0, 4).join() === "2,1,2,1" && r.after.counts.slice(4, 6).every(x => x === 0) && r.after.reqs.slice(4).every(x => x > 0), "apply raised the targets; opened courses keep their reps, courses ahead have none (" + r.after.counts.join() + " / " + r.after.reqs.join() + ")");
  ok(r.after.counts.slice(6).every(x => x === 0) && r.after.reqs.slice(6).every(x => x > 0), "new courses: a target, no reps yet");
  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  console.log(out.every(x => x.startsWith("ok")) && !errs.length ? "ALL PASS" : "FAILURES");
  await b.close();
})();
