// ✎ The real answer rate of a day the file doesn't hold yet (settings.arNote), typed in the matrix header: its extra
// abandoned calls come back on the next two working days — in the forecast, with the ▲ cause on the typed day and the
// "↩ +n" tag on the days that receive them. "Today" = Sun 05-Jul-2026; the file ends Thu 02-Jul-2026.
const puppeteer = require("puppeteer-core");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "index.html").replace(/\\/g, "/");

const fcCSV = (() => { const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע,נציגים"], W = 10, d0 = new Date(2026, 5, 28 - (W - 1) * 7);
  for (let w = 0; w < W; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5), ds = String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/2026";
    for (let h = 8; h < 18; h++) for (const m of ["00", "30"]) rows.push(`${ds},${h}:${m},${70 + (h % 5) * 8 + ((w + h + d) % 3)},300,30`); }
  return rows.join("\n"); })();

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new", defaultViewport: { width: 1400, height: 900 } });
  const p = await b.newPage();
  const errs = [], out = [];
  const ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.evaluateOnNewDocument(() => { window.__now = new Date(2026, 6, 5, 16, 0).getTime(); const D = Date;
    class FD extends D { constructor(...a) { super(...(a.length ? a : [window.__now])); } static now() { return window.__now; } } window.Date = FD; });
  await p.goto("file:///" + APP, { waitUntil: "load" });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  await p.evaluate(async csv => { setLang("en"); state.settings.autoHolidays = false; const f = new File([csv], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast");
    document.getElementById("tab-matrix").click(); state.week = "2026-07-05"; renderMatrix(); }, fcCSV);
  const day = ds => p.evaluate(ds => { let v = 0; for (const r of forecastDay(ds).values()) v += r.volume; return v; }, ds);
  const look = () => p.evaluate(() => ({ fields: [...document.querySelectorAll("#matrixTable th .arNote")].map(l => l.closest("th").textContent.replace(/\s+/g, " ").slice(0, 40)), tip: (document.querySelector(".arNote") || {}).title || "",
    pills: document.querySelectorAll("#matrixTable .retPill").length, cause: document.querySelectorAll("#matrixTable .retCauseTag").length, note: state.settings.arNote || null }));
  const v0 = { sun: await day("2026-07-05"), mon: await day("2026-07-06"), tue: await day("2026-07-07"), wed: await day("2026-07-08") };
  let s = await look();
  ok(s.fields.length === 1 && /today/i.test(s.fields[0]) && s.pills === 0 && s.cause === 0, "the field is on the day the file doesn't hold yet (today) and nowhere else — " + s.fields[0]);

  // ---- when it opens: not in the morning (too few of the day's calls to say anything), from mid-day on, reading "so far"
  const am = await p.evaluate(() => { window.__now = new Date(2026, 6, 5, 9, 0).getTime(); renderMatrix(); const n = document.querySelectorAll("#matrixTable th .arNote").length, sh = arNoteShare("2026-07-05");
    window.__now = new Date(2026, 6, 5, 16, 0).getTime(); mxTimeMarks(); const l = document.querySelector("#matrixTable th .arNote"); return { n, sh, back: !!l, lab: l ? l.textContent : "", tip: l ? l.title : "", sh2: arNoteShare("2026-07-05") }; });
  ok(am.n === 0 && am.sh < 0.2 && am.back && /so far/.test(am.lab) && am.sh2 >= 0.5 && /calls have come so far/.test(am.tip), `at 09:00 (${Math.round(am.sh * 100)}% of the day's calls) no field; by 16:00 (${Math.round(am.sh2 * 100)}%) it opens by itself — "${am.lab.trim()}"`);

  // ---- 70% answered today (the usual: 10% abandoned at a 90% target) ----
  await p.evaluate(() => { const i = document.querySelector("#matrixTable th .arNote input"); i.value = 70; i.dispatchEvent(new Event("change")); });
  const v1 = { sun: await day("2026-07-05"), mon: await day("2026-07-06"), tue: await day("2026-07-07"), wed: await day("2026-07-08") };
  const X = (0.30 - 0.10) * v0.sun, back = X * 0.4;
  s = await look();
  ok(Math.abs(v1.sun - v0.sun) < 0.5 && Math.abs((v1.mon - v0.mon) - back * 0.75) < 1 && Math.abs((v1.tue - v0.tue) - back * 0.25) < 1 && Math.abs(v1.wed - v0.wed) < 0.5,
    `70% today → ${Math.round(back)} calls come back: +${Math.round(v1.mon - v0.mon)} tomorrow, +${Math.round(v1.tue - v0.tue)} the day after, nothing later`);
  ok(s.note && s.note["2026-07-05"] === 70 && s.pills >= 1 && s.cause >= 1 && /will come back/.test(s.tip), "the matrix marks it like a measured day: ▲ on today, ↩ +n on the days that receive — " + s.tip.split("\n").pop());
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("wfmSimWorkspace") || "{}"));
  ok(JSON.stringify(saved).includes('"arNote"'), "it is kept with the workspace");

  // ---- a good day sends nothing back; clearing the field removes it; the ↩ switch rules it ----
  await p.evaluate(() => { const i = document.querySelector("#matrixTable th .arNote input"); i.value = 95; i.dispatchEvent(new Event("change")); });
  ok(Math.abs((await day("2026-07-06")) - v0.mon) < 0.5 && (await look()).pills === 0, "95% today: no extra abandons, nothing comes back");
  await p.evaluate(() => { const i = document.querySelector("#matrixTable th .arNote input"); i.value = 70; i.dispatchEvent(new Event("change")); state.settings.cuOn = false; state.fcCache.clear(); renderAll(); });
  s = await look();
  ok(Math.abs((await day("2026-07-06")) - v0.mon) < 0.5 && s.fields.length === 0, "↩ off: no returning calls and no field");
  await p.evaluate(() => { state.settings.cuOn = true; state.fcCache.clear(); renderAll(); const i = document.querySelector("#matrixTable th .arNote input"); i.value = ""; i.dispatchEvent(new Event("change")); });
  s = await look();
  ok(Math.abs((await day("2026-07-06")) - v0.mon) < 0.5 && s.note && s.note["2026-07-05"] === undefined, "an emptied field removes the day");

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed");
  await b.close(); process.exit(bad ? 1 : 0);
})();
