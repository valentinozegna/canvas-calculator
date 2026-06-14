# CLAUDE.md — Canvas Ratio (Photoshop UXP plugin)

Repo: `github.com/valentinozegna/canvas-calculator` · branch `main` · MIT.
A UXP panel that expands a photo's canvas to a print paper ratio without cropping.

## Files
- `ratio.js` — pure math (UMD: `window.RatioCore` in panel, `module.exports` in Node). No PS dep. `targetFor()` is load-bearing: result always contains the image (`Cw>=W, Ch>=H`) so it never clips. Holds `PAPER_SETS` (US in / EU cm) + unit helpers.
- `index.html` / `index.js` — the panel UI + behavior. `manifest.json` v5, host PS 24.0.0.
- `test/ratio.test.js` (`node --test`), `eslint.config.js` (flat), `tools/build-icons.js`, `icons/`.

## Verify locally (can't run PS here — only static checks)
`npm test` · `npm run lint` · `node -e "require('./manifest.json')"`. Never claim runtime behavior works; give the user a manual check.

## UXP gotchas we discovered (the hard part)
- **Panel height:** `minimumSize` is a BINDING floor; `preferredDockedSize`/`preferredFloatingSize` are advisory ("may not be honored"). A cached size ignores `preferred*` but can't go below `minimumSize` → set `minimumSize` to control height. Manifest changes need UDT **Unload→Load** (not Reload); a cached size needs workspace reset / PS relaunch. No programmatic resize; panels don't auto-fit content.
- **All document mutations run inside `core.executeAsModal`;** property reads don't.
- **inches→px via `doc.resolution`;** pass explicit `{_unit:"pixelsUnit"}`.
- **Resolve the active layer INSIDE the modal** — `doc.activeLayers` reads empty outside it; fall back to `doc.layers[0]`.
- **DOM `layer.scale()`/`translate()` were no-ops on this host** → use `batchPlay` `transform` (percent w/h, `QCSAverage`) + `move` by offset; select the layer by `_id` first.
- **Active-document switch (tab change) fires NO reliable event** → poll `docSignature()` (id+w+h+res) every 700ms. Use `action.addNotificationListener(["historyStateChanged","select","open","close"])` for edits/undo (debounced).
- **`canvasSize` border fill:** added canvas takes the foreground swatch unless `canvasExtensionColorType` is set, and that only works for a locked **Background**. We chose transparent-only: promote Background→layer, then `canvasSize`. **Only promote if a Background exists** (`set` on a non-Background throws "command Set is not currently available" and aborts).
- Valid `canvasExtensionColorType`: `foregroundColor|backgroundColor|white|black|grey|color`. `RGBColor` green key is `grain` (charID quirk). Verify enums via grep.app / `adobe-uxp-types-crawler`.

## UI conventions
- Use Spectrum `sp-textfield`/`sp-picker size="s"` (raw `<input>` mismatches picker height); flex children need `min-width:0` or they clip.
- Theme via `--uxp-host-*` CSS vars. `body{height:100%;overflow-y:auto}` as a scroll fallback.
- Disable **Expand** when `delta<0.005` (ratio already matches).

## Design decisions (don't re-litigate)
- Single-target flow: panel reads the doc itself; user only enters the target paper size; preview before apply.
- Border is transparent-only (white/black fill was confusing) — Background becomes a layer.
- Removed Re-read button (auto-sync), Resize-to-exact, and Resize PPI (not needed for expansion).
- After expanding: Fill / Fit / Warp (warp = non-uniform stretch, no crop), with hover hints.
