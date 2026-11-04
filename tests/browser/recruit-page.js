// 🎓 Recruitment page: no NaN, opens fast, the plan computed once — a forecast from today into the future (holiday half-days
// with 0 calls) + a current sidur + saved settings a user can leave behind (headcount 0, empty fields). Today = the real date.
const puppeteer = require("puppeteer-core"); const fs = require("fs"); const path = require("path");
const ROOT = path.join(__dirname, "..", ".."), APP = path.join(ROOT, "index.html").replace(/\\/g, "/");
const XLS = path.join(ROOT, "סידור עבודה מושלם שירות שבוע 27 עדכני.xls");
const pad = n => String(n).padStart(2, "0");
const fc = (() => { const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע,נציגים,שיחות נענות"]; const d = new Date(2026, 6, 1);
  for (; d < new Date(2027, 1, 28); d.setDate(d.getDate() + 1)) { const di = d.getDay(); if (di === 6) continue; const past = d < new Date(2026, 10, 4);
    for (let h = 8; h < (di === 5 ? 13 : 20); h++) for (const m of ["00", "30"]) { const v = 120 + (h % 6) * 25; rows.push(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()},${h}:${m},${v},300,${past ? 40 : ""},${past ? Math.round(v * .85) : ""}`); } }
  return rows.join("\n"); })();
const variants = { clean: {}, hc0: { headcount: 0 }, attrEmpty: { attrition: "" }, planPast: { planTo: "2026-01-01" }, oldCourse: "course" };
let bad = 0;
const NAN = () => { const pg = document.getElementById("page-recruit"), out = [];
  for (const el of pg.querySelectorAll("*")) { if (el.children.length) continue; if (el.offsetParent === null && el.tagName !== "tspan" && el.tagName !== "text") continue;
    const tx = el.textContent || ""; if (/NaN|Infinity|undefined/.test(tx)) { const c = el.closest("[id]"); out.push((c ? c.id : "?") + ": " + tx.slice(0, 70)); } }
  for (const el of pg.querySelectorAll("svg *")) for (const a of el.attributes) if (/NaN|Infinity/.test(a.value)) { const c = el.closest("[id]"); out.push((c ? c.id : "?") + " SVG " + el.tagName + "@" + a.name); break; }
  return [...new Set(out)].slice(0, 8); };
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const b64 = fs.readFileSync(XLS).toString("base64");
  for (const [name, v] of Object.entries(variants)) {
    const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); const errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.goto("file:///" + APP, { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" });
    await p.evaluate(async csv => { const f = new File([csv], "fc.csv"); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, fc);
    await p.evaluate(async b64 => { const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer; const res = await bytesToGrid(buf);
      const g = res.grids.map(s => ({ name: s.name, grid: (s.grid || s).map(r => r ? r.slice() : r) })), iron = g.find(s => /ברזל/.test(s.name)), ros = g.find(s => s !== iron && /סידור/.test(s.name)), hd = findHeader(ros.grid);
      for (let r = hd.row + 1; r < ros.grid.length; r++) { const row = ros.grid[r]; if (row && typeof row[hd.map.date] === "number") row[hd.map.date] += 17 * 7; } // week 27 → week 44 … today's week
      ingestSuccess(ingestRows({ grids: g }, "roster"), "roster"); }, b64);
    if (v === "course") await p.evaluate(() => { state.cohorts = [{ name: "x", start: "", duration: "", count: "abc", yield: "" }]; saveState(); });
    else if (Object.keys(v).length) await p.evaluate(v => { for (const k in v) state.settings[k] = v[k]; saveState(); }, v);
    await p.reload({ waitUntil: "load" }); // as the manager opens it: from the saved workspace
    const ms = await p.evaluate(() => { const t = performance.now(); document.getElementById("tab-recruit").click(); return Math.round(performance.now() - t); });
    const ms2 = await p.evaluate(() => { document.getElementById("tab-home").click(); const t = performance.now(); document.getElementById("tab-recruit").click(); return Math.round(performance.now() - t); });
    const r = await p.evaluate(NAN);
    const good = !r.length && !errs.length && ms < 3000; if (!good) bad++;
    console.log(`${good ? "ok   " : "not ok "}${name.padEnd(10)} open ${ms} ms, again ${ms2} ms  ${r.length ? "NaN → " + r.join(" | ") : "no NaN"}${errs.length ? "  ERR " + errs[0] : ""}`);
    if (name === "clean") { await p.reload({ waitUntil: "load" }); const n = await p.evaluate(() => { let k = 0; const f = window.hirePlanRaw; window.hirePlanRaw = function (...a) { k++; return f.apply(this, a); }; document.getElementById("tab-recruit").click(); return k; });
      console.log((n <= 1 ? "ok   " : "not ok ") + "the plan computed once on the first open (" + n + ")"); if (n > 1) bad++; }
    await p.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
