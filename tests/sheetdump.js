// Dev helper: dump any sheet of a workbook via the SHIPPED xlsToGrid (STRING records included)
"use strict";
const fs = require("fs");
const { sandbox } = require("./extract.js");
const S = sandbox(["xlsToGrid", "pad", "iso"], []);
const buf = fs.readFileSync(process.argv[2]);
const sheets = S.xlsToGrid(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const want = process.argv[3];
if (!want) { sheets.forEach((s, i) => console.log(i, s.name, s.grid.filter(r => r && r.length).length + " rows")); process.exit(0); }
const sh = sheets.find(s => s.name.includes(want)) || sheets[+want];
const from = +(process.argv[4] || 0), to = +(process.argv[5] || from + 25);
console.log("=== " + sh.name + " ===");
for (let r = from; r < Math.min(to, sh.grid.length); r++) {
  if (!sh.grid[r]) continue;
  const cells = sh.grid[r].slice(0, 16).map(c => String(c ?? "").slice(0, 20));
  if (cells.some(c => c.trim())) console.log("r" + r + ": " + cells.join(" | "));
}
