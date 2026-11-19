// 💾 The team's settings file (wfm-config.js next to index.html): read on every open with no permission; a browser with
// nothing saved opens with it; a person's own change stays theirs; a NEWER team file is taken once by everyone; without
// the file nothing changes. The app is copied into a temp folder (as on the network folder) with and without the file.
const puppeteer = require("puppeteer-core");
const path = require("path"), fs = require("fs"), os = require("os");
const SRC = path.join(__dirname, "..", "..", "index.html");
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "wfm-team-")), APP = path.join(DIR, "index.html");
fs.copyFileSync(SRC, APP);
const team = (at, cap, extra) => `window.WFM_TEAM=${JSON.stringify({ app: "wfm-simulator", v: 1, at, settings: { target: 85, brk: { cap, spare: 15 }, answerSkills: ["קו 1", "מרפאות"], ...(extra || {}) }, cohorts: [{ name: "קורס צוות", site: "", count: 0, req: 12, start: "2026-12-06", duration: 20, yield: 80 }] })};`;

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
  const errs = [], out = [], ok = (c, m) => out.push((c ? "ok   " : "not ok ") + m);
  const p = await b.newPage(); p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  const url = "file:///" + APP.replace(/\\/g, "/"), get = () => p.evaluate(() => ({ target: state.settings.target, cap: (state.settings.brk || {}).cap, sk: state.settings.answerSkills, crs: state.cohorts.map(c => c.name), team: !!window.WFM_TEAM, now: (document.getElementById("teamNow") || {}).textContent, lang }));

  // ---- no team file: the app opens as always ----
  await p.goto(url, { waitUntil: "load" }); await p.evaluate(() => { localStorage.clear(); setLang("en"); saveState(); }); await p.reload({ waitUntil: "load" });
  let r = await get();
  ok(!r.team && r.target === 90 && !r.crs.length && /Save your settings as a file next to the app/.test(r.now) && !errs.length, `no team file: the app opens as always (target ${r.target}%) — Settings says what the file would do`);

  // ---- a team file next to the app + a browser with nothing saved → its settings ----
  fs.writeFileSync(path.join(DIR, "wfm-config.js"), team("2026-11-19T10:00:00Z", 7));
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" }); r = await get();
  ok(r.team && r.target === 85 && r.cap === 7 && r.sk.join() === "קו 1,מרפאות" && r.crs.join() === "קורס צוות" && /The team's settings from .+ are in use|ההגדרות של הצוות מ־.+/.test(r.now),
    `a browser with nothing saved opens with the team's settings: target ${r.target}%, breaks ${r.cap} per slot, skills ${r.sk.join(" + ")}, the courses — "${r.now.slice(0, 48)}…"`);

  // ---- a person's own change stays theirs ----
  await p.evaluate(() => { state.settings.target = 92; saveState(); }); await p.reload({ waitUntil: "load" }); r = await get();
  ok(r.target === 92 && r.cap === 7, `a person's own change stays theirs after a reload (target ${r.target}%), the rest is still the team's`);

  // ---- a NEWER team file: taken once, then personal again ----
  fs.writeFileSync(path.join(DIR, "wfm-config.js"), team("2026-11-20T08:00:00Z", 9));
  await p.reload({ waitUntil: "load" }); r = await get(); const t1 = r;
  await p.evaluate(() => { state.settings.target = 88; saveState(); }); await p.reload({ waitUntil: "load" }); r = await get();
  ok(t1.target === 85 && t1.cap === 9 && r.target === 88 && r.cap === 9, `a newer team file is taken once (target ${t1.target}%, breaks ${t1.cap}); a change after it stays (target ${r.target}%)`);

  // ---- saving: the file the app writes reads back as the same settings ----
  r = await p.evaluate(() => { const o = teamBuild(); return { has: o.app === "wfm-simulator" && !!o.at && o.settings.target === 88 && !("fdSeen" in o.settings), n: Object.keys(o.settings).length }; });
  ok(r.has && r.n > 40, `"💾 Save these settings for the team" writes every setting (${r.n}) and the courses — nothing of this computer (what was read from folders)`);
  await b.close();

  // ---- the launcher: Chrome, else Edge, else the default browser — always the same browser = the same saved settings ----
  const cmd = fs.readFileSync(fs.readdirSync(path.join(__dirname, "..", "..")).filter(f => /\.cmd$/i.test(f)).map(f => path.join(__dirname, "..", "..", f))[0], "latin1");
  const iC = cmd.indexOf("chrome.exe"), iE = cmd.indexOf("msedge.exe"), iD = cmd.lastIndexOf('start "" "%APP%"');
  ok(iC > 0 && iE > iC && iD > iE && /%~dp0index\.html/.test(cmd) && /\r\n/.test(cmd) && !/[^\x00-\x7f]/.test(cmd), "the launcher opens index.html next to it: Chrome first, then Edge, then the default browser (Windows line endings, plain ASCII)");
  fs.rmSync(DIR, { recursive: true, force: true });

  console.log(out.join("\n")); if (errs.length) console.log(errs.join("\n"));
  const bad = out.filter(l => l.startsWith("not ok")).length + errs.length;
  console.log(bad ? `\n${bad} FAILED` : "\nall passed"); process.exit(bad ? 1 : 0);
})();
