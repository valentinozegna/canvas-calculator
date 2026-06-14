const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PAPER_SETS, paperInches, targetFor, toInches, fromInches, aspectRatioLabel } = require("../ratio.js");

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

// Aspect-ratio labels: tidy integer ratios for the common print sizes, and a
// 1:x.xx decimal fallback for the A-series (which never reduces cleanly).
test("aspectRatioLabel reduces common sizes and falls back for A-series", () => {
  assert.equal(aspectRatioLabel(16, 20), "4:5");
  assert.equal(aspectRatioLabel(20, 16), "4:5");   // order-independent
  assert.equal(aspectRatioLabel(8, 10), "4:5");
  assert.equal(aspectRatioLabel(4, 6), "2:3");
  assert.equal(aspectRatioLabel(5, 7), "5:7");
  assert.equal(aspectRatioLabel(8.5, 11), "17:22"); // 2-decimal input
  assert.equal(aspectRatioLabel(18, 24), "3:4");
  assert.equal(aspectRatioLabel(24, 36), "2:3");
  // A4 (21 × 29.7 cm) reduces to 70:99, too large -> decimal form.
  assert.equal(aspectRatioLabel(21, 29.7), "1:1.41");
  assert.equal(aspectRatioLabel(59.4, 84.1), "1:1.42");
});

// Unit conversions round-trip.
test("unit conversion round-trips", () => {
  assert.ok(Math.abs(toInches(2.54, "cm") - 1) < 1e-9);
  assert.ok(Math.abs(toInches(25.4, "mm") - 1) < 1e-9);
  assert.ok(Math.abs(fromInches(1, "cm") - 2.54) < 1e-9);
  assert.ok(Math.abs(fromInches(toInches(7.3, "cm"), "cm") - 7.3) < 1e-9);
});
