"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const S = sandbox(
  ["csvToGrid", "htmlToGrid", "xmlDec", "normHeader", "matchHeader", "findHeader",
   "classifyGrid", "colIdx"],
  ["SYN", "SYN_ORDER"]
);

test("csvToGrid: comma, semicolon and tab delimiters are sniffed", () => {
  assert.deepEqual(S.csvToGrid("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(S.csvToGrid("a;b\n1;2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(S.csvToGrid("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
});
test("csvToGrid: quoted fields with embedded delimiter and quotes", () => {
  assert.deepEqual(S.csvToGrid('name,note\n"כהן, דנה","said ""hi"""'),
    [["name", "note"], ["כהן, דנה", 'said "hi"']]);
});
test("csvToGrid: BOM and blank lines are stripped", () => {
  assert.deepEqual(S.csvToGrid("﻿a,b\n\n1,2\n"), [["a", "b"], ["1", "2"]]);
});
test("htmlToGrid: ACD exports disguised as .xls", () => {
  const g = S.htmlToGrid("<table><tr><th>תאריך</th><th>שיחות</th></tr><tr><td>01/07/2026</td><td><b>55</b></td></tr></table>");
  assert.deepEqual(g, [["תאריך", "שיחות"], ["01/07/2026", "55"]]);
});
test("matchHeader: Tikshuv sidur headers map to the right keys", () => {
  assert.equal(S.matchHeader("מוקד"), "site");
  assert.equal(S.matchHeader("כניסה"), "start");
  assert.equal(S.matchHeader("יציאה"), "end");
  assert.equal(S.matchHeader("תאריך"), "date");
  assert.equal(S.matchHeader("יום"), "day");
  assert.equal(S.matchHeader("שם הנציג/ה"), "name");
  assert.equal(S.matchHeader("מנהל צוות"), "team");
  assert.equal(S.matchHeader("מיומנות"), "skill");
  assert.equal(S.matchHeader("סטאטוס"), "status");
  assert.equal(S.matchHeader("ת'ז נציג"), "empid");
});
test("matchHeader: decoys must NOT map", () => {
  assert.equal(S.matchHeader("הסעות"), null);      // transportation, not hours
  assert.equal(S.matchHeader("נוסחה"), null);       // formula helper column
  assert.equal(S.matchHeader(""), null);
});
test("matchHeader: ans30 wins over volume for 'נענות תוך 30' columns", () => {
  assert.equal(S.matchHeader("שיחות נענות תוך 30 שניות"), "ans30");
  assert.equal(S.matchHeader("שיחות נכנסות"), "volume");
});
test("findHeader: locates the sidur header row and prefers NET login", () => {
  const grid = [
    ["גיליון סידור — שירות"],
    ["מוקד", "כניסה", "יציאה", "תאריך", "יום", "שם הנציג/ה", "שעות לוגין ברוטו", "שעות לוגין נטו"],
    ["", "08:00", "16:00", "05/07/2026", "א", "כהן דנה", "8.2", "7.5"],
  ];
  const hd = S.findHeader(grid);
  assert.equal(hd.row, 1);
  assert.equal(hd.map.name, 5);
  assert.equal(hd.map.login, 7); // NET over gross
});
test("classifyGrid: forecast vs roster", () => {
  assert.equal(S.classifyGrid({ volume: 1, aht: 2 }), "forecast");
  assert.equal(S.classifyGrid({ name: 0, start: 1, end: 2, date: 3 }, "roster"), "roster");
  assert.equal(S.classifyGrid({}, null), null);
});
test("colIdx: A→0, Z→25, AA→26", () => {
  assert.equal(S.colIdx("A"), 0);
  assert.equal(S.colIdx("Z"), 25);
  assert.equal(S.colIdx("AA"), 26);
  assert.equal(S.colIdx("N"), 13); // מיומנות column in the real workbook
});

// parseCoursesGrid returns the courses (the caller adds them); more layouts in courses.test.js
const C = sandbox(["parseCoursesGrid", "normDateAny", "fromISO", "toNum", "pad", "iso"], [], { t: () => "קורס" });
test("parseCoursesGrid: forgiving headers, serial dates, bad rows skip", () => {
  const grid = [
    ["שם קורס", "תאריך התחלה", "סיום", "כמות חניכים", "אחוז הסמכה"],
    ["קורס א", "20/07/2026", "10/08/2026", "12", "0.8"],
    ["קורס ב", "46600", "", "8", ""],          // serial date; the rate typed above carries down (merged-cell style)
    ["קורס ג", "לא תאריך", "", "5", ""],       // bad date row skips, not fatal
  ];
  const r = C.parseCoursesGrid(grid, { yield: 85 });
  assert.equal(r.length, 2);
  assert.equal(r[1].yield, 80);
});
test("parseCoursesGrid: rows carry computed duration and normalized yield", () => {
  const r = C.parseCoursesGrid([
    ["course", "start", "end", "trainees", "yield"],
    ["July", "2026-07-20", "2026-08-10", "12", "0.8"],
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].duration, 16);   // working days (Sun–Thu) from start to end
  assert.equal(r[0].yield, 80);      // 0.8 → 80%
  assert.equal(r[0].count, 12);
});

test("csvToGrid: a quote inside a field is a letter (ב\"ש, סה\"כ); quoted fields still work", () => {
  assert.deepEqual(S.csvToGrid('קורס ב"ש 1,2026-11-01,12\nסה"כ,,40'), [["קורס ב\"ש 1", "2026-11-01", "12"], ["סה\"כ", "", "40"]]);
  assert.deepEqual(S.csvToGrid('"a,b",c\n"קורס ב""ש",1'), [["a,b", "c"], ["קורס ב\"ש", "1"]]);
});
