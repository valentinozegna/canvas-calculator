const { app, core, constants } = require("photoshop");
const { PAPER_SETS, toInches, fromInches, targetFor } = RatioCore;

const els = {
  pw: document.getElementById("pw"),
  ph: document.getElementById("ph"),
  unit: document.getElementById("unit"),
  orient: document.getElementById("orient"),
  anchor: document.getElementById("anchor"),
  preset: document.getElementById("preset"),
  ppi: document.getElementById("ppi"),
  refresh: document.getElementById("refresh"),
  docnote: document.getElementById("docnote"),
  preview: document.getElementById("preview"),
  expand: document.getElementById("expand"),
  moreToggle: document.getElementById("moreToggle"),
  more: document.getElementById("more"),
  fill: document.getElementById("fill"),
  fit: document.getElementById("fit"),
  resize: document.getElementById("resize")
};

// Current document canvas, in pixels + inches (null when no doc is open).
let docState = null;
// Last computed target canvas (the thing the Expand button applies).
let current = null;

// Round to 2 decimals, dropping trailing zeros (e.g. 22, 8.5, 21.6).
function fmt(n) { return String(Math.round(n * 100) / 100); }
function curUnit() { return els.unit.value || "in"; }
function targetPpi() { const p = parseFloat(els.ppi.value); return p > 0 ? p : 300; }
function errMsg(e) { return e && e.message ? e.message : String(e); }
function status(msg) { els.docnote.textContent = msg; }

// ---- target paper size (from the inputs, converted to inches) -------------

function paperInchesFromInputs() {
  const u = curUnit();
  const pw = toInches(parseFloat(els.pw.value), u);
  const ph = toInches(parseFloat(els.ph.value), u);
  return { pw, ph, ok: pw > 0 && ph > 0 };
}

// ---- quick-fill presets ----------------------------------------------------

function buildPresets() {
  const menu = els.preset.querySelector("sp-menu");
  const custom = document.createElement("sp-menu-item");
  custom.setAttribute("value", "");
  custom.setAttribute("selected", "");
  custom.textContent = "Custom…";
  menu.appendChild(custom);

  ["us", "eu"].forEach((key) => {
    PAPER_SETS[key].papers.forEach((p) => {
      const item = document.createElement("sp-menu-item");
      item.setAttribute("value", `${p.a}|${p.b}|${p.unit}`);
      item.textContent = p.name.includes("×")
        ? `${p.name} ${p.unit}`
        : `${p.name} (${fmt(p.a)} × ${fmt(p.b)} ${p.unit})`;
      menu.appendChild(item);
    });
  });
}

function onPresetChange() {
  const v = els.preset.value;
  if (!v) return;
  const [a, b, u] = v.split("|");
  els.unit.value = u;
  els.unit.dataset.prev = u;
  els.pw.value = a;
  els.ph.value = b;
  compute();
}

// ---- read active document --------------------------------------------------

function readDoc() {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) {
    docState = null;
    status("No open document. Open one, then tap “Re-read document”.");
    compute();
    return null;
  }
  const ppi = doc.resolution;
  docState = { wPx: doc.width, hPx: doc.height, ppi, wIn: doc.width / ppi, hIn: doc.height / ppi };
  const u = curUnit();
  els.docnote.innerHTML =
    `Original document: <b>${fmt(fromInches(docState.wIn, u))} × ${fmt(fromInches(docState.hIn, u))} ${u}</b>` +
    ` · ${docState.wPx} × ${docState.hPx} px @ ${Math.round(ppi)} ppi`;
  compute();
  return doc;
}

// ---- compute + preview -----------------------------------------------------

function compute() {
  if (!docState) {
    els.preview.className = "preview muted";
    els.preview.textContent = "Open a document and tap “Re-read document”.";
    current = null;
    return;
  }
  const { pw, ph, ok } = paperInchesFromInputs();
  if (!ok) {
    els.preview.className = "preview muted";
    els.preview.textContent = "Enter a target paper size (e.g. 16 × 20).";
    current = null;
    return;
  }
  const mode = els.orient.value || "match";
  current = targetFor(docState.wIn, docState.hIn, [pw, ph], mode);
  renderPreview(current);
}

function renderPreview(t) {
  const u = curUnit();
  const ppi = docState.ppi;
  const oW = fromInches(docState.wIn, u), oH = fromInches(docState.hIn, u);
  const nW = fromInches(t.Cw, u), nH = fromInches(t.Ch, u);
  const nWpx = Math.round(t.Cw * ppi), nHpx = Math.round(t.Ch * ppi);
  const a = parseFloat(els.pw.value), b = parseFloat(els.ph.value);
  const lo = Math.max(a, b), sh = Math.min(a, b);
  const ratioLabel = t.paperLandscape ? `${fmt(lo)} : ${fmt(sh)}` : `${fmt(sh)} : ${fmt(lo)}`;
  const deltaTxt = t.delta < 0.005
    ? "Already matches this ratio — no expansion needed."
    : `Grow <b>${t.grow}</b> by <b>${fmt(fromInches(t.delta, u))} ${u}</b> · nothing is clipped.`;

  els.preview.className = "preview";
  els.preview.innerHTML =
    `<div class="prow"><span>Target ratio</span><b>${ratioLabel}</b></div>` +
    `<div class="pline"><b>${fmt(oW)} × ${fmt(oH)}</b> → <b>${fmt(nW)} × ${fmt(nH)} ${u}</b></div>` +
    `<div class="psub">${docState.wPx} × ${docState.hPx} → ${nWpx} × ${nHpx} px @ ${Math.round(ppi)} ppi</div>` +
    `<div class="delta">${deltaTxt}</div>`;
}

