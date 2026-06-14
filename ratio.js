// Canvas Ratio — pure math core (no Photoshop dependency).
// UMD-ish: works as a <script> in the UXP panel (exposes window.RatioCore)
// and via require() in Node for unit testing (module.exports).
(function (root) {
  "use strict";

  // Unit -> inches conversion factors. The math is unit-agnostic; only the
  // inputs/labels carry a unit, everything internal is computed in inches.
  const UNIT_TO_IN = { in: 1, cm: 1 / 2.54, mm: 1 / 25.4 };

  function toInches(value, unit) {
    return value * (UNIT_TO_IN[unit] || 1);
  }
  function fromInches(inches, unit) {
    return inches / (UNIT_TO_IN[unit] || 1);
  }

  // Print paper sets, grouped by reference system so the user can work in
  // their own convention. Each paper carries its native dimensions + unit;
  // `a`/`b` are the two sides in either order (the math sorts them).
  const PAPER_SETS = {
    us: {
      label: "US (inches)",
      unit: "in",
      papers: [
        { name: "4 × 6", a: 4, b: 6, unit: "in" },
        { name: "5 × 7", a: 5, b: 7, unit: "in" },
        { name: "8 × 10", a: 8, b: 10, unit: "in" },
        { name: "8.5 × 11", a: 8.5, b: 11, unit: "in" },
        { name: "11 × 14", a: 11, b: 14, unit: "in" },
        { name: "12 × 18", a: 12, b: 18, unit: "in" },
        { name: "13 × 19", a: 13, b: 19, unit: "in" },
        { name: "16 × 20", a: 16, b: 20, unit: "in" },
        { name: "17 × 22", a: 17, b: 22, unit: "in" },
        { name: "18 × 24", a: 18, b: 24, unit: "in" },
        { name: "20 × 24", a: 20, b: 24, unit: "in" },
        { name: "24 × 36", a: 24, b: 36, unit: "in" }
      ]
    },
    eu: {
      label: "EU (cm)",
      unit: "cm",
      papers: [
        { name: "A1", a: 59.4, b: 84.1, unit: "cm" },
        { name: "A2", a: 42.0, b: 59.4, unit: "cm" },
        { name: "A3", a: 29.7, b: 42.0, unit: "cm" },
        { name: "A4", a: 21.0, b: 29.7, unit: "cm" },
        { name: "A5", a: 14.8, b: 21.0, unit: "cm" },
        { name: "10 × 15", a: 10, b: 15, unit: "cm" }
      ]
    }
  };

  // Canonical [short, long] inch dimensions for a paper, regardless of its
  // native unit — this is what the ratio math consumes.
  function paperInches(p) {
    const s = Math.min(p.a, p.b);
    const l = Math.max(p.a, p.b);
    return [toInches(s, p.unit), toInches(l, p.unit)];
  }

  // Core math: given the image inch dims and a target paper (inch [a, b]),
  // return the minimal canvas that contains the image AND matches the ratio
  // (never clips). Contract: Cw >= W and Ch >= H, so a resize only ever grows.
  function targetFor(W, H, paper, mode) {
    const lng = Math.max(paper[0], paper[1]);
    const sht = Math.min(paper[0], paper[1]);
    const imgLandscape = W >= H;
    const paperLandscape = mode === "match" ? imgLandscape : (mode === "landscape");
    const ratio = paperLandscape ? (lng / sht) : (sht / lng);
    const imgRatio = W / H;
    let Cw, Ch, grow, delta;
    if (imgRatio > ratio) { Cw = W; Ch = W / ratio; grow = "height"; delta = Ch - H; }
    else { Ch = H; Cw = H * ratio; grow = "width"; delta = Cw - W; }
    const label = paperLandscape ? `${lng} × ${sht}` : `${sht} × ${lng}`;
    const ratioLabel = paperLandscape ? `${lng}:${sht}` : `${sht}:${lng}`;
    // Oriented paper dimensions (inches) for the exact-size resize step.
    const paperW = paperLandscape ? lng : sht;
    const paperH = paperLandscape ? sht : lng;
    return { Cw, Ch, grow, delta, label, ratioLabel, paperW, paperH, paperLandscape };
  }

  const api = { PAPER_SETS, UNIT_TO_IN, toInches, fromInches, paperInches, targetFor };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RatioCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
