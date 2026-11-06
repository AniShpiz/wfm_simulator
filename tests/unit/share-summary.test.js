// 📤 The monthly summary's insights — shipped code via extract.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const mk = cohorts => {
  const state = { settings: { target: 90, primaryMetric: "ar" }, cohorts: cohorts || [] };
  return sandbox(["shareInsights"], [], {
    state, pct: v => (v * 100).toFixed(1) + "%", primName: () => "AR", fmtDs: d => d,
    cohortFloorDate: c => c.floor, cohortEffective: c => c.n });
};
const mo = (label, tag, ar, met, n, from, to) => ({ label, tag, ar, met, n, from, to });
const M = [mo("Aug", "act", 0.775, 0, 26, "2026-08-01", "2026-08-31"), mo("Sep", "act", 0.776, 0, 24, "2026-09-01", "2026-09-30"),
  mo("Oct", "mix", 0.774, 0, 26, "2026-10-01", "2026-10-31"), mo("Nov", "fc", 0.734, 0, 26, "2026-11-01", "2026-11-30"),
  mo("Dec", "fc", 0.74, 0, 27, "2026-12-01", "2026-12-31")];

test("summary: no 'strongest month' when no month reached the target on any day", () => {
  const out = mk().shareInsights(M);
  assert.ok(!out.some(x => x.startsWith("insBest")), out.join(" | "));
  const M2 = M.map(g => g.label === "Sep" ? { ...g, met: 5 } : g);
  assert.ok(mk().shareInsights(M2).some(x => x.startsWith("insBest")));
});

test("summary: the forecast line is about the forecast months (a mixed month is not 'forecast')", () => {
  const out = mk().shareInsights(M), r = out.find(x => x.startsWith("insRisk"));
  assert.ok(r && r.startsWith("insRiskAll"), out.join(" | "));
  assert.ok(r.includes('"m":"Nov"') && r.includes('"z":"Dec"'), r);
  assert.ok(r.includes('"v":"73.4%"') && r.includes('"w":"74.0%"'), r);
});

test("summary: every course joining ahead, in one line", () => {
  const cs = [{ name: "a", floor: "2026-11-18", n: 7 }, { name: "b", floor: "2026-11-19", n: 4 }, { name: "c", floor: "2026-12-20", n: 6 }, { name: "old", floor: "2026-09-01", n: 9 }];
  const out = mk(cs).shareInsights(M), c = out.filter(x => x.startsWith("insCourse"));
  assert.strictEqual(c.length, 1, out.join(" | "));
  assert.ok(c[0].startsWith("insCourses") && c[0].includes('"k":3') && c[0].includes('"n":17') && c[0].includes('"d":"2026-12-20"'), c[0]);
});
