# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-14

### Added
- **Aspect ratio in every preset**, e.g. `16 × 20 in (4:5)`; the A-series
  shows a `1:x.xx` decimal. The dropdown also renders all sizes in the
  currently selected unit and rebuilds when the unit changes.
- **Three-stage layout** with larger, full-width section dividers: **Input**
  (document size, pixels, pixel density), **Processing** (target size,
  orientation, anchor), **Output** (preview + Expand), and **Image fitting**
  (Fill / Fit / Warp).
- **Clearer preview**: target ratio shown as raw plus reduced and oriented to
  the chosen orientation (e.g. `20:16 (5:4)`), the grow amount in both the
  display unit and pixels, and labeled rows instead of crammed text.
- **Distribution**: install by double-clicking a signed `.ccx` from the
  GitHub Releases page; `npm run stage` builds a clean runtime-only folder
  for packaging.

### Changed
- Editing Width/Height resets the preset dropdown to **Custom…**.
- "Resolution" relabeled **Pixel density** (it is ppi, not the pixel count).
- Removed redundant copy (the duplicate current-size row, the standalone
  transparent-border hint, and several section labels).

## [0.1.0] - 2026-06-13

### Added
- Initial release of the **Canvas Ratio** Photoshop UXP panel.
- Single-target flow: enter a **target paper size**, see the **original** canvas
  (read from the active document) and the **computed new** canvas in a live
  **preview**, then **Expand canvas** to apply — grows one dimension only, so the
  image is never **clipped** and the Background layer stays put.
- Any custom paper size, plus a **Common sizes** quick-fill list (US frame sizes
  4×6 … 24×36 in, EU A-series A1–A5 and 10×15 cm) and an in/cm/mm unit toggle.
- Orientation picker (match photo / force landscape / force portrait) and an
  "Add canvas to" anchor (both sides / biased to one edge).
- The added canvas is transparent; a locked Background is converted to a normal
  layer first.
- Expand is disabled when the canvas already matches the target ratio.
- "Fill canvas" / "Fit to canvas" actions that scale the active layer
  aspect-locked (auto-promoting a locked Background layer).
- Auto-sync: the panel re-reads the document on edits, undo/redo, and document
  open/close/select, so the original size and preview stay current.
- Pure-math core (`ratio.js`) with Node unit tests, ESLint config, and panel
  icons.
