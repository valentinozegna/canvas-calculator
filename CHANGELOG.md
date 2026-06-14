# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
