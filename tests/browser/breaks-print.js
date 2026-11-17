// 🖨 The break sheet on paper: one click prints the everyday sheet from a frame inside the app (no pop-up — the app stays
// usable while / after printing); the board fits one landscape page on A4 and on Letter (259 × 184 mm) at any limit;
// blocked places = one bold "Blocked" cell per slot, catch-up places say so (they read on a black-and-white printer);
// the Word file has no direction marks (Word drew them as boxes) and a page break Word keeps.
// Optional: set LG_SHOTS=<folder> for screenshots.
const puppeteer = require("puppeteer-core");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "index.html").replace(/\\/g, "/");
const SHOTS = process.env.LG_SHOTS, DAY = "2026-07-07";

const csv = AG => { const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע,נציגים"], W = 12, d0 = new Date(2026, 5, 28 - (W - 1) * 7), hump = (x, c, s) => Math.exp(-((x - c) ** 2) / (2 * s * s));
  for (let w = 0; w < W; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5), ds = String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/2026";
    for (let h = 8; h < 18; h++) for (const m of [0, 30]) { const x = h + m / 60, sh = 0.55 + hump(x, 10.5, 1.3) + 0.75 * hump(x, 15, 1.6);
      rows.push(`${ds},${h}:${m ? "30" : "00"},${Math.round(AG * 3.6 * sh * (1 + ((w + d) % 3) * 0.02))},300,${AG}`); } }
  return rows.join("\n"); };

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new", defaultViewport: { width: 1280, height: 900 } });
  const errs = [], out = [];
  const ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  const open = async (AG, lg) => { const p = await b.newPage(); p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
    await p.evaluateOnNewDocument(() => { window.__now = new Date(2026, 6, 5, 9, 0).getTime(); const D = Date;
      class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } } window.Date = FD; });
    await p.goto("file:///" + APP, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
    await p.evaluate(async (c, day, lg) => { setLang(lg); state.settings.autoHolidays = false; const f = new File([c], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast");
      state.brkDate = day; document.getElementById("tab-breaks").click(); }, csv(AG), DAY, lg || "en");
    return p; };
  // the board as the frame laid it out: its height on paper (after its own zoom) and its width vs the page's
  const board = p => p.evaluate(() => { const f = document.getElementById("prFrame"), d = f && f.contentDocument, W = d ? [...d.querySelectorAll(".bdw")] : []; if (!W.length) return null;
    const mm = v => v * 25.4 / 96, fit = W.map(w => { const r = w.getBoundingClientRect(), z = +w.style.zoom || 1; return [Math.min(mm(r.height), mm(r.height * z)), Math.min(mm(r.width), mm(r.width * z))]; });
    const rows = [...d.querySelector("table.bd").querySelectorAll("tbody tr")], bp = state._brkPlan;
    return { h: Math.max(...fit.map(x => x[0])), wide: Math.max(...fit.map(x => x[1])) > 260, pages: W.length, cols: W.map(w => w.querySelectorAll("thead tr:first-child th").length - 1), cap: bp.cap, title: d.title, opened: !!window.__popup,
      blkPerRow: rows.map(tr => tr.querySelectorAll("td.blk").length), want: bp.slots.map(s => s.places < bp.cap ? 1 : 0),
      blkTxt: [...d.querySelectorAll("td.blk")].every(td => td.textContent === t("brkBlk")),
      spTxt: d.querySelectorAll("td.sp .spL").length, spWant: bp.slots.reduce((a, s) => a + s.spare, 0) }; });

  // a catch-up place is for a pushed break: never at or before the first slot with a regular place — any team, any %, any window
  const cuRule = p => p.evaluate(day => { const bad = [], n = { cu: 0, runs: 0 };
    for (const d of [day, "2026-07-08", "2026-07-09"]) for (const sp of [10, 30, 50]) for (const st of ["08:00", "09:40", "12:00"]) for (const cap of [0, 3, 6]) {
      state.settings.brk = { spare: sp, start: st, end: "17:00" }; if (cap) state.settings.brk.cap = cap; const S = breakPlan(d).slots; n.runs++;
      const r0 = S.find(s => s.places - s.spare > 0), c0 = S.find(s => s.spare > 0); if (c0) n.cu++;
      if (c0 && (!r0 || c0.m <= r0.m)) bad.push(`${d} ${sp}% from ${st} cap ${cap || "auto"}: catch-up ${c0.tm}, first place ${r0 ? r0.tm : "none"}`); }
    state.settings.brk = {}; return { bad, n }; }, DAY);
  for (const AG of [8, 45, 150]) { const p = await open(AG), x = await cuRule(p);
    ok(!x.bad.length && x.n.cu > 0, `${AG === 8 ? "a small team" : AG === 45 ? "an everyday day" : "a big center"}: every catch-up place comes after the first regular place (${x.n.runs} plans, ${x.n.cu} with catch-up)` + (x.bad.length ? " — " + x.bad.slice(0, 3).join(" · ") : ""));
    await p.close(); }

  // ---- an everyday day: one click, no pop-up, the app keeps working ----
  let p = await open(45);
  let s = await p.evaluate(() => { window.__popup = false; const wo = window.open; window.open = (...a) => { window.__popup = true; return wo.apply(window, a); };
    const q = x => document.querySelector(x), menu = [...document.querySelectorAll("#brkExpMenu [data-fmt]")].map(x => x.dataset.mode + ":" + x.dataset.fmt);
    return { btn: q("#brkPrint").textContent, tip: q("#brkPrint").title, more: q("#brkExpWrap > button").textContent.trim(), menu }; });
  ok(/Print the sheet/.test(s.btn) && /any printer/.test(s.tip) && s.more === "⋯", "one main button prints the everyday sheet: " + s.btn + " · the rest under " + s.more);
  ok(s.menu.join() === "names:pdf,names:word,names:xlsx,names:text,tpl:pdf,tpl:word,tpl:xlsx,proc:pdf,proc:word", "⋯ = with names · blank · the procedure, each in its formats");
  await p.click("#brkPrint"); await new Promise(r => setTimeout(r, 900));
  s = await board(p);
  ok(s && !s.opened, "printed from a frame inside the app — no pop-up window");
  ok(s && /07\/07\/2026|07-07-2026/.test(s.title), "Save as PDF takes the sheet's name: " + (s && s.title));
  ok(s && s.h <= 186 && !s.wide, `the board fits one landscape page on A4 and Letter (${s && s.h.toFixed(0)} mm of 184, ${s && s.cap} places)`);
  ok(s && s.blkPerRow.join() === s.want.join() && s.blkTxt, "every slot with fewer places than the limit: ONE bold \"Blocked\" cell for the rest");
  ok(s && s.spTxt === s.spWant && s.spWant > 0, `every catch-up place says so on paper (${s && s.spTxt})`);
  const d0 = await p.evaluate(() => document.getElementById("brkDate").value);
  await p.click("#brkNext"); await new Promise(r => setTimeout(r, 300));
  const d1 = await p.evaluate(() => document.getElementById("brkDate").value);
  ok(d1 && d1 !== d0, `after printing the app answers at once: › went ${d0} → ${d1}`);
  // ---- Word: no direction marks, a page break Word keeps, every cell right-to-left ----
  s = await p.evaluate(day => { state.brkDate = day; setLang("he"); renderBreaks(); const h = brkSheetHtml(state._brkPlan, "names", "word"), C = String.fromCharCode;
    return { marks: new RegExp("[" + C(0x2066) + "-" + C(0x2069) + "]").test(h), br: (h.match(/<br clear="all" style="page-break-before:always">/g) || []).length, div: /class="pb"><\/div>/.test(h),
      ltrCell: /<(td|th)(?![^>]*dir="rtl")[\s>]/.test(h), date: h.includes("07/07/2026") }; }, DAY);
  ok(!s.marks && s.date, "Word: the date is plain 07/07/2026 — no hidden marks for Word to draw as boxes");
  ok(s.br === 2 && !s.div && !s.ltrCell, "Word: the entitlement and the queue each start a new page; every cell reads right-to-left");
  if (SHOTS) { await p.evaluate(() => { document.querySelector("#brkExpWrap > button").click(); }); await p.screenshot({ path: path.join(SHOTS, "breaks-print.png") }); }
  await p.close();

  // ---- a big center: many places across — still one page ----
  p = await open(150, "he");
  await p.click("#brkPrint"); await new Promise(r => setTimeout(r, 900)); s = await board(p);
  const half = s && Math.ceil(s.cap / Math.ceil(s.cap / 12));
  ok(s && s.cap > 12 && s.pages === Math.ceil(s.cap / 12) && s.cols.every(c => c <= 12) && s.cols.reduce((a, c) => a + c, 0) === s.cap && s.cols[0] === half,
    `a big center: ${s && s.cap} places → the board on ${s && s.pages} pages (${s && s.cols.join(" + ")} places) — every name stays writable`);
  ok(s && s.h <= 186 && !s.wide, `each board page fits one landscape page (${s && s.h.toFixed(0)} mm)`);
  s = await p.evaluate(() => { const h = brkSheetHtml(state._brkPlan, "tpl", "word"); return (h.match(/<br clear="all" style="page-break-before:always">/g) || []).length; });
  ok(s === Math.ceil((await p.evaluate(() => state._brkPlan.cap)) / 12) + 1, "Word: each board page, the entitlement and the queue start a new page");
  await p.close();

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed");
  await b.close(); process.exit(bad ? 1 : 0);
})();
