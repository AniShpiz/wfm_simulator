// ⏱ No-shows by the hour. A center with a KNOWN truth: 40 committed rep-hours every hour; no-shows 25% at 08:00, 18% at
// 09:00, 20% at 17:00, 12% elsewhere; +7 points from week 6 on, +5 more in the last week (a sharp change). The history
// file has 360-style columns ("חיזוי נכנסות" before "נכנסות", gross + net login, a "scheduled" column that is already
// net of a forecast absence = circular). The committed hours come as their own file (date · hour · total hours).
// Checks: both files are recognized · the hourly no-shows are measured right · the forecast that reacts to the sharp
// change wins its test and lands near the truth · the matrix, Date Trends and Settings read it · a history half hour
// stands on the committed hours · a typed value wins · everything survives a reload · without the committed hours
// nothing changes. Optional: LG_SHOTS=<folder>.
const puppeteer = require("puppeteer-core");
const path = require("path");
const APP = path.join(__dirname, "..", "..", "index.html").replace(/\\/g, "/");
const SHOTS = process.env.LG_SHOTS;

const W = 10, d0 = new Date(2026, 3, 26); // Sundays from 26-Apr-2026 → the file ends Thursday 02-Jul-2026
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dmy = d => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const COMMIT = 40, baseAbs = h => h === 8 ? 0.25 : h === 9 ? 0.18 : h === 17 ? 0.20 : 0.12, lift = w => w >= 9 ? 0.12 : w >= 5 ? 0.07 : 0;
const truth = (w, d, h) => baseAbs(h) + lift(w) + (((w * 5 + d) * 7 + h) % 3 - 1) / 100; // ± 1 point of noise
const hump = (x, c, s) => Math.exp(-((x - c) ** 2) / (2 * s * s));
const fcCsv = () => { const rows = ["תאריך,שעה,חיזוי נכנסות,נכנסות,נענות,ממוצע משך שיחה,שעות שיבוץ,לוגין ברוטו,לוגין נטו VOICE"];
  for (let w = 0; w < W; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5);
    for (let h = 8; h < 18; h++) for (const m of [0, 30]) { const x = h + m / 60, vol = Math.round(140 * (0.55 + hump(x, 10.5, 1.3) + 0.75 * hump(x, 15, 1.6)));
      const net = COMMIT * (1 - truth(w, d, h)) / 2; // net login hours in the half hour
      rows.push([dmy(dt), `${h}:${m ? "30" : "00"}`, vol + 9, vol, Math.round(vol * 0.88), 300, 36, (net / 0.97).toFixed(2), net.toFixed(2)].join(",")); } }
  return rows.join("\n"); };
const cmCsv = () => { const rows = ["תאריך,שעה,שבוע,שעות שיבוץ,קורסים במענה,סה״כ שעות,צפי הגעה,קובץ מקור"]; // + the week ahead, as the store holds it
  for (let w = 0; w < W + 1; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5);
    for (let h = 8; h < 18; h++) rows.push([dmy(dt), String(h).padStart(2, "0") + ":00", 18 + w, COMMIT - 9, 4, COMMIT, 34, "חיזוי.xlsb"].join(",")); }
  return rows.join("\n"); };
