"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

function fresh() {
  const state = { days: new Map(), simDays: new Map(), fcCache: new Map(), edits: new Map(),
    undoStack: [], pristine: new Map(), volAdj: [], extraCols: [], extraFmt: {} };
  const S = sandbox(
    ["buildForecastGrid", "findHeader", "matchHeader", "normHeader", "normDateAny",
     "normTimeAny", "bucket30", "addHalf", "toDurationSec", "toNum", "pad", "iso",
     "fromISO", "halfHoursBetween", "colIdx"],
    ["SYN", "SYN_ORDER"],
    { state, memo: new Map() }
  );
  return { S, state };
}
const HEB = ["תאריך", "שעה", "שיחות", "אורך שיחה ממוצע", "נציגים", "שיחות נענות"];
function build(S, rows, heads = HEB) {
  const grid = [heads, ...rows];
  return S.buildForecastGrid(grid, S.findHeader(grid));
}

test("duplicate date+interval rows AGGREGATE: volumes sum, AHT volume-weighted", () => {
  const { S, state } = fresh();
  build(S, [
    ["05/07/2026", "09:00", "30", "200", "5", "20"],
    ["05/07/2026", "09:00", "10", "600", "5", "8"],
  ]);
  const rec = state.days.get("2026-07-05").get("09:00");
  assert.equal(rec.volume, 40);
  assert.equal(rec.aht, 300); // (30*200+10*600)/40
  assert.equal(rec.answered, 28);
});
test("15-minute exports re-bucket into half-hour blocks", () => {
  const { S, state } = fresh();
  build(S, [
    ["05/07/2026", "09:00", "10", "300", "4", ""],
    ["05/07/2026", "09:15", "12", "300", "4", ""],
    ["05/07/2026", "09:30", "8",  "300", "4", ""],
    ["05/07/2026", "09:45", "9",  "300", "4", ""],
  ]);
  const dm = state.days.get("2026-07-05");
  assert.equal(dm.get("09:00").volume, 22);
  assert.equal(dm.get("09:30").volume, 17);
  assert.equal(dm.size, 2);
});
test("hourly exports split into two half-hours without losing volume", () => {
  const { S, state } = fresh();
  build(S, [
    ["05/07/2026", "09:00", "61", "300", "6", "40"],
    ["05/07/2026", "10:00", "50", "300", "6", "30"],
  ]);
  const dm = state.days.get("2026-07-05");
  assert.equal(dm.size, 4);
  const v = dm.get("09:00").volume + dm.get("09:30").volume;
  assert.ok(Math.abs(v - 61) < 1e-9, "hour volume must be conserved, got " + v);
  const a = dm.get("09:00").answered + dm.get("09:30").answered;
  assert.ok(Math.abs(a - 40) < 1e-9, "answered must be conserved");
  assert.equal(dm.get("09:00").agents, 6, "hourly staffing applies to both halves");
});
test("AHT unit heuristics: mm:ss and minutes-as-numbers both land in seconds", () => {
  const { S, state } = fresh();
  build(S, [["05/07/2026", "09:00", "20", "4:55", "4", ""]]);
  assert.equal(state.days.get("2026-07-05").get("09:00").aht, 295);
  const f2 = fresh(); // median AHT < 25 → the column is minutes
  build(f2.S, [
    ["05/07/2026", "09:00", "20", "4.9", "4", ""],
    ["05/07/2026", "09:30", "20", "5.1", "4", ""],
  ]);
  assert.equal(f2.state.days.get("2026-07-05").get("09:00").aht, 294);
});
test("physical invariant: ans30 can never exceed answered", () => {
  const { S, state } = fresh();
  const heads = [...HEB, "נענות תוך 30"];
  build(S, [["05/07/2026", "09:00", "50", "300", "5", "30", "45"]], heads);
  const rec = state.days.get("2026-07-05").get("09:00");
  assert.ok(rec.ans30 <= rec.answered, `ans30 ${rec.ans30} > answered ${rec.answered}`);
});
test("garbage rows skip and are counted; absurd values rejected", () => {
  const { S } = fresh();
  const stats = build(S, [
    ["05/07/2026", "09:00", "30", "300", "5", ""],
    ["not a date", "09:00", "30", "300", "5", ""],
    ["05/07/2026", "xx", "30", "300", "5", ""],
    ["05/07/2026", "09:30", "-4", "300", "5", ""],   // negative volume
    ["05/07/2026", "10:00", "30", "9000", "5", ""],  // AHT > 2h
    ["05/07/2026", "10:30", "999999", "300", "5", ""], // impossible volume
  ]);
  assert.equal(stats.rows, 1);
  assert.equal(stats.skipped, 5);
});
test("missing required columns throw a structured error", () => {
  const { S } = fresh();
  const grid = [["תאריך", "שעה"], ["05/07/2026", "09:00"]];
  assert.throws(() => S.buildForecastGrid(grid, S.findHeader(grid) || { map: {}, row: 0, raw: grid[0] }),
    e => e.code === "missing" || e.code === "noheader" || e instanceof TypeError);
});
test("measured occupancy is volume-weighted and survives aggregation", () => {
  const { S, state } = fresh();
  const heads = [...HEB, "אחוז תעסוקה"];
  build(S, [
    ["05/07/2026", "09:00", "30", "300", "5", "", "90"],
    ["05/07/2026", "09:00", "10", "300", "5", "", "50"],
  ], heads);
  const rec = state.days.get("2026-07-05").get("09:00");
  assert.equal(rec.occup, 80); // (30*90+10*50)/40
});
test("unrecognized columns become custom extras with unit detection", () => {
  const { S, state } = fresh();
  const heads = [...HEB, "זמן המתנה ממוצע", "אחוז נטישה"];
  build(S, [["05/07/2026", "09:00", "30", "300", "5", "", "0:45", "12"]], heads);
  assert.deepEqual(state.extraCols, ["זמן המתנה ממוצע", "אחוז נטישה"]);
  assert.equal(state.extraFmt["זמן המתנה ממוצע"], "sec");
  assert.equal(state.extraFmt["אחוז נטישה"], "pct");
});
