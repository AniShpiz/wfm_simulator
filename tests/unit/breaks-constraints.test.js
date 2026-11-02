// Breaks split by "most minutes in a row", the managers' constraint template read back, course overlap peaks — shipped code
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const st = { settings: { brk: {}, dayStart: 8, dayEnd: 18, friEnd: 13 } };
const S = sandbox(["brkMaxRun", "brkSplit", "brkParts", "brkLS", "conCell", "conDayCol", "parseConMatrix", "matchHeader", "normHeader",
  "normTimeAny", "normDateAny", "dayIdxOf", "ironParts", "conMerge", "conPerRep", "parseIronGrid", "findHeader", "brkOpen", "brkTm", "pad", "fromISO", "iso", "addDays", "weekDates", "crsPeak"],
  ["SYN", "SYN_ORDER", "DAY_NAMES", "toMinW"], { state: st, schWeek: () => "2026-11-08" });

test("breaks: at most 20 minutes in a row by default — 8h = 20 + 20, not 25 + 15", () => {
  st.settings.brk = {};
  assert.deepStrictEqual(S.brkParts(40), [20, 20]);
  assert.deepStrictEqual(S.brkParts(35), [20, 15]);
  assert.deepStrictEqual(S.brkParts(50), [20, 15, 15]);
  assert.deepStrictEqual(S.brkParts(20), [20]);
  assert.deepStrictEqual(S.brkParts(25), [15, 10]);
});

test("breaks: the setting moves the split; every split adds up and none is longer than the max", () => {
  st.settings.brk = { maxRun: 25 };
  assert.deepStrictEqual(S.brkParts(40), [20, 20]);
  assert.deepStrictEqual(S.brkParts(50), [25, 25]);
  st.settings.brk = { maxRun: 30 };
  assert.deepStrictEqual(S.brkParts(50), [25, 25]);
  for (const m of [10, 15, 20, 30, 45]) { st.settings.brk = { maxRun: m };
    for (let d = 5; d <= 60; d += 5) { const p = S.brkParts(d);
      assert.strictEqual(p.reduce((a, b) => a + b, 0), d);
      assert.ok(Math.max(...p) <= Math.max(m, 5), `max ${m}, ${d} → ${p}`); } }
  st.settings.brk = {};
});

test("breaks: bold (L) only when the parts differ — the longest ones", () => {
  assert.deepStrictEqual([0, 1].map(i => S.brkLS([20, 20], i)), ["", ""]);
  assert.deepStrictEqual([0, 1, 2].map(i => S.brkLS([20, 15, 15], i)), ["L", "S", "S"]);
  assert.deepStrictEqual([0, 1, 2].map(i => S.brkLS([20, 20, 15], i)), ["L", "L", "S"]);
});

test("constraints: a cell says when the rep CAN work", () => {
  assert.strictEqual(S.conCell("", 1), null);
  assert.strictEqual(S.conCell("—", 1), null);
  assert.deepStrictEqual(S.conCell("חופש", 1), { type: "vacation", s: null, e: null });
  assert.deepStrictEqual(S.conCell("לא יכולה", 1), { type: "unavailable", s: null, e: null });
  assert.deepStrictEqual(S.conCell("עד 14:00", 1), { type: "partial", s: "00:00", e: "14:00" });
  assert.deepStrictEqual(S.conCell("עד 14", 1), { type: "partial", s: "00:00", e: "14:00" });
  assert.deepStrictEqual(S.conCell("מ-12:00", 1), { type: "partial", s: "12:00", e: "23:59" });
  assert.deepStrictEqual(S.conCell("מ-10", 5), { type: "partial", s: "10:00", e: "23:59" }); // one side only: the shift trims the rest
  assert.deepStrictEqual(S.conCell("10:00-14:00", 2), { type: "partial", s: "10:00", e: "14:00" });
  assert.deepStrictEqual(S.conCell("from 9:30", 2), { type: "partial", s: "09:30", e: "23:59" });
  assert.strictEqual(S.conCell("14:00", 2), "?");      // no "until" / "from": not guessed
  assert.strictEqual(S.conCell(0.5833, 2), "?");       // a bare Excel time
  assert.strictEqual(S.conCell("אולי", 2), "?");
});

test("constraints: the template read back — day columns by date or day letter, team rows skipped", () => {
  const g = [["אילוצים — שבוע 46"], ["הסבר"], [],
    ["מנהל/ת צוות", "שם הנציג/ה", "א 08/11", "ב 09/11", "ג 10/11", "ד 11/11", "ה 12/11", "ו 13/11", "הערות"],
    ["צוות דנה — 3 נציגים", "", 1, 1, 0, 1, 0, 1, "מקסימום ליום"],
    ["צוות דנה", "רוני כהן", "", "עד 14:00", "", "—", "חופש", "", ""],
    ["צוות דנה", "מיה לוי", "לא יכולה", "", "", "", "", "", ""],
    ["צוות דנה", "טל", "", "", "בערך", "", "", "", ""]];
  const r = S.parseConMatrix(g);
  assert.deepStrictEqual([...r.names], ["רוני כהן", "מיה לוי", "טל"]);
  assert.strictEqual(r.bad, 1);
  assert.deepStrictEqual(r.out.map(c => [c.name, c.ds, c.type, c.s, c.e]), [
    ["רוני כהן", "2026-11-09", "partial", "00:00", "14:00"],
    ["רוני כהן", "2026-11-12", "vacation", null, null],
    ["מיה לוי", "2026-11-08", "unavailable", null, null]]);
  const g2 = [["Rep name", "Sun", "Mon", "Tue"], ["Ann", "until 12", "", "can't"]];
  assert.deepStrictEqual(S.parseConMatrix(g2).out.map(c => [c.ds, c.type]), [["2026-11-08", "partial"], ["2026-11-10", "unavailable"]]);
});

