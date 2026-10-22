// Friday rotation weights, your-own holiday dates, chart step rounding — shipped code via extract.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const mk = settings => sandbox(
  ["friLast", "friW", "ironDayH", "ironWeekH", "customHolOn", "applyCustomHol", "niceStep", "addDays", "fromISO", "iso", "pad"],
  [], { state: { settings } });

const WK = "2026-07-05";                      // Sunday; its Friday is 07-10, last Friday 07-03
const rep = { days: { 0: { h: 8 }, 5: { h: 5 } }, contracted: 13 };

test("friday: unknown last Friday counts half", () => {
  const S = mk({ friEvery: 2, friHist: {} });
  assert.strictEqual(S.friW("a", WK), 0.5);
  assert.strictEqual(S.ironDayH("a", rep, 5, WK), 2.5);
  assert.strictEqual(S.ironWeekH("a", rep, WK), 10.5);
});

test("friday: worked last Friday → off; didn't → due", () => {
  const S = mk({ friEvery: 2, friHist: { "2026-07-03": ["a"] } });
  assert.strictEqual(S.friW("a", WK), 0);
  assert.strictEqual(S.friW("b", WK), 1);
  assert.strictEqual(S.ironDayH("a", rep, 5, WK), 0);
  assert.strictEqual(S.ironDayH("b", rep, 5, WK), 5);
  assert.strictEqual(S.ironDayH("a", rep, 0, WK), 8, "weekdays never rotate");
});

test("friday: every-Friday centers keep the full iron", () => {
  const S = mk({ friEvery: 1, friHist: { "2026-07-03": ["a"] } });
  assert.strictEqual(S.ironWeekH("a", rep, WK), 13);
});

test("own holidays: a range sets its level, 'work' removes an auto holiday", () => {
  const S = mk({ customHol: [{ from: "2026-11-03", to: "2026-11-04", name: "בחירות", lvl: "closed" }, { from: "2026-09-21", lvl: "work" }] });
  const m = S.applyCustomHol(new Map([["2026-09-21", "closed"]]));
  assert.strictEqual(m.get("2026-11-03"), "closed");
  assert.strictEqual(m.get("2026-11-04"), "closed");
  assert.strictEqual(m.has("2026-09-21"), false);
  assert.strictEqual(S.customHolOn("2026-11-04").name, "בחירות");
  assert.strictEqual(S.customHolOn("2026-11-05"), null);
});

test("niceStep rounds to 1/2/5 × 10^k", () => {
  const S = mk({});
  assert.deepStrictEqual([0.03, 140, 380, 900, 4100].map(S.niceStep), [0.02, 100, 500, 1000, 5000]);
});

test("iron: Friday counts only when its cell holds hours (חוזה / ללא שישי / empty / text = no Friday)", () => {
  const st = { settings: {}, iron: null };
  const P = sandbox(["parseIronGrid", "findHeader", "matchHeader", "normHeader", "colIdx", "normTimeAny", "normDateAny", "dayIdxOf", "fromISO", "iso", "pad"],
    ["SYN", "SYN_ORDER", "DAY_NAMES", "toMinW"], { state: st });
  const H = ["מוקד", "כניסה", "יציאה", "תאריך", "יום", "שם הנציג/ה"];
  const row = (s, e, d, n) => ["מושלם", s, e, "", d, n];
  const grid = [H, row(0.333333333, 0.541666666, "א", "שעות"), row(0.333333333, 0.541666666, "ו", "שעות"),
    row(0.333333333, 0.541666666, "א", "חוזה"), row("חוזה", "", "ו", "חוזה"),
    row(0.333333333, 0.541666666, "א", "ללא"), row("ללא שישי", "", "ו", "ללא"),
    row(0.333333333, 0.541666666, "א", "ריק"), row("", "", "ו", "ריק"),
    row(0.333333333, 0.541666666, "א", "טקסט"), row("לימודים", "", "ו", "טקסט")];
  assert.ok(P.parseIronGrid(grid));
  const fri = n => !!st.iron.emps.get(n).days[5];
  assert.deepStrictEqual(["שעות", "חוזה", "ללא", "ריק", "טקסט"].map(fri), [true, false, false, false, false]);
  assert.strictEqual(st.iron.emps.get("חוזה").days[0].h, 5, "the weekday hours stay");
});
