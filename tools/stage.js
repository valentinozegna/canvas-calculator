// Stage a clean, runtime-only copy of the plugin into build/canvas-ratio/.
// UDT packages whatever folder it is pointed at, so pointing it at the repo
// root sweeps in .git/, node_modules/, tests, etc. Point UDT at the staged
// folder instead to get a lean .ccx with only what the panel needs to run.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "build", "canvas-ratio");

// Everything the panel needs at runtime, and nothing else.
const FILES = ["manifest.json", "index.html", "index.js", "ratio.js", "LICENSE"];
const DIRS = ["icons"];

fs.rmSync(path.join(root, "build"), { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const f of FILES) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
}
for (const d of DIRS) {
  fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
}

console.log("Staged clean plugin at: " + out);
console.log("In UDT: Add Plugin -> select build/canvas-ratio/manifest.json -> ... -> Package");
