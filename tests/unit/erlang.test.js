"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const { extract } = require("../extract.js");

// queue math cluster: evalInterval/requiredAgents lean on the Erlang helpers
const { sandbox } = require("../extract.js");
const S = sandbox(
  ["lnFact", "ladd", "erlangB", "erlangA", "erlangA_TSF", "erlangC_TSF", "evalInterval", "requiredAgents"],
  ["LNF"],
  {
    state: { settings: { target: 80, tsfT: 30, mode: "erlangA", shrinkage: 0, absence: 0, primaryMetric: "tsf" } },
    memo: new Map(),
    MEMO_LIMIT: 30000, // mirrors index.html's `const memo=new Map(), MEMO_LIMIT=30000` (multi-const line the extractor can't split)
  }
);
const SETTINGS = { target: 80, tsfT: 30, mode: "erlangA", shrinkage: 0, absence: 0, primaryMetric: "tsf" };

test("evalInterval: all outputs bounded to [0,1]", () => {
  for (const agents of [0, 1, 5, 20, 100]) {
    const p = S.evalInterval(50, 300, agents, SETTINGS);
    for (const k of ["ar", "tsf", "occ"]) if (p[k] != null)
      assert.ok(p[k] >= 0 && p[k] <= 1, `${k}=${p[k]} at agents=${agents}`);
  }
});
test("evalInterval: performance is monotonic in agents", () => {
  let prev = -1;
  for (const agents of [1, 3, 6, 10, 20, 40]) {
    const p = S.evalInterval(50, 300, agents, SETTINGS);
    assert.ok(p.ar >= prev - 1e-9, `AR dropped when adding agents (${prev} → ${p.ar})`);
    prev = p.ar;
  }
});
test("evalInterval: zero agents ≈ nothing answered; huge staffing ≈ everything", () => {
  const none = S.evalInterval(50, 300, 0, SETTINGS);
  assert.ok(none.ar <= 0.05, "0 agents should answer ~nothing, got " + none.ar);
  const lots = S.evalInterval(50, 300, 200, SETTINGS);
  assert.ok(lots.ar >= 0.99, "200 agents on 50 calls should answer ~all");
});
test("requiredAgents: finite, positive, and sufficient for its own target", () => {
  const req = S.requiredAgents(60, 300, 80, SETTINGS);
  assert.ok(Number.isFinite(req) && req > 0, "req=" + req);
  const perf = S.evalInterval(60, 300, Math.ceil(req), SETTINGS);
  assert.ok(perf.tsf >= 0.78, `staffing at requiredAgents misses its own target: ${perf.tsf}`);
});
test("requiredAgents: zero volume needs ~zero agents", () => {
  const req = S.requiredAgents(0, 300, 80, SETTINGS);
  assert.ok(req <= 1, "req for 0 calls = " + req);
});
test("requiredAgents: scales with volume", () => {
  const r1 = S.requiredAgents(30, 300, 80, SETTINGS);
  const r2 = S.requiredAgents(120, 300, 80, SETTINGS);
  assert.ok(r2 > r1, `${r2} should exceed ${r1}`);
});
