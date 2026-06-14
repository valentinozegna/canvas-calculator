# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-13

### Added
- Initial release of the **Canvas Ratio** Photoshop UXP panel.
- Expand the active document's canvas to a target print aspect ratio **without
  clipping** the image (grows one dimension only; the Background layer stays put).
- US print sizes (inches) and EU A-series sizes (cm), selectable by reference
  system, plus a custom size row and an in/cm/mm unit toggle.
- "Read active document" to populate dimensions from the open doc.
- Orientation picker (match image / force landscape / force portrait).
- Anchor picker (center / top-left / bottom-right) for where the added canvas goes.
- "Fill canvas" / "Fit to canvas" actions that scale the active layer
  aspect-locked (auto-promoting a locked Background layer).
- "Resize → exact print size" action that resamples to the literal paper
  dimensions at a configurable PPI (default 300).
- Pure-math core (`ratio.js`) with Node unit tests, ESLint config, and panel
  icons.
