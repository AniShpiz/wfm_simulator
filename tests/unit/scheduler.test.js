"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

const S = sandbox(["schedulerCore"], []);

const day = (ds, di, needBy) => ({
  ds, di,
  req: Object.entries(needBy).map(([tm, need]) => ({ tm, need })),
});
const emp = (name, days) => ({ name, days });

test("schedulerCore: covers demand from iron windows", () => {
  const out = S.schedulerCore({
    days: [day("2026-07-05", 0, { "08:00": 1, "08:30": 1, "09:00": 1 })],
    emps: [emp("A", { 0: { s: "08:00", e: "09:30" } })],
    cons: [],
  });
  assert.equal(out.asg.length, 1);
  assert.equal(out.gaps.length, 0);
  assert.equal(out.asg[0].src, "base");
});
test("schedulerCore: surplus goes to the pool, not the schedule", () => {
  const out = S.schedulerCore({
    days: [day("2026-07-05", 0, { "08:00": 1 })],
    emps: [emp("A", { 0: { s: "08:00", e: "09:00" } }), emp("B", { 0: { s: "08:00", e: "09:00" } })],
    cons: [],
  });
  assert.equal(out.asg.length, 1);
  assert.equal(out.pool.length, 1);
});
test("schedulerCore: vacation constraint releases the shift and reopens demand", () => {
  const out = S.schedulerCore({
    days: [day("2026-07-05", 0, { "08:00": 1, "08:30": 1 })],
    emps: [emp("A", { 0: { s: "08:00", e: "09:00" } })],
    cons: [{ name: "A", ds: "2026-07-05", type: "vacation" }],
  });
  assert.equal(out.asg.length, 0);
  assert.ok(out.gaps.length >= 1, "released demand must surface as gaps");
});
test("schedulerCore: partial constraint trims the shift", () => {
  const out = S.schedulerCore({
    days: [day("2026-07-05", 0, { "08:00": 1, "08:30": 1, "09:00": 1, "09:30": 1 })],
    emps: [emp("A", { 0: { s: "08:00", e: "10:00" } })],
    cons: [{ name: "A", ds: "2026-07-05", type: "partial", s: "08:00", e: "09:00" }],
  });
  assert.equal(out.asg.length, 1);
  assert.equal(out.asg[0].e, "09:00");
  assert.equal(out.asg[0].src, "adj");
});
test("schedulerCore: pool member swaps in to plug reopened demand", () => {
  const out = S.schedulerCore({
    days: [day("2026-07-05", 0, { "08:00": 1, "08:30": 1 })],
    emps: [emp("A", { 0: { s: "08:00", e: "09:00" } }), emp("B", { 0: { s: "08:00", e: "09:00" } })],
    cons: [{ name: "A", ds: "2026-07-05", type: "vacation" }],
  });
  const swap = out.asg.find(a => a.src === "swap");
  assert.ok(swap, "expected a swap assignment from the pool");
  assert.equal(swap.name, "B");
});
test("schedulerCore: uncovered demand is counted per interval", () => {
  const out = S.schedulerCore({
    days: [day("2026-07-05", 0, { "08:00": 3, "08:30": 3 })],
    emps: [emp("A", { 0: { s: "08:00", e: "09:00" } })],
    cons: [],
  });
  const total = out.gaps.reduce((s, g) => s + g.n, 0);
  assert.equal(total, 4); // 3+3 needed, 1+1 covered
});

// tikshuvRow: output row must speak the input file's structure
const R = sandbox(["tikshuvRow", "pad"], ["TIKSHUV_HEADS", "HE_DAY", "toMinW"], {
  state: { rosterMeta: new Map([["כהן דנה", { site: "מושלם באר שבע", team: "לוי", skill: "נציג קו 1" }]]), iron: null },
  t: k => k,
  fmtD: d => "05/07/2026",
});
test("tikshuvRow: exact Tikshuv sidur-avoda column order and values", () => {
  assert.deepEqual(R.TIKSHUV_HEADS,
    ["מוקד", "כניסה", "יציאה", "תאריך", "יום", "שם הנציג/ה", "שעות", "סטאטוס", "מנהל צוות", "מיומנות"]);
  const row = R.tikshuvRow({ name: "כהן דנה", ds: "2026-07-05", di: 0, s: "08:00", e: "16:30", src: "base" });
  assert.equal(row.length, R.TIKSHUV_HEADS.length);
  assert.equal(row[0], "מושלם באר שבע");
  assert.equal(row[4], "א");
  assert.equal(row[6], "8:30"); // שעות displayed as H:MM, exactly like the sidur
  assert.equal(row[8], "לוי");
  assert.equal(row[9], "נציג קו 1");
});
