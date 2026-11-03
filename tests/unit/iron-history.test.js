// The iron's memory: one snapshot per upload, compared with the one before — shipped code via extract.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const rep = (team, days) => ({ team, days: Object.fromEntries(Object.entries(days).map(([di, p]) => [di, { s: p[0][0], e: p[0][1], h: 0, parts: p }])) });
function mk() {
  const state = { settings: {}, iron: null };
  const S = sandbox(["ironSnap", "recordIronHist", "ironChanges", "ironParts", "iso", "pad"], ["icHrs", "icWeek", "toMinW"], { state, saveState: () => {} });
  S.state = state; return S;
}
const load = (S, emps) => { S.state.iron = { emps: new Map(Object.entries(emps)), total: 0 }; S.recordIronHist(); };

test("iron memory: the first upload is silent, an identical one adds nothing", () => {
  const S = mk();
  load(S, { a: rep("T1", { 0: [["08:00", "16:00"]] }) });
  assert.strictEqual(S.ironChanges(), null, "nothing to compare yet");
  load(S, { a: rep("T1", { 0: [["08:00", "16:00"]] }) });
  assert.strictEqual(S.state.settings.ironHist.length, 1, "same iron → no new snapshot");
});

test("iron memory: fewer hours, a moved shift, a removed day, a new and a gone rep", () => {
  const S = mk();
  load(S, { a: rep("T1", { 0: [["08:00", "16:00"]], 1: [["08:00", "16:00"]], 2: [["08:00", "12:00"]] }), b: rep("T2", { 0: [["09:00", "17:00"]] }) });
  load(S, { a: rep("T1", { 0: [["08:00", "14:00"]], 1: [["10:00", "18:00"]] }), c: rep("T2", { 3: [["08:00", "12:00"]] }) });
  const C = S.ironChanges(), by = Object.fromEntries(C.list.map(x => [x.n, x]));
  const a = by.a.days.map(d => d.di + ":" + d.k).sort();
  assert.deepStrictEqual(a, ["0:down", "1:move", "2:del"]);
  assert.strictEqual(by.a.dh, -6, "2h less on Sunday + a 4h day removed; the move is 0");
  assert.deepStrictEqual(by.b.kinds, ["gone"]); assert.strictEqual(by.b.dh, -8);
  assert.deepStrictEqual(by.c.kinds, ["new"]); assert.strictEqual(by.c.dh, 4);
});

test("iron memory: keeps only the last 12 uploads", () => {
  const S = mk();
  for (let i = 0; i < 15; i++) load(S, { a: rep("T1", { 0: [["08:00", String(9 + i).padStart(2, "0") + ":00"]] }) });
  assert.strictEqual(S.state.settings.ironHist.length, 12);
});
