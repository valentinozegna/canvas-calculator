const { app, core, action } = require("photoshop");
const { PAPER_SETS, toInches, fromInches, targetFor, aspectRatioLabel } = RatioCore;

const els = {
  pw: document.getElementById("pw"),
  ph: document.getElementById("ph"),
  unit: document.getElementById("unit"),
  orient: document.getElementById("orient"),
  anchor: document.getElementById("anchor"),
  preset: document.getElementById("preset"),
  docnote: document.getElementById("docnote"),
  preview: document.getElementById("preview"),
  expand: document.getElementById("expand"),
  fill: document.getElementById("fill"),
  fit: document.getElementById("fit"),
  warp: document.getElementById("warp"),
  fithint: document.getElementById("fithint")
};

// Current document canvas, in pixels + inches (null when no doc is open).
let docState = null;
// Last computed target canvas (the thing the Expand button applies).
let current = null;

// Round to 2 decimals, dropping trailing zeros (e.g. 22, 8.5, 21.6).
function fmt(n) { return String(Math.round(n * 100) / 100); }
function curUnit() { return els.unit.value || "in"; }
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

// Build (or rebuild) the preset list, showing every paper's dimensions in the
// currently selected display unit. The item value stays the paper's NATIVE
// dims+unit (canonical), so a rebuild on unit change keeps the same selection.
function buildPresets() {
  const menu = els.preset.querySelector("sp-menu");
  const prev = els.preset.value || "";
  while (menu.firstChild) menu.removeChild(menu.firstChild);
  const u = curUnit();

  const items = [];
  const custom = document.createElement("sp-menu-item");
  custom.setAttribute("value", "");
  custom.textContent = "Custom…";
  menu.appendChild(custom);
  items.push(custom);

  ["us", "eu"].forEach((key) => {
    PAPER_SETS[key].papers.forEach((p) => {
      const item = document.createElement("sp-menu-item");
      item.setAttribute("value", `${p.a}|${p.b}|${p.unit}`);
      // Convert native dims -> display unit; ratio is dimensionless so it uses
      // the native values directly.
      const da = fmt(fromInches(toInches(p.a, p.unit), u));
      const db = fmt(fromInches(toInches(p.b, p.unit), u));
      const dims = `${da} × ${db} ${u}`;
      // Named papers (A4 …) keep the name; US sizes are named by their dims.
      const label = p.name.includes("×") ? dims : `${p.name} · ${dims}`;
      item.textContent = `${label} (${aspectRatioLabel(p.a, p.b)})`;
      menu.appendChild(item);
      items.push(item);
    });
  });

  // Restore the previous selection (default to Custom…).
  const match = items.find((it) => it.getAttribute("value") === prev) || custom;
  match.setAttribute("selected", "");
  els.preset.value = match.getAttribute("value");
}

function onPresetChange() {
  const v = els.preset.value;
  if (!v) return;
  // Fill the fields in the user's CURRENT display unit (convert from native).
  const [a, b, nativeUnit] = v.split("|");
  const u = curUnit();
  els.pw.value = fmt(fromInches(toInches(parseFloat(a), nativeUnit), u));
  els.ph.value = fmt(fromInches(toInches(parseFloat(b), nativeUnit), u));
  compute();
}

// ---- read active document --------------------------------------------------

// Signature of the active document (id + size + resolution). Used to detect
// document switches / canvas changes that fire no notification event.
function docSignature() {
  try {
    const d = app.activeDocument;
    return d ? `${d.id}:${d.width}:${d.height}:${d.resolution}` : "none";
  } catch (e) {
    return "none";
  }
}
let lastSig = "";

function readDoc() {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) {
    docState = null;
    lastSig = "none";
    status("No open document. Open one to begin.");
    compute();
    return null;
  }
  const ppi = doc.resolution;
  docState = { id: doc.id, wPx: doc.width, hPx: doc.height, ppi, wIn: doc.width / ppi, hIn: doc.height / ppi };
  lastSig = docSignature();
  const u = curUnit();
  els.docnote.className = "";
  els.docnote.innerHTML =
    `<div class="kv"><span class="k">Document</span><span class="v">${fmt(fromInches(docState.wIn, u))} × ${fmt(fromInches(docState.hIn, u))} ${u}</span></div>` +
    `<div class="kv"><span class="k">Pixels</span><span class="v">${docState.wPx} × ${docState.hPx} px</span></div>` +
    `<div class="kv"><span class="k">Resolution</span><span class="v">${Math.round(ppi)} ppi</span></div>`;
  compute();
  return doc;
}

