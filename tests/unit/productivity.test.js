// Forecast net (login) hours: the two ways are tested on the file's own past, the lower error wins — shipped code via extract.js
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { sandbox } = require("../extract.js");

// 10 weeks of Sun–Thu days, 4 half hours a day; login = share × scheduled hours (+ optional noise per day)
function build({ share = 0.9, staff = d => 20, noise = () => 0 } = {}) {
  const days = new Map(); let ds = "2026-03-01", last = null;
  for (let i = 0; i < 70; i++) {
    const d = new Date(ds + "T12:00:00"), di = d.getDay();
    if (di <= 4) {
      const ag = staff(i), dm = new Map();
      for (const tm of ["08:00", "08:30", "09:00", "09:30"]) dm.set(tm, { volume: 50, aht: 300, agents: ag, login: ag * 0.5 * share * (1 + noise(i)) });
      days.set(ds, dm); last = ds;
    }
    const n = new Date(d); n.setDate(n.getDate() + 1); ds = n.toISOString().slice(0, 10);
  }
  const state = { days, maxDate: last, _serVer: 1 };
  const S = sandbox(["prodBacktest", "movAvg4", "addDays", "fromISO", "iso", "pad"], [], { state });
  S.state = state; return S;
}

test("prodBacktest: staffing that changes week to week → the ratio to scheduled hours wins", () => {
  // the sidur grows and shrinks; login follows it → averaging past weeks lags, the ratio doesn't
  const S = build({ staff: i => 16 + (Math.floor(i / 7) % 3) * 6 });
  const r = S.prodBacktest();
  assert.ok(r, "enough days to test");
  assert.strictEqual(r.pick, "ratio");
  assert.ok(r.eRatio < r.eCarry);
  assert.ok(Math.abs(r.rho - 0.9) < 1e-9, "the measured login ÷ scheduled share");
});

test("prodBacktest: login unrelated to the staffing column → carrying past weeks forward wins", () => {
  // the file's staffing column jumps around, login stays flat by weekday → the ratio is the worse guess
  const S = build({ staff: i => (i % 2 ? 10 : 30), share: 0.9 });
  const days = S.state.days; for (const dm of days.values()) for (const r of dm.values()) r.login = 9;
  S.state._prodBt = null;
  const r = S.prodBacktest();
  assert.strictEqual(r.pick, "carry");
  assert.ok(r.eCarry < r.eRatio);
});

test("prodBacktest: no login hours in the file → no test, nothing changes", () => {
  const S = build();
  for (const dm of S.state.days.values()) for (const r of dm.values()) delete r.login;
  S.state._prodBt = null;
  assert.strictEqual(S.prodBacktest(), null);
});
