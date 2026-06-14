const { app, core, constants } = require("photoshop");
const { PAPER_SETS, toInches, fromInches, paperInches, targetFor } = RatioCore;

const els = {
  iw: document.getElementById("iw"),
  ih: document.getElementById("ih"),
  unit: document.getElementById("unit"),
  orient: document.getElementById("orient"),
  anchor: document.getElementById("anchor"),
  system: document.getElementById("system"),
  ppi: document.getElementById("ppi"),
  refresh: document.getElementById("refresh"),
  docnote: document.getElementById("docnote"),
  fill: document.getElementById("fill"),
  fit: document.getElementById("fit"),
  usecustom: document.getElementById("usecustom"),
  cw: document.getElementById("cw"),
  ch: document.getElementById("ch"),
  results: document.getElementById("results")
};

// Round to 2 decimals, dropping trailing zeros (e.g. 22, 8.5, 29.7).
function fmt(n) {
  return String(Math.round(n * 100) / 100);
}
function note(msg) { els.docnote.textContent = msg; }

// ---- input helpers (unit-aware) -------------------------------------------

function curUnit() { return els.unit.value || "in"; }

// Image dimensions in inches, read from the (unit-bearing) inputs.
function imageInches() {
  const u = curUnit();
  const W = toInches(parseFloat(els.iw.value), u);
  const H = toInches(parseFloat(els.ih.value), u);
  return { W, H, ok: W > 0 && H > 0 };
}

function targetPpi() {
  const p = parseFloat(els.ppi.value);
  return p > 0 ? p : 300;
}

// ---- read active document --------------------------------------------------

// Reads need no modal scope. Converts px -> inches via doc.resolution, then
// displays in the currently selected unit.
function readDoc() {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) {
    note("No open document. Open one, then tap “Read active document”.");
    return null;
  }
  const ppi = doc.resolution; // pixels per inch
  const wIn = doc.width / ppi;
  const hIn = doc.height / ppi;
  const u = curUnit();
  els.iw.value = fmt(fromInches(wIn, u));
  els.ih.value = fmt(fromInches(hIn, u));
  els.docnote.innerHTML =
    `Active doc: <b>${doc.width} × ${doc.height} px</b> @ ${Math.round(ppi)} ppi ` +
    `(${fmt(fromInches(wIn, u))} × ${fmt(fromInches(hIn, u))} ${u})`;
  render();
  return doc;
}

// ---- rendering -------------------------------------------------------------

// Build the list of papers to show: the selected system's set, plus an
// optional custom row driven by the cw/ch inputs.
function activePapers() {
  const set = PAPER_SETS[els.system.value] || PAPER_SETS.us;
  const list = set.papers.slice();
  if (els.usecustom.checked) {
    const u = curUnit();
    const a = parseFloat(els.cw.value);
    const b = parseFloat(els.ch.value);
    if (a > 0 && b > 0) list.push({ name: `Custom (${fmt(a)} × ${fmt(b)} ${u})`, a, b, unit: u });
  }
  return list;
}

// Oriented native-unit labels for a paper, given the chosen orientation.
function paperLabels(p, landscape) {
  const lo = Math.max(p.a, p.b);
  const sh = Math.min(p.a, p.b);
  const ratioLabel = landscape ? `${fmt(lo)}:${fmt(sh)}` : `${fmt(sh)}:${fmt(lo)}`;
  const sizeLabel = landscape
    ? `${fmt(lo)} × ${fmt(sh)} ${p.unit}`
    : `${fmt(sh)} × ${fmt(lo)} ${p.unit}`;
  return { ratioLabel, sizeLabel };
}

function render() {
  els.results.innerHTML = "";
  const { W, H, ok } = imageInches();
  if (!ok) {
    note("Enter image width and height (or tap “Read active document”).");
    return;
  }
  const mode = els.orient.value || "match";
  const u = curUnit();

  activePapers().forEach((p) => {
    const t = targetFor(W, H, paperInches(p), mode);
    const lab = paperLabels(p, t.paperLandscape);

    const card = document.createElement("div");
    card.className = "card";
    const deltaIn = t.delta;
    const deltaTxt = deltaIn < 0.005
      ? "already matches ratio"
      : `grow ${t.grow} +${fmt(fromInches(deltaIn, u))} ${u}`;
    card.innerHTML =
      `<div class="top"><span class="name">${p.name}</span><span class="ratio">${lab.ratioLabel}</span></div>` +
      `<div class="target">${fmt(fromInches(t.Cw, u))} × ${fmt(fromInches(t.Ch, u))} ${u}</div>` +
      `<div class="delta">${deltaTxt}</div>`;

    const btns = document.createElement("div");
    btns.className = "btns";

    const expand = document.createElement("sp-button");
    expand.setAttribute("size", "s");
    expand.textContent = "Expand";
    expand.addEventListener("click", () => expandCanvas(t, p.name));

    const resize = document.createElement("sp-button");
    resize.setAttribute("size", "s");
    resize.setAttribute("variant", "secondary");
    resize.textContent = `Resize → ${lab.sizeLabel}`;
    resize.addEventListener("click", () => resizeExact(t, p.name));

    btns.appendChild(expand);
    btns.appendChild(resize);
    card.appendChild(btns);
    els.results.appendChild(card);
  });
}

// ---- anchor mapping --------------------------------------------------------