// ---- compute + preview -----------------------------------------------------

function compute() {
  if (!docState) {
    els.preview.className = "preview muted";
    els.preview.textContent = "Open a document and tap “Re-read document”.";
    current = null;
    els.expand.disabled = true;
    return;
  }
  const { pw, ph, ok } = paperInchesFromInputs();
  if (!ok) {
    els.preview.className = "preview muted";
    els.preview.textContent = "Enter a target paper size (e.g. 16 × 20).";
    current = null;
    els.expand.disabled = true;
    return;
  }
  const mode = els.orient.value || "match";
  current = targetFor(docState.wIn, docState.hIn, [pw, ph], mode);
  renderPreview(current);
  // Nothing to do when the canvas already matches the target ratio.
  els.expand.disabled = current.delta < 0.005;
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
    ? "Already matches this ratio. No expansion needed."
    : `Grow <b>${t.grow}</b> by <b>${fmt(fromInches(t.delta, u))} ${u}</b>. Nothing is clipped.`;

  els.preview.className = "preview";
  els.preview.innerHTML =
    `<div class="kv"><span class="k">Target ratio</span><span class="v">${ratioLabel}</span></div>` +
    `<div class="kv"><span class="k">Current size</span><span class="v">${fmt(oW)} × ${fmt(oH)} ${u}<small>${docState.wPx} × ${docState.hPx} px</small></span></div>` +
    `<div class="kv"><span class="k">New size</span><span class="v">${fmt(nW)} × ${fmt(nH)} ${u}<small>${nWpx} × ${nHpx} px</small></span></div>` +
    `<div class="kv"><span class="k">Resolution</span><span class="v">${Math.round(ppi)} ppi</span></div>` +
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
  const sizeDesc = {
    _obj: "canvasSize",
    width: { _unit: "pixelsUnit", _value: newWpx },
    height: { _unit: "pixelsUnit", _value: newHpx },
    horizontal: { _enum: "horizontalLocation", _value: anc.horizontal },
    vertical: { _enum: "verticalLocation", _value: anc.vertical },
    _options: { dialogOptions: "dontDisplay" }
  };

  try {
    await core.executeAsModal(async () => {
      // Promote a locked Background to a normal layer so the added canvas is
      // transparent rather than filled with a solid color. Only attempt this
      // when a Background actually exists — running "set" with no Background
      // raises a "command not available" error that aborts the expand.
      const doc = app.activeDocument;
      let hasBackground = false;
      try { hasBackground = Array.from(doc.layers).some((l) => l.isBackgroundLayer); } catch (e) { /* ignore */ }
      if (hasBackground) {
        await app.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "layer", _property: "background" }],
          to: { _obj: "layer" },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      }

      await app.batchPlay([sizeDesc], {}); // adds transparent canvas
    }, { commandName: "Expand canvas to ratio" });
    readDoc();
  } catch (e) {
    status("Expand failed: " + errMsg(e));
  }
}

// Scale the active layer to FILL (cover) or FIT (contain) the current canvas,
// "fill" (cover) and "fit" (contain) keep aspect ratio; "warp" stretches the
// layer non-uniformly to fill the canvas exactly (no crop, but distorts). All
// three recenter the layer afterward.
const SCALE = {
  fill: { command: "Fill canvas with layer", done: "Layer scaled to fill the canvas." },
  fit: { command: "Fit layer to canvas", done: "Layer scaled to fit the canvas." },
  warp: { command: "Warp layer to canvas", done: "Layer warped to fill the canvas." }
};

