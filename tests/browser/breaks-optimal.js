// ☕ The break sheet the shift manager sees first is already the best one: how many can be on a break at once is
// chosen (brkAutoCap) — the smallest limit ≤ 9 that fits everyone + the catch-up places and keeps the day's answer
// rate; 10 only when it really adds; a big center gets the smallest limit that fits. The catch-up places (the old
// "spare") now follow their % (they used to be silently cut by a limit that was too tight).
// Optional: set LG_SHOTS=<folder> for a screenshot.
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
  const open = async AG => { const p = await b.newPage(); p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
    await p.evaluateOnNewDocument(() => { window.__now = new Date(2026, 6, 5, 9, 0).getTime(); const D = Date;
      class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } } window.Date = FD; });
    await p.goto("file:///" + APP, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
    await p.evaluate(async (c, day) => { setLang("en"); state.settings.autoHolidays = false; const f = new File([c], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast");
      state.brkDate = day; document.getElementById("tab-breaks").click(); }, csv(AG), DAY);
    return p; };
  const facts = p => p.evaluate(day => { const bp = breakPlan(day), okP = x => x.placed >= x.people && x.extra >= x.spareWant, M = {}; for (let k = 1; k <= 12; k++) M[k] = breakPlan(day, { cap: k });
    const soft = Object.values(M).filter(x => okP(x) && x.cap <= 9), best = soft.length ? Math.max(...soft.map(x => x.arDay)) : null, want = soft.find(x => x.arDay >= best - 0.001);
    return { cap: bp.cap, auto: bp.capAuto, placed: bp.placed, people: bp.people, extra: bp.extra, want: bp.spareWant, nP: bp.nP, ar: bp.arDay, why: bp.capWhy, wantCap: want ? want.cap : null,
      ar9: M[9].arDay, ar10: M[10].arDay, ok10: okP(M[10]), prevOk: bp.cap > 1 ? okP(breakPlan(day, { cap: bp.cap - 1 })) : null, max: Math.max(...bp.slots.map(s => s.places)), flat: breakPlan(day, { flat: true, cap: bp.cap }).arDay }; }, DAY);

  // ---- a 56-rep day: the limit is chosen ----
  let p = await open(45), s = await facts(p);
  const take10 = s.ok10 && s.ar10 - s.ar9 >= 0.001;
  ok(s.auto && s.placed === s.people && s.extra === s.want && s.want === Math.ceil(s.nP * 0.1), `default: everyone has their breaks (${s.placed}/${s.people}) and all ${s.want} catch-up places`);
  ok(s.cap <= 10 && s.cap === (take10 ? 10 : s.wantCap) && s.max <= s.cap, `the limit is chosen: ${s.cap} at once (9 → ${(s.ar9 * 100).toFixed(2)}%, 10 → ${(s.ar10 * 100).toFixed(2)}%: 10 ${take10 ? "adds enough" : "adds too little"})`);
  ok(s.ar > s.flat, `better than an even spread: ${(s.ar * 100).toFixed(2)}% vs ${(s.flat * 100).toFixed(2)}%`);
  let ui = await p.evaluate(() => { const q = x => document.querySelector(x); const lds = [...document.querySelectorAll("#brkBox .brkRow .brkLd")].map(x => parseInt(x.style.getPropertyValue("--ld")));
    return { pill: q(".brkCapP").textContent, why: q(".brkCapP").title, lds: [Math.min(...lds), Math.max(...lds), lds.length], leg: q(".brkLeg").textContent, tile: q(".brkTile .mini").textContent, capIn: q('#brkSet [data-k="cap"]').value, ph: q('#brkSet [data-k="cap"]').placeholder, opt: !!q("#brkSet .optTag"), alt: !!q('[data-alt="capAuto"]') }; });
  ok(/🤖 up to \d+ on a break at once/.test(ui.pill) && /Chosen automatically/.test(ui.why) && /With \d+:/.test(ui.why) && !ui.alt, "the sheet says its limit and why — " + ui.pill + " | " + ui.why.split("\n").slice(1).join(" "));
  ok(ui.lds[2] >= 15 && ui.lds[1] === 100 && ui.lds[0] === 12 && /call load/.test(ui.leg), `every slot shows its call load, from the quietest slot (${ui.lds[0]}%) to the busiest (${ui.lds[1]}%)`);
  ok(ui.capIn === "" && /🤖 \d+/.test(ui.ph) && ui.opt && /catch-up places/.test(ui.tile), "⚙: the limit is optional (empty = chosen: " + ui.ph + "); one name for the spare — " + ui.tile);
  if (SHOTS) { await p.evaluate(() => { setLang("he"); renderBreaks(); }); await p.screenshot({ path: path.join(SHOTS, "breaks.png") }); await p.evaluate(() => { setLang("en"); renderBreaks(); }); }

  // ---- the catch-up places follow their % (they used to stay at 2 whatever the %) ----
  const sp = await p.evaluate(day => [0, 5, 10, 20].map(v => { state.settings.brk = { spare: v }; const bp = breakPlan(day); return [v, bp.extra, bp.spareWant, bp.cap]; }), DAY);
  ok(sp.every(x => x[1] === x[2]) && sp[0][1] === 0 && sp[1][1] < sp[2][1] && sp[2][1] < sp[3][1], "catch-up places by %: " + sp.map(x => `${x[0]}% → ${x[1]} (limit ${x[3]})`).join(" · "));

  // ---- a typed limit that is too tight: said, and one click back to the chosen one ----
  s = await p.evaluate(day => { state.settings.brk = { cap: 6 }; renderBreaks(); const bp = state._brkPlan, t0 = document.querySelector(".brkTile .mini").textContent, alt = document.querySelector('[data-alt="capAuto"]'), had = !!alt;
    if (alt) alt.click(); return { auto0: bp.capAuto, cap0: bp.cap, short: bp.extra < bp.spareWant, t0, had, cap1: state.settings.brk.cap, auto1: state._brkPlan.capAuto, undo: !!document.getElementById("brkUndo") }; }, DAY);
  ok(!s.auto0 && s.cap0 === 6 && s.short && /\+\d+\/\d+ catch-up places/.test(s.t0) && s.had, "a typed limit of 6 leaves catch-up places out — the tile says how many: " + s.t0);
  ok(s.cap1 === undefined && s.auto1 && s.undo, "one click gives the chosen limit back (with ↶)");
  const ms = await p.evaluate(() => { const t0 = performance.now(); renderBreaks(); return Math.round(performance.now() - t0); });
  ok(ms < 1500, `the page draws in ${ms} ms`);
  await p.close();

  // ---- a big center: 10 is not enough → the smallest limit that fits everyone ----
  p = await open(150); s = await facts(p);
  ok(s.auto && s.cap > 10 && s.placed === s.people && s.extra === s.want && s.prevOk === false && s.why.less === "nofit", `a big center (${s.people} reps): ${s.cap} at once — the smallest that fits everyone (one fewer does not)`);
  await p.close();
  // ---- a small team: a small limit ----
  p = await open(8); s = await facts(p);
  ok(s.auto && s.cap <= 4 && s.placed === s.people && s.extra === s.want, `a small team (${s.people} reps): ${s.cap} at once`);
  await p.close();

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed");
  await b.close(); process.exit(bad ? 1 : 0);
})();
