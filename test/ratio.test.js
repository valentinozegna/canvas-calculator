const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PAPER_SETS, paperInches, targetFor, toInches, fromInches } = require("../ratio.js");

// Every (paper, orientation) combo across both systems must produce a canvas
// that CONTAINS the image — the no-clip contract.
test("targetFor never clips: Cw >= W and Ch >= H for all papers/orientations", () => {
  const images = [
    [27.95, 15.75], // wide landscape
    [15.75, 27.95], // tall portrait
    [10, 10],       // square
    [6, 4],         // small landscape
    [4, 6]          // small portrait
  ];
  const allPapers = [...PAPER_SETS.us.papers, ...PAPER_SETS.eu.papers];
  for (const [W, H] of images) {
    for (const p of allPapers) {
      for (const mode of ["match", "landscape", "portrait"]) {
        const t = targetFor(W, H, paperInches(p), mode);
        assert.ok(t.Cw >= W - 1e-9, `Cw<${W} for ${p.name} ${mode}`);
        assert.ok(t.Ch >= H - 1e-9, `Ch<${H} for ${p.name} ${mode}`);
        assert.ok(t.delta >= -1e-9, `negative delta for ${p.name} ${mode}`);
      }
    }
  }
});

// Headline case from the spec: a wide landscape photo onto 17×22 paper in
// "match" mode grows the height to a 22:17 landscape frame.
test("headline case: 27.95 x 15.75 in onto 17x22, match", () => {
  const paper = paperInches({ a: 17, b: 22, unit: "in" });
  const t = targetFor(27.95, 15.75, paper, "match");
  assert.equal(t.grow, "height");
  assert.equal(t.ratioLabel, "22:17");
  assert.equal(t.paperLandscape, true);
  // Width is preserved; height grows to W / (22/17).
  assert.ok(Math.abs(t.Cw - 27.95) < 1e-9);
  assert.ok(Math.abs(t.Ch - 27.95 / (22 / 17)) < 1e-9);
});

// Only the growing axis changes; the other stays equal to the image.
test("exactly one dimension is preserved when growing", () => {
  const paper = paperInches({ a: 8.5, b: 11, unit: "in" });
  const t = targetFor(12, 8, paper, "match");
  if (t.grow === "height") assert.ok(Math.abs(t.Cw - 12) < 1e-9);
  else assert.ok(Math.abs(t.Ch - 8) < 1e-9);
});

// EU A-series ratio is 1:sqrt(2). A4 portrait onto a portrait image keeps the
// expected aspect within rounding of the cm definition.
test("A4 produces an A-series aspect ratio", () => {
  const a4 = PAPER_SETS.eu.papers.find((p) => p.name === "A4");
  const t = targetFor(8, 11, paperInches(a4), "match");
  const aspect = Math.max(t.Cw, t.Ch) / Math.min(t.Cw, t.Ch);
  assert.ok(Math.abs(aspect - Math.SQRT2) < 0.01, `aspect ${aspect}`);
});

// Unit conversions round-trip.
test("unit conversion round-trips", () => {
  assert.ok(Math.abs(toInches(2.54, "cm") - 1) < 1e-9);
  assert.ok(Math.abs(toInches(25.4, "mm") - 1) < 1e-9);
  assert.ok(Math.abs(fromInches(1, "cm") - 2.54) < 1e-9);
  assert.ok(Math.abs(fromInches(toInches(7.3, "cm"), "cm") - 7.3) < 1e-9);
});
