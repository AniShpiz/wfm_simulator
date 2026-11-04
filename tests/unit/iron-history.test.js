// The iron's memory: one snapshot per week of the file's sidur, compared with the week before — shipped code via extract.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const rep = (team, days) => ({ team, days: Object.fromEntries(Object.entries(days).map(([di, p]) => [di, { s: p[0][0], e: p[0][1], h: 0, parts: p }])) });
function mk() {
  const state = { settings: {}, iron: null };
  const S = sandbox(["ironSnap", "recordIronHist", "ironChanges", "ironParts", "sundayOf", "fromISO", "iso", "pad"], ["icHrs", "icWeek", "toMinW"], { state, saveState: () => {} });
  S.state = state; return S;
}
const W45 = "2026-11-01", W46 = "2026-11-08", W44 = "2026-10-25";
const load = (S, emps, wk) => { S.state.iron = { emps: new Map(Object.entries(emps)), total: 0 }; S.recordIronHist(wk); };
const A = { a: rep("T1", { 0: [["08:00", "16:00"]] }) }, B = { a: rep("T1", { 0: [["08:00", "14:00"]] }) };

test("iron memory: the first upload is silent, an identical one adds nothing", () => {
  const S = mk();
  load(S, A, W45);
  assert.strictEqual(S.ironChanges(), null, "nothing to compare yet");
  load(S, A, W45);
  load(S, A, W46);
  assert.strictEqual(S.state.settings.ironHist.length, 1, "same iron → no new snapshot, even in another week");
});

test("iron memory: fewer hours, a moved shift, a removed day, a new and a gone rep", () => {
  const S = mk();
  load(S, { a: rep("T1", { 0: [["08:00", "16:00"]], 1: [["08:00", "16:00"]], 2: [["08:00", "12:00"]] }), b: rep("T2", { 0: [["09:00", "17:00"]] }) }, W45);
  load(S, { a: rep("T1", { 0: [["08:00", "14:00"]], 1: [["10:00", "18:00"]] }), c: rep("T2", { 3: [["08:00", "12:00"]] }) }, W46);
  const C = S.ironChanges(), by = Object.fromEntries(C.list.map(x => [x.n, x]));
  assert.strictEqual(C.from, W45);
  const a = by.a.days.map(d => d.di + ":" + d.k).sort();
  assert.deepStrictEqual(a, ["0:down", "1:move", "2:del"]);
  assert.strictEqual(by.a.dh, -6, "2h less on Sunday + a 4h day removed; the move is 0");
  assert.deepStrictEqual(by.b.kinds, ["gone"]); assert.strictEqual(by.b.dh, -8);
  assert.deepStrictEqual(by.c.kinds, ["new"]); assert.strictEqual(by.c.dh, 4);
});

test("iron memory: keeps only the last 12 changes", () => {
  const S = mk();
  for (let i = 0; i < 15; i++) load(S, { a: rep("T1", { 0: [["08:00", String(9 + i).padStart(2, "0") + ":00"]] }) }, S.iso(new Date(2026, 0, 4 + 7 * i)));
  assert.strictEqual(S.state.settings.ironHist.length, 12);
});

test("iron memory: this week's file, next week's, this week's, next week's — one comparison, never flipped", () => {
  const S = mk();
  load(S, A, W45); load(S, B, W46); load(S, A, W45); load(S, B, W46); load(S, A, W45);
  const H = S.state.settings.ironHist;
  assert.deepStrictEqual(H.map(h => h.wk), [W45, W46], "one snapshot per week, in week order");
  // this week's file is loaded: its iron has no earlier week to compare with → silence
  assert.strictEqual(S.ironChanges(), null);
  load(S, B, W46);
  const C = S.ironChanges();
  assert.strictEqual(C.from, W45); assert.strictEqual(C.to, W46);
  assert.strictEqual(C.list[0].days[0].k, "down", "week 46 has fewer hours than week 45 — the same answer after any order of uploads");
});