// The added canvas goes opposite the anchor. We only set the enum on the axis
// that actually grows; the other axis stays centered.
function anchorEnums(grow) {
  const a = els.anchor.value || "center";
  let horizontal = "center";
  let vertical = "center";
  if (grow === "height") {
    vertical = a === "start" ? "top" : a === "end" ? "bottom" : "center";
  } else {
    horizontal = a === "start" ? "left" : a === "end" ? "right" : "center";
  }
  return { horizontal, vertical };
}

// ---- mutations (all inside executeAsModal) --------------------------------

// Resize canvas to the target inch dimensions. Convert to pixels via the doc's
// resolution and pass explicit pixel units so ruler settings can't interfere.
// Growing-only, so no clipping and the Background layer stays fine.
async function expandCanvas(t, name) {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) { note("No open document."); return; }
  const ppi = doc.resolution;
  const newWpx = Math.round(t.Cw * ppi);
  const newHpx = Math.round(t.Ch * ppi);
  const anc = anchorEnums(t.grow);

  try {
    await core.executeAsModal(async () => {
      await app.batchPlay([{
        _obj: "canvasSize",
        width: { _unit: "pixelsUnit", _value: newWpx },
        height: { _unit: "pixelsUnit", _value: newHpx },
        horizontal: { _enum: "horizontalLocation", _value: anc.horizontal },
        vertical: { _enum: "verticalLocation", _value: anc.vertical },
        _options: { dialogOptions: "dontDisplay" }
      }], {});
    }, { commandName: `Expand canvas to ${name}` });
    readDoc();
  } catch (e) {
    note("Resize failed: " + errMsg(e));
  }
}

// Resample the whole image to the exact oriented paper size at the target PPI.
// Pass explicit pixel dimensions + density so the result lands on the literal
// print size regardless of ruler units.
async function resizeExact(t, name) {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) { note("No open document."); return; }
  const ppi = targetPpi();
  const wPx = Math.round(t.paperW * ppi);
  const hPx = Math.round(t.paperH * ppi);

  try {
    await core.executeAsModal(async () => {
      await app.batchPlay([{
        _obj: "imageSize",
        width: { _unit: "pixelsUnit", _value: wPx },
        height: { _unit: "pixelsUnit", _value: hPx },
        resolution: { _unit: "densityUnit", _value: ppi },
        scaleStyles: true,
        constrainProportions: true,
        interpolation: { _enum: "interpolationType", _value: "automaticInterpolation" },
        _options: { dialogOptions: "dontDisplay" }
      }], {});
    }, { commandName: `Resize to ${name}` });
    readDoc();
  } catch (e) {
    note("Resize failed: " + errMsg(e));
  }
}

// Scale the active layer to FILL (cover, may overflow) or FIT (contain, leaves
// margins) the current canvas, keeping aspect ratio locked, then recenter it.
async function scaleLayer(fill) {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) { note("No open document."); return; }
  const layer = (doc.activeLayers && doc.activeLayers[0]) || null;
  if (!layer) { note("No active layer to scale. Select a layer first."); return; }

  try {
    await core.executeAsModal(async () => {
      // A locked Background can't be transformed; promote it to a normal layer.
      if (layer.isBackgroundLayer) {
        await app.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "layer", _property: "background" }],
          to: { _obj: "layer" },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      }

      const b = layer.bounds;
      const lw = b.right - b.left;
      const lh = b.bottom - b.top;
      if (lw <= 0 || lh <= 0) throw new Error("layer has no pixels");
      const cw = doc.width;
      const ch = doc.height;
      const factor = (fill ? Math.max(cw / lw, ch / lh) : Math.min(cw / lw, ch / lh)) * 100;

      await layer.scale(factor, factor, constants.AnchorPosition.MIDDLECENTER);

      // Recenter on the canvas after scaling.
      const nb = layer.bounds;
      const cx = (nb.left + nb.right) / 2;
      const cy = (nb.top + nb.bottom) / 2;
      await layer.translate(cw / 2 - cx, ch / 2 - cy);
    }, { commandName: fill ? "Fill canvas with layer" : "Fit layer to canvas" });
    note(fill ? "Layer scaled to fill the canvas." : "Layer scaled to fit the canvas.");
  } catch (e) {
    note("Scale failed: " + errMsg(e));
  }
}

function errMsg(e) { return e && e.message ? e.message : String(e); }

// ---- wiring ----------------------------------------------------------------

els.refresh.addEventListener("click", readDoc);
els.fill.addEventListener("click", () => scaleLayer(true));
els.fit.addEventListener("click", () => scaleLayer(false));

["input", "change"].forEach((ev) => {
  els.iw.addEventListener(ev, render);
  els.ih.addEventListener(ev, render);
  els.cw.addEventListener(ev, render);
  els.ch.addEventListener(ev, render);
});
els.orient.addEventListener("change", render);
els.anchor.addEventListener("change", render);
els.system.addEventListener("change", render);
els.usecustom.addEventListener("change", render);

// Switching display unit: convert the existing input values so the physical
// size stays constant, then re-render.
els.unit.addEventListener("change", () => {
  const prev = els.unit.dataset.prev || "in";
  const next = curUnit();
  if (prev !== next) {
    [els.iw, els.ih, els.cw, els.ch].forEach((inp) => {
      const v = parseFloat(inp.value);
      if (v > 0) inp.value = fmt(fromInches(toInches(v, prev), next));
    });
  }
  els.unit.dataset.prev = next;
  render();
});
els.unit.dataset.prev = "in";

// Try an initial read in case a doc is already open.
try { readDoc(); } catch (e) { render(); }
