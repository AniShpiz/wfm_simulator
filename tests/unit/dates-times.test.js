"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const S = sandbox(
  ["pad", "iso", "fromISO", "sundayOf", "isoWeek", "weekDates", "addDays",
   "normDateAny", "normTimeAny", "dayIdxOf", "bucket30", "halfHoursBetween",
   "addHalf", "toDurationSec", "toNum"],
  ["DAY_NAMES"]
);

test("normDateAny: ISO, dd/mm/yyyy, dots, dashes", () => {
  assert.equal(S.normDateAny("2026-07-05"), "2026-07-05");
  assert.equal(S.normDateAny("05/07/2026"), "2026-07-05");
  assert.equal(S.normDateAny("5.7.2026"), "2026-07-05");
  assert.equal(S.normDateAny("05-07-2026"), "2026-07-05");
});
test("normDateAny: two-digit years pivot at 70", () => {
  assert.equal(S.normDateAny("05/07/26"), "2026-07-05");
  assert.equal(S.normDateAny("05/07/95"), "1995-07-05");
});
test("normDateAny: unambiguous mm/dd is auto-swapped", () => {
  assert.equal(S.normDateAny("07/13/2026"), "2026-07-13"); // 13 can't be a month
});
test("normDateAny: Excel serials (the real workbook uses these)", () => {
  assert.equal(S.normDateAny("46208"), "2026-07-05");
  assert.equal(S.normDateAny(46213), "2026-07-10");
});
test("normDateAny: rejects garbage and out-of-range", () => {
  assert.equal(S.normDateAny("hello"), null);
  assert.equal(S.normDateAny("32/13/2026"), null);
  assert.equal(S.normDateAny(""), null);
  assert.equal(S.normDateAny(5), null);        // small numbers are not dates
  assert.equal(S.normDateAny(99999), null);    // beyond serial guard
});
test("normTimeAny: clock formats", () => {
  assert.equal(S.normTimeAny("8:30"), "08:30");
  assert.equal(S.normTimeAny("08:30:00"), "08:30");
  assert.equal(S.normTimeAny("1:05 PM"), "13:05");
  assert.equal(S.normTimeAny("12:00 AM"), "00:00");
});
test("normTimeAny: Excel day fractions (the real workbook uses these)", () => {
  assert.equal(S.normTimeAny(0.3541666666666667), "08:30");
  assert.equal(S.normTimeAny("0.625"), "15:00");
  assert.equal(S.normTimeAny(46208.354166666664), "08:30"); // datetime serial keeps time part
});
test("normTimeAny: integers as hours / military time", () => {
  assert.equal(S.normTimeAny(8), "08:00");
  assert.equal(S.normTimeAny(830), "08:30");
  assert.equal(S.normTimeAny(2359), "23:59");
});
test("normTimeAny: rejects invalid", () => {
  assert.equal(S.normTimeAny("25:00"), null);
  assert.equal(S.normTimeAny("8:75"), null);
  assert.equal(S.normTimeAny("ללא שישי"), null); // real cell content in the workbook
});
test("dayIdxOf: Hebrew letters with/without geresh, names, EN", () => {
  assert.equal(S.dayIdxOf("א"), 0);
  assert.equal(S.dayIdxOf("ו'"), 5);
  assert.equal(S.dayIdxOf("ראשון"), 0);
  assert.equal(S.dayIdxOf("Friday"), 5);
  assert.equal(S.dayIdxOf("שבת"), null); // Saturday is out of the 6-day model
});
test("bucket30 / halfHoursBetween / addHalf", () => {
  assert.equal(S.bucket30("08:45"), "08:30");
  assert.equal(S.bucket30("08:29"), "08:00");
  assert.deepEqual(S.halfHoursBetween("08:00", "09:30"), ["08:00", "08:30", "09:00"]);
  assert.equal(S.addHalf("09:30"), "10:00");
});
test("week helpers agree with the real workbook (week 27, Sunday 2026-07-05)", () => {
  assert.equal(S.sundayOf("2026-07-08"), "2026-07-05");
  assert.equal(S.isoWeek("2026-07-05"), 27);
  assert.deepEqual(S.weekDates("2026-07-05").length, 6); // Sun..Fri
  assert.equal(S.weekDates("2026-07-05")[5], "2026-07-10");
});
test("toDurationSec: seconds, mm:ss, hh:mm:ss, Excel fraction", () => {
  assert.equal(S.toDurationSec("295"), 295);
  assert.equal(S.toDurationSec("4:55"), 295);
  assert.equal(S.toDurationSec("0:04:55"), 295);
  assert.ok(Math.abs(S.toDurationSec(295 / 86400) - 295) < 1); // Excel time fraction
});
test("toNum: tolerant numeric parse", () => {
  assert.equal(S.toNum("12"), 12);
  assert.equal(S.toNum("1,234"), 1234);
  assert.ok(Number.isNaN(S.toNum("abc")) || S.toNum("abc") === null || S.toNum("abc") === undefined || !isFinite(S.toNum("abc")));
});
