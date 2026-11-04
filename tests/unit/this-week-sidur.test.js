// 📅 This week's sidur kept for the matrix while next week's is loaded + the Friday memory under alternating uploads
// — shipped code via extract.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const TODAY = "2026-11-04", W45 = "2026-11-01", W46 = "2026-11-08";
function mk() {
  const store = {};
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const state = { settings: {}, rosterCap: new Map(), rosterCapWeekly: new Map(), rosterCapSkill: {}, rosterDates: new Set(), rosterDays: new Set(),
    schedRows: [], unallocRows: [], vacations: [], capSkills: null, agWhatIf: new Map(), nowSidur: null, iron: null, maxDate: null };
  const S = sandbox(["keepNowSidur", "setNowSidur", "nowSidOn", "sidurRowsOn", "capacityFor", "capCounted", "capCountedFrom", "recordFriHist",
    "sundayOf", "weekDates", "addDays", "fromISO", "iso", "pad"], ["PERSIST_NOW"],
    { state, localStorage, memo: { clear() {} }, saveState: () => {}, lensScale: () => 1, ironCapAt: () => 0 });
  S.state = state; S.store = store; return S;
}
// a sidur file of one week: rep "a" (skill kav1) 08:00–09:00 every day, rep "b" (skill senior) on Sunday only; Friday: a
function sidur(S, wk, nA = 1) {
  const st = S.state, cap = new Map(), sk = {}, rows = [];
  for (let i = 0; i < 6; i++) {
    const ds = S.addDays(wk, i);
    for (const tm of ["08:00", "08:30"]) {
      const k = ds + "|" + tm, n = i === 0 ? nA + 1 : nA;
      cap.set(k, n); sk[k] = i === 0 ? { kav1: nA, senior: 1 } : { kav1: nA };
    }
    rows.push({ name: "a", ds, di: i, s: "08:00", e: "09:00", h: 1, team: "T1", skill: "kav1" });
    if (i === 0) rows.push({ name: "b", ds, di: 0, s: "08:00", e: "09:00", h: 1, team: "T2", skill: "senior" });
  }
  st.rosterCap = cap; st.rosterCapSkill = sk; st.schedRows = rows; st.unallocRows = []; st.vacations = [];
  st.rosterDates = new Set([...cap.keys()].map(k => k.slice(0, 10)));
  S.recordFriHist(); S.keepNowSidur(TODAY);
}
const cap = (S, ds, tm = "08:00") => S.capacityFor(ds, S.fromISO(ds).getDay(), tm, { agents: 99 });

test("this week's sidur stays in the matrix when next week's is loaded", () => {
  const S = mk();
  sidur(S, W45);
  assert.strictEqual(S.state.nowSidur.wk, W45);
  sidur(S, W46, 3);
  assert.strictEqual(S.state.nowSidur.wk, W45, "next week's upload leaves this week's copy");
  assert.strictEqual(cap(S, "2026-11-04"), 1, "this week's day → this week's sidur");
  assert.strictEqual(cap(S, "2026-11-01"), 2);
  assert.strictEqual(cap(S, "2026-11-04", "12:00"), 0, "a half hour the sidur doesn't mention = nobody (ground truth, like the loaded one)");
  assert.strictEqual(cap(S, "2026-11-11"), 3, "next week's day → the loaded sidur");
  assert.strictEqual(cap(S, "2026-10-28"), 99, "last week → neither (the file's own history)");
});

test("the 🎧 skills scope the kept copy like the loaded sidur", () => {
  const S = mk();
  sidur(S, W45); sidur(S, W46);
  S.state.capSkills = ["kav1"];
  assert.strictEqual(cap(S, "2026-11-01"), 1, "Sunday: a (kav1) counts, b (senior) doesn't");
});

test("who is on / the breaks read the kept shifts for this week, the loaded ones for next week", () => {
  const S = mk();
  sidur(S, W45); sidur(S, W46);
  assert.deepStrictEqual(S.sidurRowsOn("2026-11-01").map(r => r.name).sort(), ["a", "b"]);
  assert.strictEqual(S.sidurRowsOn("2026-11-01")[0].ds, "2026-11-01");
  assert.ok(S.sidurRowsOn("2026-11-08").every(r => r.ds === "2026-11-08"));
  assert.strictEqual(S.nowSidOn("2026-11-08"), null);
});

test("uploading this week's sidur again replaces the copy (the latest upload wins)", () => {
  const S = mk();
  sidur(S, W45); sidur(S, W46); sidur(S, W45, 5); sidur(S, W46);
  assert.strictEqual(cap(S, "2026-11-04"), 5);
});

test("an empty sidur of this week replaces the copy too — the days fall back like a loaded empty sidur", () => {
  const S = mk();
  sidur(S, W45); sidur(S, W46);
  const st = S.state; st.rosterCap = new Map(); st.rosterCapSkill = {}; st.schedRows = []; st.rosterDates = new Set();
  st.unallocRows = [{ name: "a", ds: "2026-11-02", di: 1, status: "", hours: 8 }];
  S.keepNowSidur(TODAY);
  assert.strictEqual(st.nowSidur.dates.size, 0);
  assert.strictEqual(cap(S, "2026-11-04"), 99);
});

test("once the week is over the copy is gone — never carried into the next week", () => {
  const S = mk();
  sidur(S, W45); sidur(S, W46);
  assert.ok(S.store[S.PERSIST_NOW], "kept on this computer");
  // Sunday of week 46, week 46's sidur loaded → it is now this week's copy; week 45's is dropped
  S.keepNowSidur("2026-11-08");
  assert.strictEqual(S.state.nowSidur.wk, W46);
  assert.ok(!JSON.parse(S.store[S.PERSIST_NOW]).cap["2026-11-04|08:00"], "no day of week 45 left");
  // Sunday of week 47, an old sidur loaded → nothing to keep, the key is removed
  sidur(S, W45);
  S.keepNowSidur("2026-11-15");
  assert.strictEqual(S.state.nowSidur, null);
  assert.strictEqual(S.store[S.PERSIST_NOW], undefined);
});

test("nothing loaded yet (start-up before the data) never wipes the stored copy", () => {
  const S = mk();
  sidur(S, W45); sidur(S, W46);
  const saved = S.store[S.PERSIST_NOW];
  const st = S.state; st.nowSidur = null; st.rosterCap = new Map(); st.schedRows = []; st.rosterDates = new Set();
  S.keepNowSidur(TODAY);
  assert.strictEqual(S.store[S.PERSIST_NOW], saved);
  S.setNowSidur(JSON.parse(saved));
  assert.strictEqual(cap(S, "2026-11-04"), 1, "restored from this computer after a refresh");
});

test("this week, next, this, next: the copy and the Friday memory end exactly as after one upload of each", () => {
  const once = mk(); sidur(once, W45); sidur(once, W46);
  const flip = mk(); for (let i = 0; i < 3; i++) { sidur(flip, W45); sidur(flip, W46); }
  assert.deepStrictEqual(flip.state.settings.friHist, once.state.settings.friHist, "Friday memory: one entry per Friday, by date");
  assert.deepStrictEqual(Object.keys(flip.state.settings.friHist).sort(), ["2026-11-06", "2026-11-13"]);
  assert.strictEqual(JSON.stringify(flip.state.nowSidur.cap), JSON.stringify(once.state.nowSidur.cap));
  assert.strictEqual(flip.state.nowSidur.wk, W45);
});