// ---- anchor mapping --------------------------------------------------------

// The picker asks where the *added* canvas goes; Photoshop's canvasSize enum
// wants where the existing content is anchored (the opposite side). We only set
// the enum on the axis that actually grows.
function anchorEnums(grow) {
  const a = els.anchor.value || "center"; // center | start(add bottom/right) | end(add top/left)
  let horizontal = "center", vertical = "center";
  if (grow === "height") {
    vertical = a === "start" ? "top" : a === "end" ? "bottom" : "center";
  } else {
    horizontal = a === "start" ? "left" : a === "end" ? "right" : "center";
  }
  return { horizontal, vertical };
}

// ---- mutations (all inside executeAsModal) --------------------------------

// Expand the canvas to the previewed target. Convert inches -> px via the doc
// resolution and pass explicit pixel units so ruler settings can't interfere.
// Growing-only, so no clipping and the Background layer stays fine.
async function expandCanvas() {
  if (!docState) { status("No open document."); return; }
  if (!current) { status("Enter a target paper size first."); return; }
  const t = current;
  const ppi = docState.ppi;
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
    }, { commandName: "Expand canvas to ratio" });
    readDoc();
  } catch (e) {
    status("Expand failed: " + errMsg(e));
  }
}

// Resample the whole image to the exact oriented paper size at the target PPI.
async function resizeExact() {
  if (!docState) { status("No open document."); return; }
  if (!current) { status("Enter a target paper size first."); return; }
  const ppi = targetPpi();
  const wPx = Math.round(current.paperW * ppi);
  const hPx = Math.round(current.paperH * ppi);

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
    }, { commandName: "Resize to exact paper size" });
    readDoc();
  } catch (e) {
    status("Resize failed: " + errMsg(e));
  }
}

// Scale the active layer to FILL (cover) or FIT (contain) the current canvas,
// aspect-locked, then recenter it.
async function scaleLayer(fill) {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) { status("No open document."); return; }
  const layer = (doc.activeLayers && doc.activeLayers[0]) || null;
  if (!layer) { status("No active layer to scale. Select a layer first."); return; }

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
      const cw = doc.width, ch = doc.height;
      const factor = (fill ? Math.max(cw / lw, ch / lh) : Math.min(cw / lw, ch / lh)) * 100;
      await layer.scale(factor, factor, constants.AnchorPosition.MIDDLECENTER);
      const nb = layer.bounds;
      await layer.translate(cw / 2 - (nb.left + nb.right) / 2, ch / 2 - (nb.top + nb.bottom) / 2);
    }, { commandName: fill ? "Fill canvas with layer" : "Fit layer to canvas" });
    status(fill ? "Layer scaled to fill the canvas." : "Layer scaled to fit the canvas.");
  } catch (e) {
    status("Scale failed: " + errMsg(e));
  }
}

// ---- wiring ----------------------------------------------------------------

buildPresets();

els.refresh.addEventListener("click", readDoc);
els.expand.addEventListener("click", expandCanvas);
els.moreToggle.addEventListener("click", () => {
  const hidden = els.more.classList.toggle("hidden");
  els.moreToggle.textContent = hidden ? "More actions ▾" : "Fewer actions ▴";
});
els.resize.addEventListener("click", resizeExact);
els.fill.addEventListener("click", () => scaleLayer(true));
els.fit.addEventListener("click", () => scaleLayer(false));
els.preset.addEventListener("change", onPresetChange);

["input", "change"].forEach((ev) => {
  els.pw.addEventListener(ev, compute);
  els.ph.addEventListener(ev, compute);
});
els.orient.addEventListener("change", compute);

// Switching display unit converts the paper inputs so the physical size stays
// constant, then re-reads the doc (which redraws the note + preview in the new unit).
els.unit.addEventListener("change", () => {
  const prev = els.unit.dataset.prev || "in";
  const next = curUnit();
  if (prev !== next) {
    [els.pw, els.ph].forEach((inp) => {
      const v = parseFloat(inp.value);
      if (v > 0) inp.value = fmt(fromInches(toInches(v, prev), next));
    });
  }
  els.unit.dataset.prev = next;
  readDoc();
});
els.unit.dataset.prev = "in";

// Initial read in case a document is already open.
try { readDoc(); } catch (e) { compute(); }