const NEXT = "2026-07-05"; // the first forecast day (a Sunday)

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new", defaultViewport: { width: 1400, height: 950 } });
  const errs = [], out = [], ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m), pc = v => (v * 100).toFixed(1) + "%";
  const p = await b.newPage(); p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.evaluateOnNewDocument(() => { window.__now = new Date(2026, 6, 5, 9, 0).getTime(); const D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } } window.Date = FD; });
  await p.goto("file:///" + APP, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
  const load = (txt, name, hint) => p.evaluate(async (c, n, h) => { const f = new File([c], n, { type: "text/csv" }); const st = ingestRows(await bytesToGrid(await f.arrayBuffer()), h); ingestSuccess(st, h); return st.type; }, txt, name, hint);
  await p.evaluate(() => { setLang("en"); state.settings.autoHolidays = false; state.settings.absence = 9; });

  // ---- the history file, with the new columns ----
  let s = await load(fcCsv(), "360.csv", "forecast");
  let r = await p.evaluate(() => { const x = state.days.get("2026-06-30").get("10:00"); return { vol: x.volume, login: x.login, g: x.loginG, ag: x.agents, days: state.days.size }; });
  ok(s === "forecast" && r.days === 50 && r.vol === 208 && Math.abs(r.login - 15.2) < 0.4 && r.g > r.login && r.ag === 36,
    `the history file with 360-style columns: calls = "נכנסות" (${r.vol}, not the forecast column), net login ${r.login}h + gross ${r.g}h kept apart`);
  const before = await p.evaluate(nx => { const h = computeDay("2026-06-30").rows.find(x => x.tm === "08:00"), f = computeDay(nx).rows.find(x => x.tm === "08:00");
    return { on: absOn(), hs: h.sched, ha: h.agents, fa: f.agents, fs: f.sched, abs: state.settings.absence, k: state.calib }; }, NEXT);
  ok(!before.on && before.hs === 36 && before.abs === 9, `without the committed hours nothing changes: the flat ${before.abs}% and the file's own "scheduled" (${before.hs})`);
  // ---- never a dead click: the way in is always there, and without the data the window says what is missing + takes the file ----
  r = await p.evaluate(() => { const q = x => document.querySelector(x); document.getElementById("tab-matrix").click(); const mn = q("#mxAbs"), vis = getComputedStyle(mn).display !== "none" && !mn.hidden;
    mn.click(); const open = q("#modalBg").classList.contains("show") && !q("#absPanel").hidden, txt = q("#absGrid .absOff") ? q("#absGrid .absOff").textContent : "", btn = [...document.querySelectorAll("#absGrid .absAct button")].map(b => b.id);
    const nav = q("#absPanel .absNav").style.display, set = q("#setAbsBtn"), setTxt = set.hidden ? "" : set.textContent, inp = !q("#setAbsence").hidden; q("#modalBg").classList.remove("show");
    return { vis, open, txt, btn, nav, setTxt, inp, row: q("#absModelRow").style.display }; });
  ok(r.vis && r.open && /one % for every hour \(9%\)/.test(r.txt) && /committed hours: date · hour · total hours/.test(r.txt) && r.btn.includes("absPick") && r.btn.includes("absEx") && r.nav === "none",
    `before any committed hours: the matrix ⋯ entry opens the window, which says what is missing and offers the file picker + an example file — "${r.txt.slice(0, 62)}…"`);
  if (SHOTS) { await p.evaluate(() => { setLang("he"); document.getElementById("mxAbs").click(); }); await p.screenshot({ path: path.join(SHOTS, "abs-empty.png") }); await p.evaluate(() => { document.getElementById("modalBg").classList.remove("show"); setLang("en"); }); }
  ok(/by hour…/.test(r.setTxt) && r.inp && r.row === "none", `Settings keeps the % box and adds the way in next to it ("${r.setTxt}"); no model list yet`);

  // ---- the committed hours: recognized by themselves ----
  s = await load(cmCsv(), "התחייבות_שעתית.csv", "forecast");
  r = await p.evaluate(() => ({ on: absOn(), n: state.commit.size, v: state.commit.get("2026-06-30|08:00"), next: state.commit.get("2026-07-06|09:00"), toast: (document.querySelector(".toast,#toast") || {}).textContent }));
  ok(s === "commit" && r.on && r.n === 550 && r.v === 40 && r.next === 40, `the committed-hours file is recognized whatever the portal (${r.n} hours, the week ahead included)`);

  // ---- measured: no-shows per hour = 1 − net login ÷ committed hours ----
  r = await p.evaluate(() => { const x = absHist().get("2026-06-30"); return { h8: 1 - x.h["08:00"].L / x.h["08:00"].C, h12: 1 - x.h["12:00"].L / x.h["12:00"].C, day: 1 - x.L / x.C, at: absAt("2026-06-30", "08:30") }; });
  ok(Math.abs(r.h8 - 0.37) < 0.015 && Math.abs(r.h12 - 0.24) < 0.015 && Math.abs(r.at - r.h8) < 1e-9,
    `measured on Tue 30-Jun: 08:00 ${pc(r.h8)} (true 37% ± 1) · 12:00 ${pc(r.h12)} (true 24% ± 1) · the day ${pc(r.day)} — from sums of hours`);

  // ---- the forecast: tested on the file's own past, the one that follows a sharp change wins ----
  // (no-shows are a model KIND like calls and call length: the same registry, the same test, the same automatic pick)
  r = await p.evaluate(nx => { const rk = rankModels("abs", 0), use = modelFor("abs", 1), d = absDay(nx), S = absSeries(0), ctx = absCtx(0), lv = m => Models.abs[m].fn(S.v, 1, ctx) / 100;
    const sel = document.getElementById("setModelAbs"); return { rk: rk.map(x => x.mid + " " + x.r.mape.toFixed(1) + "%"), top: rk[0].mid, use, mixE: rk.find(x => x.mid === "mix3").r.mape, useE: rk[0].r.mape, n: rk[0].r.n,
      f8: d["08:00"], f12: d["12:00"], m8: d["08:00"] - lv(use) + lv("mix3"), row: document.getElementById("absModelRow").style.display, sel: sel.value, selTxt: sel.options[0].textContent, opts: sel.options.length }; }, NEXT);
  ok(r.use === r.top && r.use !== "mix3" && r.useE < r.mixE && r.n >= 12, `every no-shows model is tested on the file's own past (${r.n} days): ${r.rk.join(" · ")} → ${r.use} is used`);
  ok(Math.abs(r.f8 - 0.37) < 0.03 && Math.abs(r.f12 - 0.24) < 0.03 && Math.abs(r.f8 - 0.37) < Math.abs(r.m8 - 0.37),
    `next Sunday: 08:00 ${pc(r.f8)} · 12:00 ${pc(r.f12)} (true 37% · 24%) — the 3 weeks 50/30/20 alone would say ${pc(r.m8)} at 08:00`);
  ok(r.row !== "none" && r.sel === "auto" && /🤖/.test(r.selTxt) && r.opts === 8, `Settings › Forecasting models has the no-shows list: "${r.selTxt}" + the ${r.opts - 1} models to pick by hand`);
  // picked by hand → that model, everywhere; 🤖 gives the choice back
  r = await p.evaluate(nx => { const sel = document.getElementById("setModelAbs"), a0 = absDay(nx)["12:00"]; sel.value = "mix3"; sel.dispatchEvent(new Event("change")); const a1 = absDay(nx)["12:00"], u1 = modelFor("abs", 1), abs1 = state.settings.absence;
    sel.value = "auto"; sel.dispatchEvent(new Event("change")); return { a0, a1, u1, abs1, u2: modelFor("abs", 1), a2: absDay(nx)["12:00"], abs2: state.settings.absence }; }, NEXT);
  ok(r.u1 === "mix3" && r.a1 !== r.a0 && r.u2 !== "mix3" && Math.abs(r.a2 - r.a0) < 1e-9 && r.abs1 !== r.abs2, `picking "3 weeks · 50/30/20" by hand moves the forecast (12:00 ${pc(r.a0)} → ${pc(r.a1)}, Settings ${r.abs2}% → ${r.abs1}%); 🤖 gives it back`);
  // the play window: the weekday's no-shows week by week, every model a card, a dragged point moves the forecasts
  r = await p.evaluate(() => { LG.kind = "abs"; LG.mid = null; openLogic("fc"); const q = x => document.querySelector(x), cards = [...document.querySelectorAll("#lgCards .lgCard")];
    const nx = () => Object.fromEntries([...document.querySelectorAll("#lgCards .lgCard")].map(c => [c.dataset.mid, parseFloat(c.querySelector(".lgNx").textContent)])), b = nx();
    LG.arr[LG.arr.length - 1] += 10; lgFcDraw(); const a = nx(); const kind = q("#lgKind button.active").textContent, src = q("#lgFcSrc").textContent, use = q("#lgCards .lgCard .pill") && q("#lgCards .lgCard .pill").closest(".lgCard").dataset.mid;
    const why = (() => { document.querySelector('#lgCards .lgCard[data-mid="fast"]').click(); const w = document.querySelector("#lgCards .lgCard.on .lgWhy"); return w ? w.textContent : ""; })();
    document.getElementById("modalBg").classList.remove("show"); return { n: cards.length, kind, src, b, a, use, why }; });
  if (SHOTS) { await p.evaluate(() => { setLang("he"); LG.kind = "abs"; LG.mid = null; openLogic("fc"); }); await p.screenshot({ path: path.join(SHOTS, "abs-play.png") }); await p.evaluate(() => { document.getElementById("modalBg").classList.remove("show"); setLang("en"); }); }
  ok(r.kind === "No-shows" && r.n === 7 && /no-shows, week by week/.test(r.src) && r.use, `the play window has No-shows next to calls and call length: ${r.src} · ${r.n} model cards, the one in use marked`);
  ok(Math.abs(r.a.lastweek - r.b.lastweek - 10) < 0.11 && Math.abs(r.a.mix3 - r.b.mix3 - 5) < 0.11 && /last 5 days/.test(r.why),
    `dragging last week's point up 10 points: "last week" follows all of it (+${(r.a.lastweek - r.b.lastweek).toFixed(1)}), "3 weeks · 50/30/20" half (+${(r.a.mix3 - r.b.mix3).toFixed(1)}); a card says how it thinks`);

  // ---- the matrix, Date Trends and Settings read it ----
  r = await p.evaluate(nx => { const S = state.settings, k = state.calib || 1, f = computeDay(nx).rows.find(x => x.tm === "08:00"), f12 = computeDay(nx).rows.find(x => x.tm === "12:00");
    const h = computeDay("2026-06-30").rows.find(x => x.tm === "08:00"), hl = state.days.get("2026-06-30").get("08:00").login * 2;
    const td = trendDayStat(nx), sched = computeDay(nx).rows.filter(x => x.rec && !x.closed).reduce((a, x) => a + x.sched * 0.5 * (1 - x.abs), 0);
    return { fAbs: f.abs, fAg: f.agents, fWant: Math.round(f.sched * (1 - f.abs) * (1 - (S.shrinkage || 0) / 100) * k), r8: f.req, r12: f12.req, v8: f.rec.volume, v12: f12.rec.volume,
      hs: h.sched, ha: h.agents, hWant: Math.round(hl * (1 - (S.shrinkage || 0) / 100) * k), hl, net: td.loginHrs ?? td.netH ?? null, netWant: sched, abs: S.absence, user: S.absenceUser, k, keys: Object.keys(td).join() }; }, NEXT);
  ok(Math.abs(r.fAbs - 0.37) < 0.025 && r.fAg === r.fWant, `a forecast half hour: ${pc(r.fAbs)} don't come at 08:00 → ${r.fAg} reps answer (scheduled × who comes × available × the floor's fit)`);
  ok(r.hs === 40 && r.ha === r.hWant, `a history half hour stands on the committed hours (${r.hs}, not the file's 36) → the reps who answered = the net login (${r.hl.toFixed(1)}) → ${r.ha}`);
  ok(Math.abs(r.abs - 24.4) < 2.5 && r.user === 9, `Settings' no-shows % follows the forecast's level (${r.abs}%); the typed ${r.user}% is kept for when the data goes`);

  // ---- where the user meets it: Settings, the matrix ⋯ and hover, the Home chip ----
  r = await p.evaluate(nx => { const q = x => document.querySelector(x); document.getElementById("tab-matrix").click(); const sel = document.getElementById("weekSelect"); sel.value = nx; sel.dispatchEvent(new Event("change"));
    const c = [...document.querySelectorAll("#page-matrix td.cell")].find(x => x.dataset.ds === nx && x.dataset.tm === "08:00"); renderFcExtras();
    return { inp: q("#setAbsence").hidden, btn: q("#setAbsBtn").hidden ? "" : q("#setAbsBtn").textContent, menu: !q("#mxAbs").hidden, tip: c ? c.title : "", chip: [...document.querySelectorAll("#fcExtras .xChip.on")].map(x => x.textContent).join("|") }; }, NEXT);
  ok(r.inp && /⏱ 2\d\.\d% · by hour/.test(r.btn) && r.menu, `Settings shows the level instead of a box to type (${r.btn}); the matrix ⋯ has "No-shows by hour"`);
  ok(/Don't come this hour: 3\d%/.test(r.tip) && /committed hours/.test(r.chip), `the matrix cell's hover says it (${(r.tip.match(/Don't come[^\n]*/) || [""])[0]}); Home marks ✓ committed hours`);

  // ---- the window: the week on a grid; a click types your own value for that hour ----
  r = await p.evaluate(nx => { document.getElementById("mxAbs").click(); const G = document.getElementById("absGrid"), q = x => G.querySelector(x);
    const head = [...G.querySelectorAll("thead tr:first-child th")].map(x => x.textContent), hours = G.querySelectorAll("tbody tr").length, day = q(".absDayR td").textContent;
    const td = q(`td[data-k="${nx}|08:00"]`), was = td.textContent; td.click(); const inp = td.querySelector("input"); inp.value = "10"; inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const td2 = q(`td[data-k="${nx}|08:00"]`), R = computeDay(nx).rows;
    return { title: document.getElementById("mTitle").textContent, head: head.slice(1, 3).join(" | "), hours, day, was, now: td2.textContent, ed: td2.classList.contains("ed"), clear: !document.getElementById("absClear").hidden,
      a8: R.find(x => x.tm === "08:30").abs, a9: R.find(x => x.tm === "09:00").abs, leg: document.getElementById("absLeg").textContent, test: document.querySelector("#absMdl").title }; }, NEXT);
  ok(/How many don't come, by hour\?/.test(r.title) && r.hours === 10 && /forecast/.test(r.head) && /^\d\d%$/.test(r.day), `the window: the week on screen, ${r.hours} hours × the days (${r.head.replace(/\s+/g, " ")}), the day in one number (${r.day})`);
  ok(r.was !== r.now && /10% ✎/.test(r.now) && r.ed && r.clear && Math.abs(r.a8 - 0.10) < 1e-9 && r.a9 > 0.25, `a click on Sunday 08:00 (${r.was}) and typing 10 → ${r.now}: that hour only (09:00 stays ${pc(r.a9)}), with ↺ back to the forecast`);
  ok(/measured.*forecast.*yours/.test(r.leg) && /Checked on your past \(\d+ days\): .+ — off by \d+\.\d%/.test(r.test), "every mark has its key; the forecast's key names the model and how it was checked — " + r.test);
  r = await p.evaluate(() => { document.getElementById("absPrev").click(); const G = document.getElementById("absGrid"); return { act: /actual/.test(G.querySelector("thead").textContent), editable: G.querySelectorAll("td[data-k]").length, wk: document.getElementById("absWkL").textContent }; });
  ok(r.act && r.editable === 0, `‹ goes back to a measured week (${r.wk}): what happened, nothing to type`);
  await p.evaluate(() => document.getElementById("absNext").click());

  // ---- ⏱ the time base: one chip in the header says which login everything counts on; a click moves it all together ----
  r = await p.evaluate(() => { const D = "2026-06-30", chip = document.getElementById("baseChip"), lg = () => state.days.get(D).get("12:00").login, st = () => ({ txt: chip.textContent, l: lg(), a: absAt(D, "12:00"), lab: t("thNetProd"), prod: trendDayStat(D).netProd, set: state.settings.absence });
    const n = st(), tipN = chip.title, dis = chip.disabled; chip.click(); const g = st(), tipG = chip.title; chip.click(); const n2 = st(); return { n, g, n2, tipN, tipG, dis, shown: !chip.hidden }; });
  ok(r.shown && !r.dis && /net login/.test(r.n.txt) && /gross login/.test(r.g.txt) && /NET login/.test(r.tipN) && /Click: switch to gross login/.test(r.tipN), `the header says the time in use on every page (${r.n.txt.trim()}); the file has both, so a click switches`);
  ok(r.g.l > r.n.l && r.g.a < r.n.a && r.g.prod < r.n.prod && /gross/i.test(r.g.lab) && !/gross/i.test(r.n.lab) && r.g.set < r.n.set,
    `on gross login everything moves together: the hour's login ${r.n.l.toFixed(2)} → ${r.g.l.toFixed(2)}h, its no-shows ${pc(r.n.a)} → ${pc(r.g.a)}, productivity ${r.n.prod.toFixed(2)} → ${r.g.prod.toFixed(2)}, the label "${r.g.lab}"`);
  ok(Math.abs(r.n2.l - r.n.l) < 1e-9 && Math.abs(r.n2.a - r.n.a) < 1e-9 && r.n2.lab === r.n.lab, "and back to net login: the same numbers as before");

  if (SHOTS) { await p.evaluate(() => { setLang("he"); renderAbs(); document.getElementById("mTitle").textContent = t("absTitle"); document.getElementById("mCore").textContent = t("absIntro"); });
    await p.screenshot({ path: path.join(SHOTS, "absence.png") }); await p.evaluate(() => setLang("en")); }

  // ---- a reload keeps the committed hours and the typed value ----
  await p.reload({ waitUntil: "load" });
  r = await p.evaluate(nx => ({ on: absOn(), n: state.commit ? state.commit.size : 0, a8: absAt(nx, "08:00"), abs: state.settings.absence, user: state.settings.absenceUser }), NEXT);
  ok(r.on && r.n === 550 && Math.abs(r.a8 - 0.10) < 1e-9 && r.user === 9, `after a reload: ${r.n} committed hours, the typed value and the hourly forecast are still there`);

  // ---- 📁 one folder per kind: "where is it saved?" — anywhere, sub-folders searched, the newest loads by itself ----
  // (like the real tree: the 360 reports and the committed-hours store in their folders; the sidur in a new dated sub-folder
  //  every week; constraints in theirs. The loaders are recorded, not run.)
  r = await p.evaluate(async (fc, cm) => { const mk = (name, txt, lm) => ({ kind: "file", name, getFile: async () => new File([txt], name, { lastModified: lm }) });
    const dir = (name, items) => ({ kind: "directory", name, queryPermission: async () => "granted", values() { const it = items(); return (async function* () { for (const x of it) yield x; })(); } });
    const sid = wk => "תאריך,כניסה,יציאה,שם הנציג/ה\n05/07/2026,08:00,16:00,דנה " + wk + "\n05/07/2026,09:00,17:00,יוסי\n";
    window.__weeks = [dir("22", () => [mk("סידור שבוע 47.csv", sid(47), 3e12)]), dir("29", () => [mk("סידור שבוע 48.csv", sid(48), 3.1e12)])]; window.__mk = mk; window.__dir = dir; window.__sid = sid;
    const D = { fc: dir("דוחות 360", () => [mk("דוח 360 היסטורי.csv", fc, 3e12), mk("קרא אותי.txt", "x", 3.2e12)]),
      commit: dir("מאגר התחייבויות", () => [mk("התחייבות_שעתית.csv", cm, 3e12), mk("התחייבות_שעתית_backup.csv", cm, 3.3e12), mk("~$התחייבות.xlsx", "zz", 3.3e12)]),
      sidur: dir("סידור עבודה", () => [dir("2026", () => [dir("11", () => window.__weeks)])]), cons: dir("אילוצים", () => [mk("אילוצים שבוע 48.csv", "שם,ראשון\nדנה,08:00-14:00\n", 3e12)]) };
    const calls = []; window.__calls = calls; window.ingestFile = (fl, h) => calls.push((h || "auto") + ":" + fl.name); window.ingestConstraintsFile = fl => calls.push("cons:" + fl.name); window.ingestCourseFile = fl => calls.push("courses:" + fl.name);
    FD.dirs = {}; state.settings.fdSeen = {}; fdSync(); const home0 = document.getElementById("fdPick").textContent; fdGuide();
    const rows0 = [...document.querySelectorAll("#fdRows .fdK")].map(x => x.querySelector("label").textContent + " | " + x.querySelector("[data-pick]").textContent);
    let k = 0; const order = ["fc", "commit", "sidur", "cons"]; window.showDirectoryPicker = async () => D[order[k++]];
    for (const K of order) { document.querySelector(`#fdRows [data-pick="${K}"]`).click(); await new Promise(z => setTimeout(z, 700)); }
    await fdGuideUpd(); window.__shot = 1;
    const rows = Object.fromEntries([...document.querySelectorAll("#fdRows .fdK")].map(x => [x.dataset.k, x.querySelector(".fdAt").textContent + " · " + x.querySelector("[data-new]").textContent]));
    return { home0, rows0, rows, calls: [...calls], title: document.getElementById("mTitle").textContent, core: document.getElementById("mCore").textContent }; }, fcCsv(), cmCsv());
  ok(/Read your files by themselves/.test(r.home0) && /Where are your files saved\?/.test(r.title) && r.rows0.length === 5 && r.rows0.every(x => /Choose folder/.test(x)) && /sub-folders are searched/.test(r.core),
    `one window, one line per kind, one 📂 each — no "which folder first": ${r.rows0.map(x => x.split(" | ")[0].replace(/(\D)([a-z])/, "$1 $2")).slice(0, 3).join(" · ")} …`);
  if (SHOTS) { await p.evaluate(async () => { setLang("he"); fdGuide(); await fdGuideUpd(); }); await p.screenshot({ path: path.join(SHOTS, "fd-guide.png") }); await p.evaluate(() => setLang("en")); }
  ok(r.calls.join(" | ") === "forecast:דוח 360 היסטורי.csv | auto:התחייבות_שעתית.csv | roster:סידור שבוע 48.csv | cons:אילוצים שבוע 48.csv",
    `each folder chosen = its newest file loads at once — ${r.calls.map(x => x.split(":")[1]).join(" → ")} (the backup, the lock file and the note are left alone)`);
  ok(/סידור עבודה · newest: 2026\/11\/29\/סידור שבוע 48\.csv/.test(r.rows.sidur) && /newest: התחייבות_שעתית\.csv/.test(r.rows.commit) && !r.rows.courses.trim().replace("·", ""),
    `each line says where it reads and what it found — ${r.rows.sidur}; courses: not chosen, nothing said`);
  r = await p.evaluate(async () => { const again = await fdScan(), n0 = window.__calls.length;
    window.__weeks.push(window.__dir("06", () => [window.__mk("סידור שבוע 49.csv", window.__sid(49), 3.2e12)])); const n3 = await fdScan();
    fdSync(); return { again, n0, n3, last: window.__calls[window.__calls.length - 1], label: document.getElementById("fdPick").textContent, tip: document.getElementById("fdPick").title }; });
  ok(r.again === 0 && r.n0 === 4 && r.n3 === 1 && r.last === "roster:סידור שבוע 49.csv", "nothing is read twice; next week's sidur in a NEW dated sub-folder is found and loaded by itself — " + r.last);
  ok(/Read by themselves: 📞 ⏱ 📅 🔒/.test(r.label) && /Sidur ← סידור עבודה · סידור שבוע 49\.csv/.test(r.tip), `Home says what is read by itself (${r.label.trim()}); the hover names each folder and its file`);
  await p.evaluate(() => document.getElementById("modalBg").classList.remove("show"));

  // ---- ✎ what the user typed survives a restart — the forecast cells too (they never did) ----
  r = await p.evaluate(nx => { const tm = "10:00", rec = forecastDay(nx).get(tm), v0 = rec.volume; const cl = new Map(); for (const [k, v] of forecastDay(nx)) cl.set(k, { ...v });
    cl.get(tm).volume = v0 + 77; state.simDays.set(nx, cl); state.edits.add(nx + "|" + tm); state.cellOrig.set(nx + "|" + tm, { ...rec }); state.trainees = { [nx]: { n: 3 } }; state.exceptions.add("2026-06-29");
    state.fcCache.clear(); saveData(); return { v0, want: v0 + 77 }; }, NEXT);
  await p.reload({ waitUntil: "load" });
  const r2 = await p.evaluate(nx => ({ ed: state.edits.has(nx + "|10:00"), v: (state.simDays.get(nx) || new Map()).get("10:00")?.volume, tr: (state.trainees[nx] || {}).n, ex: state.exceptions.has("2026-06-29"), skills: state.settings.answerSkills }), NEXT);
  ok(r2.ed && r2.v === r.want && r2.tr === 3 && r2.ex, `after a restart: the forecast cell you changed (${r.v0} → ${r2.v} calls), the courses in answering of the week and the exceptions are all still there`);

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed"); await b.close(); process.exit(bad ? 1 : 0);
})();
