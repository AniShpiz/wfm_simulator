// 🧮 "How are the numbers calculated?" (Settings) — the play window: one half hour (Erlang) and the forecast models.
// Checks it opens with and without a file, that the sliders / scenarios move the pictures, that the numbers are the
// app's own (requiredAgents, rankModels) and that a model added to the registry is playable by itself.
// Optional: set LG_SHOTS=<folder> to save a screenshot of each tab.
const puppeteer = require("puppeteer-core");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "index.html").replace(/\\/g, "/");
const SHOTS = process.env.LG_SHOTS;

const fcCSV = (() => { // 8 weeks, Sun–Thu, 10-May … 02-Jul-2026, a slow rise
  const rows = ["תאריך,שעה,שיחות,אורך שיחה ממוצע"], d0 = new Date(2026, 4, 10);
  for (let w = 0; w < 8; w++) for (let d = 0; d < 5; d++) { const dt = new Date(d0.getTime() + (w * 7 + d) * 864e5), ds = String(dt.getDate()).padStart(2, "0") + "/" + String(dt.getMonth() + 1).padStart(2, "0") + "/2026";
    for (let h = 8; h < 18; h++) for (const m of ["00", "30"]) rows.push(`${ds},${h}:${m},${Math.round((40 + (h % 5) * 9 + d * 3) * (1 + w * 0.02) + ((w * 7 + h) % 3))},${280 + (h % 4) * 10 + (w % 2) * 6}`); }
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
  const look = () => p.evaluate(() => { const q = s => document.querySelector(s), n = s => document.querySelectorAll(s).length, vis = s => { const e = q(s); return !!e && getComputedStyle(e).display !== "none"; };
    return { open: q("#modalBg").classList.contains("show") && !q("#lgPanel").hidden, title: q("#mTitle").textContent, erl: vis("#lgErl"), fc: vis("#lgFc"), pre: vis("#lgPre"), src: q("#lgSrc").textContent,
      chips: n("#lgEq .lgChip"), need: +q("#lgEq .lgChip.nd b").textContent, dots: n("#lgDots i"), red: n("#lgDots i.a"), amber: n("#lgDots i.w"), race: vis("#lgRaceD"), raceRed: n("#lgRaceDots i.a"),
      chart: n("#lgChart svg polyline"), sim: n("#lgSim svg rect"), simRes: q("#lgSimRes").textContent, inv: vis("#lgInv"), bars: n("#lgBars .lgBar"), barTop: (q("#lgBars .lgBar b") || {}).textContent,
      cards: [...document.querySelectorAll("#lgCards .lgCard")].map(c => ({ mid: c.dataset.mid, on: c.classList.contains("on"), err: (c.querySelector(".lgErr small") || {}).textContent || "", nx: c.querySelector(".lgNx").textContent, why: !!c.querySelector(".lgWhy"), txt: c.textContent })),
      pts: n("#lgFcChart [data-i]"), fcSrc: q("#lgFcSrc").textContent, reset: vis("#lgFcReset"), pipe: n("#lgPipe .lgStepC"), read: q("#lgRead").textContent }; });
  const shot = async name => { if (SHOTS) await (await p.$("#modal")).screenshot({ path: path.join(SHOTS, name + ".png") }); };

  // ---- no file: still a place to play, on example numbers ----
  await p.evaluate(() => { setLang("en"); document.getElementById("tab-settings").click(); document.getElementById("revealLogic").click(); });
  let s = await look();
  ok(s.open && s.erl && !s.fc, "the button opens the window on the half-hour tab");
  ok(!s.pre && !s.inv && /Example/.test(s.src), "no file: example numbers, no presets, no week bars — " + s.src);
  ok(s.chips === 6 && s.need > 20 && s.dots === 100 && s.chart === 2 && s.sim > 20, `the equation, 100 callers, the curve and the simulated half hour are drawn (need ${s.need})`);
  await p.evaluate(() => document.querySelector('#lgTabs [data-tab="fc"]').click());
  s = await look();
  ok(s.fc && s.cards.length === 9 && s.pts === 10 && s.pipe === 6 && s.cards.every(c => !c.err), "no file: the models play on an example series, without error numbers");
  await p.evaluate(() => document.getElementById("mClose").click());

  // ---- with a forecast file ----
  await p.evaluate(async csv => { const f = new File([csv], "fc.csv", { type: "text/csv" }); ingestSuccess(ingestRows(await bytesToGrid(await f.arrayBuffer()), "forecast"), "forecast"); }, fcCSV);
  await p.evaluate(() => { document.getElementById("tab-settings").click(); state.settings.lgTab = "erl"; document.getElementById("revealLogic").click(); });
  s = await look();
  const mine = await p.evaluate(() => ({ e: { ...LG.e0 }, req: lgReq(LG.e0), p: LG.p }));
  ok(s.pre && mine.p === "peak" && /2026/.test(s.src) && /forecast/.test(s.src), "the sliders start from the user's peak half hour, with its date — " + s.src);
  ok(s.need === mine.req, `the needed reps = requiredAgents (${s.need})`);
  ok(s.inv && s.bars >= 3 && /−/.test(s.barTop), `where to invest: ${s.bars} levers, the top one saves ${s.barTop}`);
  await shot("erl");
  const red0 = s.red;
  await p.evaluate(() => { const el = document.getElementById("lgN"); el.value = Math.max(1, Math.floor(LG.e.v * LG.e.aht / 1800 * 0.8)); el.dispatchEvent(new Event("input")); });
  s = await look();
  ok(s.red > red0 && s.red > 5 && s.race, `fewer reps than the load → more of the 100 callers give up (${red0} → ${s.red})`);
  await p.evaluate(() => { const el = document.getElementById("lgW"); el.value = LG.e.mpt; el.dispatchEvent(new Event("input")); });
  s = await look();
  ok(s.raceRed === 63, "waiting as long as the mean patience: 63 of 100 have hung up (" + s.raceRed + ")");
  await p.evaluate(() => document.querySelector('#lgPre [data-p="quiet"]').click());
  const quiet = await p.evaluate(() => LG.e0.v);
  ok(quiet < mine.e.v, `the quiet preset is a smaller half hour (${quiet} < ${mine.e.v})`);
  await p.evaluate(() => { document.getElementById("lgDice").click(); });
  await new Promise(r => setTimeout(r, 300));
  ok(/\d/.test((await look()).simRes), "🎲 plays another half hour");

  // ---- the forecast tab ----
  await p.evaluate(() => document.querySelector('#lgTabs [data-tab="fc"]').click());
  s = await look();
  const rk = await p.evaluate(() => ({ ids: rankModels("volume").map(x => x.mid), e0: t("btErr", { e: rankModels("volume")[0].r.mape.toFixed(1) }), all: Object.keys(Models.volume), use: state.settings.modelVolume }));
  ok(s.cards.length === rk.all.length && s.cards.map(c => c.mid).filter(m => rk.ids.includes(m)).join() === rk.ids.join() && s.cards[s.cards.length - 1].mid === "custom", "every model of the registry is a card, most accurate first; 🛠 my model waits last");
  ok(s.cards[0].err.startsWith(rk.e0), "the error is the 🧪 window's number — " + s.cards[0].err);
  ok(s.cards.filter(c => c.on).length === 1 && s.cards.find(c => c.on).mid === rk.use && s.cards.find(c => c.on).why, "the model in use is selected and explains itself");
  const lw0 = s.cards.find(c => c.mid === "lastweek").nx;
  await p.evaluate(() => document.querySelector('#lgSc [data-sc="spike"]').click());
  s = await look();
  const num = x => +x.replace(/[^\d.]/g, "");
  ok(Math.abs(num(s.cards.find(c => c.mid === "lastweek").nx) / num(lw0) - 1.5) < 0.01 && s.reset, `an odd last week: "previous week" copies it (${lw0} → ${s.cards.find(c => c.mid === "lastweek").nx})`);
  await p.evaluate(() => document.querySelector('#lgCards [data-mid="lastweek"]').click());
  await shot("fc");
  // drag a point
  const box = await p.evaluate(() => { const c = document.querySelector('#lgFcChart [data-i]:last-of-type'), r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, v: LG.arr[+c.dataset.i], i: +c.dataset.i }; });
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.mouse.move(box.x, box.y + 30, { steps: 4 }); await p.mouse.up();
  const after = await p.evaluate(i => LG.arr[i], box.i);
  ok(after < box.v, `dragging a point down lowers that week (${Math.round(box.v)} → ${Math.round(after)})`);
  await p.evaluate(() => document.querySelector('#lgKind [data-k="aht"]').click());
  s = await look();
  ok(s.cards.length === (await p.evaluate(() => Object.keys(Models.aht).length)) && /–/.test(s.fcSrc), "call length: its own models, on the weekday's busiest half hour — " + s.fcSrc);

  // ---- 🛠 my model: two knobs, live; it joins the ranking once set ----
  const my = await p.evaluate(() => { document.querySelector('#lgKind [data-k="volume"]').click(); document.querySelector('#lgCards [data-mid="custom"]').click(); const before = rankModels("volume").some(x => x.mid === "custom");
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("input")); }; set("lgTa", 1); set("lgTt", 0);
    const nx = m => document.querySelector('#lgCards [data-mid="' + m + '"] .lgNx').textContent, same = nx("custom") === nx("lastweek"), tune = !document.getElementById("lgTune").hidden;
    document.getElementById("lgFit").click();
    return { before, same, tune, p: state.settings.myModel.volume, after: rankModels("volume").some(x => x.mid === "custom"), res: document.getElementById("lgTuRes").textContent,
      fitE: backtestModel("volume", "custom").mape, lastE: backtestModel("volume", "lastweek").mape }; });
  ok(my.tune && !my.before && my.same, "my model: reacting 100% with no trend = previous week; not ranked until it is set");
  ok(my.after && my.fitE <= my.lastE + 1e-9 && /d/.test(my.res), `🎯 fit: ${JSON.stringify(my.p)} → ${my.res} (previous week ${my.lastE.toFixed(1)}%), and it now takes part in the ranking`);
  await p.evaluate(() => { delete state.settings.myModel; autoPickModels(); });

  // ---- 📊 the blended interval shape: tested with the two windows, used only when clearly lower ----
  const pb = await p.evaluate(() => { state._pbt = null; return profBacktest(); });
  const lo = pb && (+pb.smart.toFixed(1) < Math.min(+pb.adaptive.toFixed(1), +pb.w12.toFixed(1)) ? "smart" : pb.w12 < pb.adaptive ? "w12" : "adaptive");
  ok(pb && isFinite(pb.smart) && pb.best === lo, "interval shape test: " + JSON.stringify(pb));
  if (process.env.LG_SAMPLE) { // a real file: print what the test finds on it
    const csv = require("fs").readFileSync(process.env.LG_SAMPLE);
    const r = await p.evaluate(async b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      ingestSuccess(ingestRows(await bytesToGrid(u.buffer), "forecast"), "forecast"); state._pbt = null; return { pb: profBacktest(), days: state.days.size }; }, csv.toString("base64"));
    console.log("SAMPLE " + JSON.stringify(r)); }

  // ---- a model added later is playable by itself ----
  await p.evaluate(() => { Models.volume.zzNew = { label: "mLast", fn: s => (s[s.length - 1] || 0) * 2 }; document.getElementById("mClose").click(); document.getElementById("lgFcBtn").click(); document.querySelector('#lgKind [data-k="volume"]').click(); document.querySelector('#lgCards [data-mid="zzNew"]').click(); });
  s = await look();
  const z = s.cards.find(c => c.mid === "zzNew");
  ok(s.open && s.fc && z && z.on && z.err && !/lgM_/.test(z.txt), "a new registry model gets a card, an error and a forecast — and no broken text");
  await p.evaluate(() => { delete Models.volume.zzNew; document.getElementById("mClose").click(); });

  // ---- Hebrew ----
  await p.evaluate(() => { setLang("he"); state.settings.lgTab = "erl"; document.getElementById("revealLogic").click(); });
  s = await look();
  ok(s.open && s.title === "איך המספרים מחושבים?" && /נציגים/.test(s.read), "Hebrew: " + s.title + " · " + s.read);
  await shot("erl-he");

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed");
  await b.close(); process.exit(bad ? 1 : 0);
})();
