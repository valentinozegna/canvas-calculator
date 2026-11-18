const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PAPER_SETS, paperInches, targetFor, pixelTarget, toInches, fromInches, aspectRatioLabel } = require("../ratio.js");

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

// Regression: 3406 x 3717 px onto 8.5 x 11 used to round to 3406 x 4408, which
// is not 17:22 and left a white sliver in Lightroom's 8.5 x 11 print cell.
test("pixelTarget hits small-integer paper ratios exactly and never shrinks", () => {
  const t = targetFor(3406 / 240, 3717 / 240, paperInches({ a: 8.5, b: 11, unit: "in" }), "match");
  assert.deepEqual(pixelTarget(3406, 3717, t), { w: 3417, h: 4422 });
  // The old, rounded canvas is not exact either, so it must expand again.
  assert.deepEqual(pixelTarget(3406, 4408, t), { w: 3417, h: 4422 });
  // Already exact: no change.
  assert.deepEqual(pixelTarget(3417, 4422, t), { w: 3417, h: 4422 });

  const sizes = [[3406, 3717], [6000, 4000], [4000, 6000], [5000, 5000], [1234, 987]];
  const allPapers = [...PAPER_SETS.us.papers, ...PAPER_SETS.eu.papers];
  for (const [w, h] of sizes) {
    for (const p of allPapers) {
      for (const mode of ["match", "landscape", "portrait"]) {
        const tt = targetFor(w, h, paperInches(p), mode);
        const px = pixelTarget(w, h, tt);
        assert.ok(px.w >= w && px.h >= h, `clips for ${p.name} ${mode}`);
        assert.ok(Number.isInteger(px.w) && Number.isInteger(px.h));
        if (p.unit === "in") {
          // Every US paper reduces to small integers, so the ratio is exact.
          assert.equal(px.w * tt.paperH, px.h * tt.paperW, `inexact for ${p.name} ${mode}`);
        } else {
          assert.ok(Math.abs(px.w / px.h - tt.paperW / tt.paperH) < 1 / Math.min(px.w, px.h));
        }
      }
    }
  }
});
