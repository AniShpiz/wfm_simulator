// Course plan ingestion: any layout, odd headers, carried-down hire rate, defaults — shipped parseCoursesGrid
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");
const S = sandbox(["parseCoursesGrid", "normDateAny", "toNum", "fromISO", "iso", "pad"], [], { t: () => "קורס" });
const P = (g, d) => S.parseCoursesGrid(g, d || { yield: 85, count: 10, dur: 21 });
const pick = (r, k) => r.map(c => c[k]);

test("the documented format: every row keeps its own hire rate", () => {
  const r = P([["קורס", "תאריך התחלה", "ימים", "כמות", "אחוז הסמכה"],
    ["א", "01/11/2026", 21, 20, 90], ["ב", "15/11/2026", 21, 18, 80], ["ג", "01/12/2026", 28, 25, "75%"]]);
  assert.deepStrictEqual(pick(r, "yield"), [90, 80, 75]);
  assert.deepStrictEqual(pick(r, "count"), [20, 18, 25]);
  assert.deepStrictEqual(pick(r, "duration"), [21, 21, 28]);
});

test("a hire rate typed once (or merged) carries down; none at all = the form's default", () => {
  const r = P([["קורס", "תאריך התחלה", "ימים", "כמות", "הסמכה"],
    ["א", "01/11/2026", 21, 20, 0.9], ["ב", "15/11/2026", 21, 18, ""], ["ג", "01/12/2026", 21, 25, ""]]);
  assert.deepStrictEqual(pick(r, "yield"), [90, 90, 90]);
  const r2 = P([["קורס", "תאריך התחלה", "כמות"], ["א", "01/11/2026", 20]], { yield: 72, count: 10, dur: 30 });
  assert.deepStrictEqual([r2[0].yield, r2[0].duration], [72, 30]);
});

test("odd headers, any column order, a title row above, end date instead of days, totals row ignored", () => {
  const r = P([["תוכנית גיוס 2026 — עדכון"], [],
    ["% עוברים", "מס' משתתפים", "Cohort / wave", "סוף", "פתיחת מחזור"],
    [0.8, 22, "מחזור 14", "2026-11-22", "2026-11-01"], [0.85, 19, "מחזור 15", "2026-12-20", "2026-11-29"],
    ["", 41, "סה\"כ", "", ""]]);
  assert.strictEqual(r.length, 2);
  assert.deepStrictEqual(pick(r, "name"), ["מחזור 14", "מחזור 15"]);
  assert.deepStrictEqual(pick(r, "start"), ["2026-11-01", "2026-11-29"]);
  assert.deepStrictEqual(pick(r, "duration"), [16, 16]); // working days (Sun–Thu) from start to end
  assert.deepStrictEqual(pick(r, "yield"), [80, 85]);
  assert.deepStrictEqual(pick(r, "count"), [22, 19]);
});

test("English, weeks instead of days (5 working days each), Excel serial dates", () => {
  const r = P([["Class", "Start", "Length (weeks)", "Hires", "Pass rate"], ["Wave 1", 46327, 3, 15, "88%"]]);
  assert.deepStrictEqual([r[0].start, r[0].duration, r[0].count, r[0].yield], ["2026-11-01", 15, 15, 88]);
});

test("timeline Gantt: dates across the top, marked weeks per course", () => {
  const r = P([["קורס", "כמות", "01/11/2026", "08/11/2026", "15/11/2026", "22/11/2026"],
    ["קורס נובמבר", 20, "x", "x", "x", ""], ["קורס דצמבר", 12, "", "", "x", "x"]]);
  assert.deepStrictEqual(pick(r, "start"), ["2026-11-01", "2026-11-15"]);
  assert.deepStrictEqual(pick(r, "duration"), [15, 10]); // working days through the last marked week
  assert.deepStrictEqual(pick(r, "count"), [20, 12]);
});

test("courses as columns (transposed sheet)", () => {
  const r = P([["קורס", "א", "ב"], ["תאריך התחלה", "01/11/2026", "01/12/2026"], ["כמות", 20, 15], ["אחוז הסמכה", 90, 70]]);
  assert.deepStrictEqual(pick(r, "yield"), [90, 70]);
  assert.deepStrictEqual(pick(r, "start"), ["2026-11-01", "2026-12-01"]);
});

test("no header row at all — read by content", () => {
  const r = P([["קורס אלפא", "01/11/2026", 20, 0.9], ["קורס בטא", "01/12/2026", 15, 0.8]]);
  assert.deepStrictEqual(pick(r, "yield"), [90, 80]);
  assert.deepStrictEqual(pick(r, "count"), [20, 15]);
});

test("the downloadable template reads back as the courses it shows (HE and EN headers)", () => {
  for (const H of [["שם קורס", "פתיחת קורס", "ימים", "חניכים", "% הסמכה"], ["Course name", "Course start", "Days", "Trainees", "Hire %"]]) {
    const r = P([H, ["קורס 1", "08/11/2026", 21, 20, 85], ["קורס 2", "06/12/2026", 21, 15, 80]]);
    assert.deepStrictEqual(r.map(c => [c.name, c.start, c.duration, c.count, c.yield]),
      [["קורס 1", "2026-11-08", 21, 20, 85], ["קורס 2", "2026-12-06", 21, 15, 80]]);
  }
});

test("course calendar: working days, a closed holiday pushes the floor date", () => {
  const st = { settings: { customHol: [], holOverride: {} }, _holVer: 0 };
  const C = sandbox(["cohortFloorDate", "courseDayOK", "customHolOn", "holidayLevel", "hebMonthName", "hebParts", "addDays", "fromISO", "iso", "pad"],
    ["HEB_HOLIDAYS"], { state: st, _floorCache: new Map(), _hebFmt: null, _hebMonthFmt: null });
  assert.strictEqual(C.cohortFloorDate({ start: "2026-11-01", duration: 12 }), "2026-11-17"); // Sun 1/11 + 12 working days → Tue 17/11
  st.settings.customHol = [{ from: "2026-11-04", to: "2026-11-04", lvl: "closed" }]; st._holVer = 1;
  assert.strictEqual(C.cohortFloorDate({ start: "2026-11-01", duration: 12 }), "2026-11-18"); // one day later
});

test("the app's own template header \"ימי עבודה\" keeps each course's length (root cause: 16 → 12)", () => {
  const r = P([["שם קורס", "פתיחת קורס", "ימי עבודה", "חניכים", "% הסמכה"],
    ["קורס ב\"ש 1", "04/11/2026", 12, 8, 90], ["קורס בית 1", "11/11/2026", 16, 6, ""]]);
  assert.deepStrictEqual(pick(r, "duration"), [12, 16]);
  assert.deepStrictEqual(pick(r, "count"), [8, 6]);
});

test("the template's new header \"ימי הקורס\" (course days) keeps each course's length", () => {
  const r = P([["שם קורס", "פתיחת קורס", "ימי הקורס", "חניכים", "% הסמכה"], ["קורס ב\"ש 1", "04/11/2026", 12, 8, 90], ["קורס בית 1", "11/11/2026", 16, 6, ""]]);
  assert.deepStrictEqual(pick(r, "duration"), [12, 16]);
});
