"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { sandbox } = require("../extract.js");

const XLS = path.join(__dirname, "..", "..", "סידור עבודה מושלם שירות שבוע 27 עדכני.xls");
const have = fs.existsSync(XLS);

const S = sandbox(["xlsToGrid", "findHeader", "matchHeader", "normHeader", "normDateAny", "normTimeAny", "pad", "iso", "colIdx"], ["SYN", "SYN_ORDER"]);

function load() {
  const buf = fs.readFileSync(XLS);
  return S.xlsToGrid(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

test("real workbook: all visible sheets parse with names", { skip: !have }, () => {
  const sheets = load();
  assert.ok(sheets.length >= 10, "expected many visible sheets, got " + sheets.length);
  const names = sheets.map(s => s.name);
  assert.ok(names.includes("סידור ברזל"));
  assert.ok(names.includes("סידור עבודה"));
  assert.ok(!names.includes("ADMIN"), "hidden helper sheets must be skipped");
});
test("real workbook: sidur header row maps site/team/skill (A/J/N)", { skip: !have }, () => {
  const g = load().find(s => s.name === "סידור עבודה").grid;
  const hd = S.findHeader(g.filter(r => r && r.length));
  assert.equal(hd.map.site, 0);   // A מוקד
  assert.equal(hd.map.team, 9);   // J מנהל צוות
  assert.equal(hd.map.skill, 13); // N מיומנות
});
test("real workbook: string-formula cells carry values (STRING records)", { skip: !have }, () => {
  const g = load().find(s => s.name === "סידור ברזל").grid;
  const hd = S.findHeader(g.filter(r => r && r.length));
  let sites = 0, teams = 0, skills = 0;
  for (let r = hd.row + 1; r < g.length; r++) {
    const row = g[r]; if (!row) continue;
    if (String(row[0] ?? "").trim()) sites++;
    if (String(row[9] ?? "").trim()) teams++;
    if (String(row[13] ?? "").trim()) skills++;
  }
  assert.ok(sites > 100, "site column looks empty: " + sites);
  assert.ok(teams > 100, "team column looks empty: " + teams);
  assert.ok(skills > 100, "skill column looks empty: " + skills);
});
test("real workbook: dates are week-27 serials, times are fractions", { skip: !have }, () => {
  const g = load().find(s => s.name === "סידור עבודה").grid;
  const dates = new Set(), times = new Set();
  for (let r = 1; r < g.length; r++) {
    const row = g[r]; if (!row) continue;
    const d = S.normDateAny(row[3]); if (d) dates.add(d);
    const tm = S.normTimeAny(row[1]); if (tm) times.add(tm);
  }
  assert.ok(dates.has("2026-07-05") && dates.has("2026-07-10"));
  assert.equal([...dates].filter(d => d < "2026-07-05" || d > "2026-07-10").length, 0,
    "no dates outside the sidur week");
  assert.ok(times.size >= 3, "expected several distinct start times");
});
