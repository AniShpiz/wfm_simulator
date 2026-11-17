// 📣 Planned demand events that LEARN. A center with a mailing every 4th Tuesday (+30% that day, +10% the next) and one
// unexplained Monday (+40%). The file's unusual days are offered ("what were they?"); naming the past mailings teaches
// the wave; a future mailing date then needs nothing else; "nothing special" is never asked again; an event with no past
// date uses the size / length picked; the exact form (calls) still works. + the matrix hover: the round hour's calls.
// Optional: set LG_SHOTS=<folder> for screenshots.
const puppeteer = require("puppeteer-core");
const path = require("path");
const APP = path.join(__dirname, "..", "..", "index.html").replace(/\\/g, "/");
const SHOTS = process.env.LG_SHOTS;

const W = 26, d0 = new Date(2026, 0, 4); // Sundays from 04-Jan-2026, 26 weeks → the file ends Thursday 02-Jul-2026
const ds = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MAIL = [3, 7, 11, 15, 19, 23].map(w => ds(new Date(d0.getTime() + (w * 7 + 2) * 864e5))); // Tuesdays
const ODD = ds(new Date(d0.getTime() + (21 * 7 + 1) * 864e5)); // a Monday nobody explains
const csv = () => { const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע,נציגים"], wd = [1.1, 1, 0.95, 0.95, 0.9], hump = (x, c, s) => Math.exp(-((x - c) ** 2) / (2 * s * s));
  for (let w = 0; w < W; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5), k = ds(dt), prev = ds(new Date(dt.getTime() - 864e5));
    const ev = MAIL.includes(k) ? 1.3 : MAIL.includes(prev) ? 1.1 : k === ODD ? 1.4 : 1, nz = 1 + (((w * 7 + d) * 37) % 9 - 4) / 100;
    const dd = String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/" + dt.getFullYear();
    for (let h = 8; h < 18; h++) for (const m of [0, 30]) { const x = h + m / 60, sh = 0.55 + hump(x, 10.5, 1.3) + 0.75 * hump(x, 15, 1.6);
      rows.push(`${dd},${h}:${m ? "30" : "00"},${Math.round(150 * sh * wd[d] * ev * nz)},300,40`); } }
  return rows.join("\n"); };

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new", defaultViewport: { width: 1360, height: 900 } });
  const errs = [], out = [], ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  const p = await b.newPage(); p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.evaluateOnNewDocument(() => { window.__now = new Date(2026, 6, 5, 9, 0).getTime(); const D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } } window.Date = FD; });
  await p.goto("file:///" + APP, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
  await p.evaluate(async c => { setLang("en"); state.settings.autoHolidays = false; const f = new File([c], "fc.csv", { type: "text/csv" });
    ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, csv());

  // ---- ① the file's unusual days are offered ----
  let s = await p.evaluate(() => evSurges().map(x => [x.ds, Math.round(x.r * 100)]));
  const sd = s.map(x => x[0]);
  // (two mailings fell on the 24th: until they are named, the billing calendar reads "the 24th is busy" — not asked)
  ok(sd.includes(ODD) && sd.filter(d => MAIL.includes(d)).length >= 3 && sd.every(d => d === ODD || MAIL.includes(d)) && s.every(x => x[1] >= 15),
    `unusual days found (the last 4 months), nothing else: ${s.map(x => x[0].slice(5) + " +" + x[1] + "%").join(" · ")}`);
  ok(!MAIL.some(d => sd.includes(ds(new Date(new Date(d).getTime() + 864e5)))), "a wave is asked about once — its first day, not the day after");
  // the 📣? tag sits on that day in the matrix
  s = await p.evaluate(odd => { const sel = document.getElementById("weekSelect"); sel.value = sundayOf(odd); sel.dispatchEvent(new Event("change"));
    document.getElementById("tab-matrix").click(); const a = [...document.querySelectorAll("#page-matrix .evAsk")]; return { n: a.length, tip: a[0] && a[0].title }; }, ODD);
  ok(s.n === 1 && /^\+1,[2-4]\d\d calls over a usual day — what was it\?/.test(s.tip), "the matrix marks the unusual day with 📣? — " + s.tip);

  // ---- ② name the past mailings (a pasted list) → the wave is learned ----
  s = await p.evaluate(mail => { openEvents(); const $ = id => document.getElementById(id);
    $("evName").value = "Mailing"; $("evName").dispatchEvent(new Event("input")); $("evPaste").value = mail.map(d => d.slice(8) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4)).join(", ");
    $("evPaste").dispatchEvent(new Event("change")); const chips = document.querySelectorAll("#evChips .evD").length, guess = !$("evGuess").hidden; $("evAdd").click();
    const k = evKindByName("Mailing"), f = evFxOf(k); return { chips, guess, fx: f.fx, n: f.n, src: f.src, row: document.querySelector("#evList .evK").textContent }; }, MAIL);
  ok(s.chips === MAIL.length && s.guess, `a pasted list = ${s.chips} dates in one go (a new name asks how big / how long)`);
  ok(s.src === "learn" && s.n === MAIL.length && Math.abs(s.fx[0] - 0.3) < 0.05 && Math.abs((s.fx[1] || 0) - 0.1) < 0.05 && s.fx.length <= 3,
    `the wave is learned from ${s.n} past dates: ${s.fx.map(x => "+" + Math.round(x * 100) + "%").join(" · ")} (true: +30% · +10%)`);
  s = await p.evaluate(() => evSurges().map(x => x.ds));
  ok(s.length === 1 && s[0] === ODD, "the named dates stop being asked about — only the Monday is left");

  // ---- ③ a future mailing needs only its date ----
  const FUT = "2026-07-14";
  s = await p.evaluate(fut => { const tot = d => { let v = 0; for (const r of forecastDay(d).values()) v += r.volume; return v; }, nx = addDays(fut, 1);
    const a0 = tot(fut), b0 = tot(nx), $ = id => document.getElementById(id);
    $("evName").value = "mailing"; $("evName").dispatchEvent(new Event("input")); $("evStart").value = fut; $("evStart").dispatchEvent(new Event("change"));
    const guess = !$("evGuess").hidden, prev = $("evPreview").textContent; $("evAdd").click();
    return { r0: tot(fut) / a0, r1: tot(nx) / b0, guess, prev, kinds: state.settings.evKinds.length }; }, FUT);
  ok(s.kinds === 1 && !s.guess && /learned from 6/.test(s.prev), "a known event (any letter case) asks only for the date: " + s.prev);
  ok(Math.abs(s.r0 - 1.3) < 0.04 && Math.abs(s.r1 - 1.1) < 0.04, `the forecast carries the wave: the date ×${s.r0.toFixed(2)}, the day after ×${s.r1.toFixed(2)}`);

  // ---- ④ "nothing special" — never asked again, kept ----
  s = await p.evaluate(odd => { const r = document.querySelector(`.evAskR[data-d="${odd}"] [data-no]`); r.click(); saveState();
    return { left: evSurges().length, kept: JSON.parse(localStorage.getItem("wfmSimWorkspace")).settings.evDismiss }; }, ODD);
  ok(s.left === 0 && s.kept.includes(ODD), "✕ Nothing special: the day is never asked about again (saved)");

  // ---- ⑤ an event with no past date: the size / length picked ----
  s = await p.evaluate(() => { const $ = id => document.getElementById(id), d = "2026-07-20", tot = x => { let v = 0; for (const r of forecastDay(x).values()) v += r.volume; return v; }, a0 = tot(d);
    $("evName").value = "SMS campaign"; $("evName").dispatchEvent(new Event("input")); document.querySelector('#evSize [data-v="l"]').click(); document.querySelector('#evLen [data-v="1"]').click();
    $("evStart").value = d; $("evStart").dispatchEvent(new Event("change")); $("evAdd").click();
    const k = evKindByName("SMS campaign"); return { r: tot(d) / a0, r1: tot(addDays(d, 1)), fx: evFxOf(k).fx, src: evFxOf(k).src }; });
  ok(s.src === "guess" && s.fx.length === 1 && Math.abs(s.r - 1.5) < 0.02, `no past date yet: "large · 1 day" = ×${s.r.toFixed(2)} on the date`);

  // ---- ⑥ saved: a reload keeps the events and what they learned ----
  await p.reload({ waitUntil: "load" });
  s = await p.evaluate(() => ({ k: (state.settings.evKinds || []).map(k => k.name + ":" + (k.learned ? k.learned.n : 0)), n: state.settings.demandEvents.length }));
  ok(s.k.join() === "Mailing:6,SMS campaign:0" && s.n === MAIL.length + 2, "after a reload: the events, their dates and the learned wave are still there — " + s.k.join(" · "));
  await p.evaluate(async c => { setLang("en"); state.settings.autoHolidays = false; const f = new File([c], "fc.csv", { type: "text/csv" });
    ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, csv());

  // ---- ⑦ the exact form (calls) still works ----
  s = await p.evaluate(() => { const d = "2026-07-22", tot = x => { let v = 0; for (const r of forecastDay(x).values()) v += r.volume; return v; }, a0 = tot(d);
    state.settings.demandEvents.push({ id: 1, name: "Vendor change", start: d, days: 1, total: 500, shape: "even" }); state.fcCache.clear(); return Math.round(tot(d) - a0); });
  ok(Math.abs(s - 500) <= 2, `the exact form adds its calls: +${s}`);

  // ---- ⑧ the matrix hover: on the second half hour, the round hour's calls ----
  s = await p.evaluate(() => { const sel = document.getElementById("weekSelect"); sel.value = "2026-06-28"; sel.dispatchEvent(new Event("change")); document.getElementById("tab-matrix").click();
    const c = [...document.querySelectorAll("#page-matrix td.cell")].filter(x => x.title), a = c.find(x => /Hour 10:00–11:00/.test(x.title));
    const m = a && a.title.match(/Hour (\d\d:\d\d)–(\d\d:\d\d): ([\d,]+) calls/), d = state.days.get("2026-06-28");
    const want = Math.round(d.get("10:00").volume + d.get("10:30").volume), on00 = c.some(x => /Hour/.test(x.title) && !/–\d\d:00:/.test(x.title.match(/Hour [^\n]*/)[0]));
    return { line: m && m[0], n: m && +m[3].replace(/,/g, ""), want, on00 }; });
  ok(s.n === s.want && /10:00–11:00/.test(s.line) && !s.on00, `the 10:30 cell: "${s.line}" (= 10:00 + 10:30), only on the second half hour`);

  if (SHOTS) { await p.evaluate(() => { setLang("he"); state.settings.evDismiss = []; openEvents(); }); await p.screenshot({ path: path.join(SHOTS, "events.png") }); }
  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed"); await b.close(); process.exit(bad ? 1 : 0);
})();