async function scaleLayer(mode) {
  let doc;
  try { doc = app.activeDocument; } catch (e) { doc = null; }
  if (!doc) { status("No open document."); return; }

  try {
    await core.executeAsModal(async () => {
      // Resolve the layer inside the modal — activeLayers can read empty
      // outside one. Fall back to the topmost layer if nothing is selected.
      const layer =
        (doc.activeLayers && doc.activeLayers[0]) ||
        (doc.layers && doc.layers[0]) ||
        null;
      if (!layer) throw new Error("no layer to scale");

      // A locked Background can't be transformed; promote it to a normal layer.
      if (layer.isBackgroundLayer) {
        await app.batchPlay([{
          _obj: "set",
          _target: [{ _ref: "layer", _property: "background" }],
          to: { _obj: "layer" },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      }

      // Make this layer the transform target.
      await app.batchPlay([{
        _obj: "select",
        _target: [{ _ref: "layer", _id: layer.id }],
        makeVisible: false,
        _options: { dialogOptions: "dontDisplay" }
      }], {});

      const b = layer.bounds;
      const lw = b.right - b.left;
      const lh = b.bottom - b.top;
      const cw = doc.width, ch = doc.height;
      if (lw <= 0 || lh <= 0) throw new Error("layer has no pixels");

      let fx, fy;
      if (mode === "warp") {
        fx = (cw / lw) * 100;   // stretch each axis to the canvas exactly
        fy = (ch / lh) * 100;
      } else {
        const f = (mode === "fill" ? Math.max(cw / lw, ch / lh) : Math.min(cw / lw, ch / lh)) * 100;
        fx = fy = f;
      }
      // Scale around the layer's own center via batchPlay (reliable across hosts).
      await app.batchPlay([{
        _obj: "transform",
        _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
        freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
        width: { _unit: "percentUnit", _value: fx },
        height: { _unit: "percentUnit", _value: fy },
        _options: { dialogOptions: "dontDisplay" }
      }], {});

      // Recenter the layer on the canvas.
      const nb = layer.bounds;
      const dx = cw / 2 - (nb.left + nb.right) / 2;
      const dy = ch / 2 - (nb.top + nb.bottom) / 2;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        await app.batchPlay([{
          _obj: "move",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _obj: "offset", horizontal: { _unit: "pixelsUnit", _value: dx }, vertical: { _unit: "pixelsUnit", _value: dy } },
          _options: { dialogOptions: "dontDisplay" }
        }], {});
      }
    }, { commandName: (SCALE[mode] || SCALE.fill).command });
    status((SCALE[mode] || SCALE.fill).done);
  } catch (e) {
    status("Scale failed: " + errMsg(e));
  }
}

// ---- wiring ----------------------------------------------------------------

buildPresets();

els.expand.addEventListener("click", expandCanvas);
els.fill.addEventListener("click", () => scaleLayer("fill"));
els.fit.addEventListener("click", () => scaleLayer("fit"));
els.warp.addEventListener("click", () => scaleLayer("warp"));
els.preset.addEventListener("change", onPresetChange);

// Show a per-button description on hover; revert to the default on leave.
const FIT_DEFAULT = "Hover Fill, Fit, or Warp for what each does.";
const FIT_HINTS = {
  fill: "Fill — scale up to cover the canvas; overflow is cropped.",
  fit: "Fit — scale to sit inside the canvas; leaves transparent margins.",
  warp: "Warp — stretch to fill the canvas exactly; distorts, nothing cropped."
};
[["fill", els.fill], ["fit", els.fit], ["warp", els.warp]].forEach(([key, el]) => {
  el.addEventListener("mouseenter", () => { els.fithint.textContent = FIT_HINTS[key]; });
  el.addEventListener("mouseleave", () => { els.fithint.textContent = FIT_DEFAULT; });
});

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
  buildPresets(); // relabel every entry in the new unit
  readDoc();
});
els.unit.dataset.prev = "in";

// Keep the panel in sync with Photoshop automatically: re-read the document on
// any history change (edits, undo, redo) and on document open/close/select, so
// the Original-document line and Preview stay current without tapping Re-read.
// A short debounce coalesces bursts of events. readDoc() never touches the typed
// paper size, so this is safe to fire freely.
let syncTimer = null;
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    try { readDoc(); } catch (e) { /* ignore */ }
  }, 200);
}
try {
  action.addNotificationListener(
    ["historyStateChanged", "select", "open", "close"],
    () => scheduleSync()
  );
} catch (e) {
  // Notifications unavailable on this host — the poll below still keeps it in sync.
}

// Switching to an already-open document (clicking another tab) fires no reliable
// notification, so poll the active-document signature and re-read when it changes.
setInterval(() => {
  if (docSignature() !== lastSig) {
    try { readDoc(); } catch (e) { /* ignore */ }
  }
}, 700);

// Initial read in case a document is already open.
try { readDoc(); } catch (e) { compute(); }
