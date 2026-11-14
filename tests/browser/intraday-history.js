// 📊 "How do the calls spread over the day?" — the ways in (Settings button + its pulse, the matrix ⋯) and the
// "over time" view: every history week / day against a usual day, the events, the recent drift, the copy for Excel.
// The file: 16 weeks Sun–Thu ending 02-Jul-2026; in the last 4 weeks the calls move to the morning; Tue 12-May-2026 is
// an odd day (afternoon-heavy) and Tue 19-May-2026 a milder one — the user marks both as exceptions.
// Optional: set LG_SHOTS=<folder> for a screenshot.
const puppeteer = require("puppeteer-core");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "index.html").replace(/\\/g, "/");
const SHOTS = process.env.LG_SHOTS;
const cl = x => x.replace(/[⁦-⁩‎‏]/g, ""); // dates on screen carry direction marks

const fcCSV = (() => { const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע"], W = 16, d0 = new Date(2026, 5, 28 - (W - 1) * 7);
  for (let w = 0; w < W; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5), ds = String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/2026";
    const odd = dt.getMonth() === 4 && dt.getDate() === 12, odd2 = dt.getMonth() === 4 && dt.getDate() === 19, late = w >= W - 4;
    for (let h = 8; h < 18; h++) for (const m of ["00", "30"]) { const am = h < 12, base = 60 + (h % 5) * 8 + ((w + h + d) % 3);
      rows.push(`${ds},${h}:${m},${Math.round(base * (odd ? (am ? 0.6 : 1.5) : odd2 ? (am ? 0.75 : 1.3) : late ? (am ? 1.12 : 0.9) : 1))},300`); } }
  return rows.join("\n");
})();

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new", defaultViewport: { width: 1280, height: 1000 } });
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
  await p.evaluate(async csv => { setLang("en"); state.settings.autoHolidays = false; const f = new File([csv], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast");
    state.exceptions.add("2026-05-12"); state.exceptions.add("2026-05-19"); rebuildLearningSeries(); renderAll(); }, fcCSV);

  // ---- the ways in ----
  let s = await p.evaluate(() => { document.getElementById("tab-settings").click(); const d = document.querySelector("details.fmAdv"), b = document.getElementById("profBtn");
    d.open = true; d.dispatchEvent(new Event("toggle")); const pulse1 = b.classList.contains("pulse"), real = b.classList.contains("btn") && /Calls over the day/.test(b.textContent);
    b.click(); const open1 = !document.getElementById("profPanel").hidden; document.getElementById("mClose").click();
    b.classList.remove("pulse"); d.open = false; d.dispatchEvent(new Event("toggle")); d.open = true; d.dispatchEvent(new Event("toggle"));
    document.getElementById("tab-matrix").click(); document.getElementById("mxProf").click();
    return { pulse1, real, open1, pulse2: b.classList.contains("pulse"), seen: state.settings.profSeen, open2: !document.getElementById("profPanel").hidden && document.getElementById("modalBg").classList.contains("show") }; });
  ok(s.real && s.pulse1 && s.open1, "Settings: a real button (📊 Calls over the day) that pulses when its fold opens, and opens the window");
  ok(!s.pulse2 && s.seen === true, "once it was opened, it never pulses again");
  ok(s.open2, "the matrix's ⋯ menu opens the same window");

  // ---- over time ----
  const look = () => p.evaluate(() => { const q = x => document.querySelector(x), C = profCols();
    return { time: !q("#profTime").hidden, tbl: q("#profTblW").style.display, win: q("#profWin").style.display + getComputedStyle(q("#profTest")).display, cols: C.length, marks: document.querySelectorAll("#profTChart svg path").length, ins: q("#profInsight").textContent, insShown: q("#profInsight").style.display !== "none",
      svgTxt: [...document.querySelectorAll("#profTChart svg text")].map(x => x.textContent).join(" | "), views: document.querySelectorAll("#profView button").length, fold: q("#fmAdvSum").textContent, pats: [...document.querySelectorAll("#profPats .profPt")].map(x => x.textContent), zoom: q("#profZoomX").hidden ? "" : q("#profZoomX").textContent,
      read: q("#profTRead").textContent, sel: q("#profTSel").textContent, det: document.querySelectorAll("#profTDet svg polyline").length, g: (q("#profGran .active") || {}).textContent }; });
  await p.evaluate(() => document.querySelector('#profView [data-view="time"]').click());
  s = await look();
  ok(s.time && s.tbl === "none" && s.win === "nonenone" && s.g === "Weeks" && s.cols === 16 && s.det === 2, `"Over time": 16 weeks, each against a usual day (the learning choice steps aside)`);
  ok(/last 4 weeks/.test(s.ins) && /moved to the morning/.test(s.ins) && /12-May-2026/.test(cl(s.ins)) && /marked as an exception/.test(s.ins), "the two facts: " + s.ins);
  ok(s.marks === 2 && /A day marked/.test(s.svgTxt) && /W\d+/.test(s.svgTxt) && /More in the morning/.test(s.svgTxt) && /More in the afternoon/.test(s.svgTxt), "on the chart: ◆ with the event's name, week numbers, and the two sides in words");
  ok(/Toward week \d+: about \d+ more calls a day between \d\d:\d\d and \d\d:\d\d/.test(s.ins) && s.views === 2 && /off by \d/.test(s.fold), "next week leads the facts — " + s.ins.split("In the last")[0] + " | the fold: " + s.fold);
  if (SHOTS) { await p.evaluate(() => { setLang("he"); renderProfile(); }); await (await p.$("#modal")).screenshot({ path: path.join(SHOTS, "prof-time.png") }); await p.evaluate(() => { setLang("en"); renderProfile(); }); }
  await p.evaluate(() => document.querySelector('#profGran [data-g="day"]').click());
  s = await look();
  const odd = await p.evaluate(() => { const H = profHist(), top = [...H.days].sort((a, c) => c.odd - a.odd)[0], u = Object.values(H.usual[2]).reduce((a, c) => a + c, 0); return { ds: top.ds, am: top.am, ev: top.ev, usualSum: u, n: H.days.length }; });
  ok(s.cols === 80 && odd.ds === "2026-05-12" && odd.am < -0.1 && Math.abs(odd.usualSum - 1) < 1e-9, `days: 80 columns; the most unusual day is the planted one (${(odd.am * 100).toFixed(1)} points to the afternoon)`);
  ok(/12-May-2026/.test(cl(s.sel)) && /◆/.test(s.sel) && /moved to the afternoon/.test(s.read), "it opens on that day: " + s.read);
  // click another day (the last one), then copy
  s = await p.evaluate(async () => { const svg = document.querySelector("#profTChart svg"), r = svg.getBoundingClientRect(); for (const k of ["pointerdown", "pointerup"]) svg.dispatchEvent(new PointerEvent(k, { bubbles: true, clientX: r.right - 3, clientY: r.top + 60, pointerId: 1 }));
    const got = []; Object.defineProperty(navigator, "clipboard", { value: { writeText: async x => { got.push(x); } }, configurable: true });
    document.querySelector('#profCopy [data-g="60"]').click(); await new Promise(r => setTimeout(r, 30)); const g = got[0].split("\n").map(x => x.split("\t"));
    return { sel: document.getElementById("profTSel").textContent, head: g[0].slice(0, 3), cols: g[0].length, rows: g.length, ev: g[1].filter(Boolean), sum: g.slice(2).reduce((a, x) => a + parseFloat(x[1]), 0) }; });
  ok(/02-Jul-2026/.test(cl(s.sel)), "a click on a column chooses it — " + s.sel);
  ok(s.head[0] === "Hour" && /^\d\d\/\d\d\/2026$/.test(s.head[1]) && s.cols === 81 && s.rows === 12 && s.ev.length === 2 && Math.abs(s.sum - 100) < 0.2, `copy for Excel: a column per day with its date, the event named under it, hours × days (${s.cols - 1} days)`);
  // what repeats → click → the detail; the insights as text
  s = await p.evaluate(async () => { const got = []; Object.defineProperty(navigator, "clipboard", { value: { writeText: async x => { got.push(x); } }, configurable: true });
    const pt = document.querySelector("#profPats .profPt"); const txt = pt ? pt.textContent : ""; if (pt) pt.click();
    document.getElementById("profCopyIns").click(); await new Promise(r => setTimeout(r, 30));
    return { txt, sel: document.getElementById("profTSel").textContent, det: document.querySelectorAll("#profTDet svg polyline").length, copy: got[0] || "" }; });
  ok(/marked as an exception/.test(s.txt) && /2 days/.test(s.txt) && /to the afternoon/.test(s.txt) && /2 days/.test(s.sel) && s.det === 2, "what repeats: " + s.txt);
  ok(/^\*How do the calls spread over the day\?\*/.test(s.copy) && (s.copy.match(/•/g) || []).length >= 3 && /What repeats\?/.test(s.copy) && !/[\u2066-\u2069]/.test(s.copy), "the insights copy as plain text (" + s.copy.split("\n").length + " lines)");
  // drag across the chart = zoom into those days; ✕ gives the whole file back
  await p.evaluate(() => document.querySelector('#profGran [data-g="week"]').click());
  s = await p.evaluate(() => { const svg = document.querySelector("#profTChart svg"), r = svg.getBoundingClientRect(), c = state._profX, x = i => r.left + (c.L + (i + .5) * c.cw) / 720 * r.width, ev = (k, i) => document.getElementById("profTChart").dispatchEvent(new PointerEvent(k, { bubbles: true, clientX: x(i), clientY: r.top + 60, pointerId: 1, buttons: 1 }));
    ev("pointerdown", 4); ev("pointermove", 6); ev("pointerup", 6);
    const z = { ...state._profZ }, n = profCols().length, g = document.querySelector("#profGran .active").dataset.g, chip = !document.getElementById("profZoomX").hidden, hint = document.getElementById("profZoomHint").hidden;
    document.getElementById("profZoomX").click();
    return { z, n, g, chip, hint, back: profCols().length, z2: state._profZ }; });
  ok(s.n === 15 && s.g === "day" && s.chip && s.hint && s.back === 16 && s.z2 === null, `dragging over 3 weeks zooms into their ${s.n} days (${s.z.a} … ${s.z.b}); ✕ returns to the 16 weeks`);
  // back to the split: the table, the learning choice and the peak line return
  s = await p.evaluate(() => { document.querySelector('#profView [data-view="share"]').click(); const q = x => document.querySelector(x);
    return { time: !q("#profTime").hidden, tbl: q("#profTblW").style.display, win: q("#profWin").style.display, ins: q("#profInsight").textContent, shown: q("#profInsight").style.display !== "none", rows: q("#profTable").rows.length }; });
  ok(!s.time && s.tbl === "" && s.win === "" && s.shown && /peak/.test(s.ins) && s.rows > 10, "back to the split: the table and its one line return — " + s.ins);

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed");
  await b.close(); process.exit(bad ? 1 : 0);
})();