test("courses: the peak of courses running together", () => {
  const L = [{ a: "2026-11-01", b: "2026-11-20" }, { a: "2026-11-10", b: "2026-11-30" }, { a: "2026-11-21", b: "2026-12-10" }];
  assert.strictEqual(S.crsPeak(L, "2026-11-01", "2026-12-10"), 2);
  assert.strictEqual(S.crsPeak(L, "2026-11-21", "2026-11-25"), 2);
  assert.strictEqual(S.crsPeak(L, "2026-12-01", "2026-12-05"), 1);
});

test("the app's script holds no raw closing script tag (a printed sheet's own script must write <\/script>)", () => {
  const html = require("fs").readFileSync(require("path").join(__dirname, "..", "..", "index.html"), "utf8");
  const a = html.lastIndexOf("<script>"), b = html.lastIndexOf("</script>"), body = html.slice(html.indexOf("<script>") + 8, b);
  assert.ok(a >= 0 && b > a);
  assert.strictEqual(body.search(/<\/script/i), -1);
});

test("constraints: the file comes filled with the iron — unchanged = nothing, deleted = can't, new hours = only those", () => {
  const sh = { s: "08:00", e: "16:00", h: 8 };
  st.iron = { emps: new Map([["רוני", { days: { 0: sh, 1: sh, 2: sh } }], ["מיה", { days: { 0: sh, 1: sh, 2: sh } }]]) };
  const g = [["שם הנציג/ה", "ראשון 08/11", "שני 09/11", "שלישי 10/11", "מנהל/ת צוות"],
    ["רוני", "08:00-16:00", "", "10:00-14:00", "דנה"],
    ["מיה", "חופש", "08:00-16:00", "8-16", "דנה"]];
  const r = S.parseConMatrix(g);
  assert.strictEqual(r.bad, 0);
  assert.deepStrictEqual(r.out.map(c => [c.name, c.ds, c.type, c.s, c.e]), [
    ["רוני", "2026-11-09", "unavailable", null, null],
    ["רוני", "2026-11-10", "partial", "10:00", "14:00"],
    ["מיה", "2026-11-08", "vacation", null, null]]);
  delete st.iron;
});

test("split shifts: a cell holds every part; deleting one part = only the other; unchanged = nothing", () => {
  st.iron = { emps: new Map([["דנה", { days: { 1: { s: "08:00", e: "12:00", h: 8, parts: [["08:00", "12:00"], ["16:00", "20:00"]] } } }]]) };
  const P = [["08:00", "12:00"], ["16:00", "20:00"]];
  assert.strictEqual(S.conCell("08:00-12:00 + 16:00-20:00", 1, P, true), null);
  assert.deepStrictEqual(S.conCell("16:00-20:00", 1, P, true), { type: "partial", s: "16:00", e: "20:00" });
  assert.deepStrictEqual(S.conCell("10:00-12:00 + 16:00-18:00", 1, P, true),
    [{ type: "partial", s: "10:00", e: "18:00" }, { type: "unavailable", s: "12:00", e: "16:00" }]);
  assert.deepStrictEqual(S.conCell("", 1, P, true), { type: "unavailable", s: null, e: null });
  delete st.iron;
});

test("the limit is enforced: only the first X changed days of a rep count, vacation free", () => {
  st.settings.conPerRep = 2; st.weeklyConstraints = [];
  const c = (ds, type) => ({ name: "רוני", ds, type, s: null, e: null });
  const r = S.conMerge([c("2026-11-08", "vacation"), c("2026-11-09", "unavailable"), c("2026-11-10", "unavailable"), c("2026-11-11", "unavailable"), c("2026-11-12", "unavailable")], new Set(["רוני"]), 0);
  assert.strictEqual(r.cut, 2);
  assert.deepStrictEqual(st.weeklyConstraints.map(x => x.ds), ["2026-11-08", "2026-11-09", "2026-11-10"]);
  assert.deepStrictEqual(st._conCut.map(x => x.ds), ["2026-11-11", "2026-11-12"]);
});

test("split shifts: the iron keeps every part and adds the hours (a repeated row is skipped)", () => {
  const ok = S.parseIronGrid([["שם הנציג/ה", "יום", "כניסה", "יציאה"],
    ["דנה", "ב", "08:00", "12:00"], ["דנה", "ב", "16:00", "20:00"], ["דנה", "ב", "16:00", "20:00"], ["דנה", "ג", "09:00", "17:00"]]);
  assert.ok(ok);
  const e = st.iron.emps.get("דנה");
  assert.deepStrictEqual(e.days[1].parts, [["08:00", "12:00"], ["16:00", "20:00"]]);
  assert.deepStrictEqual([e.days[1].s, e.days[1].e, e.days[1].h, e.contracted], ["08:00", "12:00", 8, 16]);
  assert.deepStrictEqual(S.ironParts(e.days[2]), [["09:00", "17:00"]]);
  assert.deepStrictEqual(S.ironParts({ s: "08:00", e: "16:00", h: 8 }), [["08:00", "16:00"]]); // an iron saved before splits
  delete st.iron;
});