test("iron memory: the latest file of a week replaces that week; a later week's file stays out of an earlier week's view", () => {
  const S = mk();
  load(S, A, W44); load(S, B, W45);
  const C2 = { a: rep("T1", { 0: [["08:00", "18:00"]] }) };
  load(S, C2, W46);
  load(S, A, W45); // week 45's file again, now with the same iron as week 44 → week 45 keeps nothing
  assert.deepStrictEqual(S.state.settings.ironHist.map(h => h.wk), [W44, W46]);
  assert.strictEqual(S.ironChanges(), null, "week 45 loaded: its iron = week 44's, nothing changed for it");
});

test("iron memory: an older save (no week on the snapshots) is read by its upload's week", () => {
  const S = mk();
  S.state.settings.ironHist = [{ at: "2026-10-27", reps: S.ironSnap() || {} }];
  S.state.settings.ironHist[0].reps = { a: { t: "T1", d: { 0: "08:00-16:00" } } };
  load(S, B, W45);
  const H = S.state.settings.ironHist;
  assert.deepStrictEqual(H.map(h => h.wk), [W44, W45]);
  assert.strictEqual(S.ironChanges().list[0].dh, -2);
});

// ⛓ the iron in effect on a day: an older week's file never rolls the future back to its iron
function mkAt() {
  const state = { settings: {}, iron: null, capSkills: null, rosterMeta: new Map() };
  const S = sandbox(["ironSnap", "recordIronHist", "ironEmpsFor", "ironNewerWk", "ironCapAt", "ironParts", "friW", "friLast", "halfHoursBetween", "bucket30", "addHalf", "addDays", "sundayOf", "fromISO", "iso", "pad"],
    ["icHrs", "toMinW"], { state, saveState: () => {} });
  S.state = state; return S;
}
const W47 = "2026-11-15";
const T8 = { a: rep("T1", { 2: [["08:00", "16:00"]] }), b: rep("T1", { 2: [["08:00", "12:00"]] }) }; // Tuesday: a 08–16, b 08–12
const T9 = { a: rep("T1", { 2: [["08:00", "16:00"]] }) };                                           // b's Tuesday removed

test("iron in effect: last week's file loaded → this week and later read the newer iron; last week reads its own", () => {
  const S = mkAt();
  load(S, T8, W45);           // this week's file: a + b on Tuesday
  load(S, T9, W44);           // last week's file loaded now: only a
  assert.strictEqual(S.state.iron.wk, W44);
  assert.strictEqual(S.ironCapAt("2026-11-17", 2, "09:00"), 2, "week 47 Tuesday: week 45's iron (a + b), not the loaded older one");
  assert.strictEqual(S.ironCapAt("2026-11-03", 2, "09:00"), 2, "this week: week 45's iron");
  assert.strictEqual(S.ironCapAt("2026-10-27", 2, "09:00"), 1, "last week: its own (loaded) iron");
  assert.strictEqual(S.ironNewerWk(), W45, "the chip's hover names the newer week");
  assert.strictEqual(S.ironEmpsFor("2026-11-17").get("a").team, "T1");
});

test("iron in effect: the newest file loaded → its own iron everywhere, nothing to say", () => {
  const S = mkAt();
  load(S, T9, W44); load(S, T8, W45);
  assert.strictEqual(S.ironEmpsFor("2026-11-17"), S.state.iron.emps);
  assert.strictEqual(S.ironCapAt("2026-11-17", 2, "09:00"), 2);
  assert.strictEqual(S.ironNewerWk(), null);
});

test("iron in effect: a week between two files reads the latest one before it", () => {
  const S = mkAt();
  load(S, T8, W44); load(S, T9, W46); load(S, T8, W44);
  assert.strictEqual(S.ironCapAt("2026-11-03", 2, "09:00"), 2, "week 45: week 44's iron is the latest up to then");
  assert.strictEqual(S.ironCapAt(S.addDays(W47, 2), 2, "09:00"), 1, "week 47: week 46's iron");
});
