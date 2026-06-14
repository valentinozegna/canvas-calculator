# Canvas Ratio

A Photoshop **UXP** panel that expands the active document's canvas to a chosen
print aspect ratio **without ever clipping the image**, then helps fit the photo
to the new frame and resize it to exact print dimensions.

> Repo: `canvas-calculator` · Plugin id: `com.valentino.canvasratio` (placeholder — see [Distribution](#distribution))

![Panel screenshot placeholder](docs/screenshot.png)
<!-- Drop a screenshot or GIF of the panel at docs/screenshot.png -->

## The problem it solves

Photographers regularly need to mat a photo onto a fixed print paper size
(17×22, A4, 5×7, …). Photoshop's **Canvas Size clips** whenever a new dimension
is smaller than the current one — there is no "expand-only to a target ratio"
command.

The correct manual move is: keep the image's longer dimension fixed and grow
**only the shorter dimension** until the canvas matches the target paper ratio.
This only ever *adds* canvas, so nothing is clipped — and the locked Background
layer doesn't need to be unlocked. Canvas Ratio automates that math and the
canvas-expansion step, then optionally scales the photo to the frame and
resamples to the literal print size.

**Key principle:** the expand step grows one dimension only → **no clipping**.

## How you use it

1. **Tell it the target paper size** — type any size (16 × 20, 8 × 11, 20 × 24, …),
   or pick one from the **Common sizes** quick-fill list.
2. **It reads your open document** — the original canvas size is shown automatically.
3. **It previews the result** — the computed new canvas size, the target ratio, and
   how much (and which side) will grow, all *before* you change anything.
4. **Apply** — tap **Expand canvas** to grow the canvas to that ratio without clipping.

## Features

- **Expand to ratio** — grows the canvas to match the target paper ratio, never clipping.
- **Preview before apply** — original canvas → new canvas (in your unit and in pixels)
  with the grow direction and amount, computed live as you type.
- **Any paper size** — type a custom size, or quick-fill from common US frame sizes
  (4×6 … 24×36 in) and EU A-series (A1–A5, 10×15 cm).
- **Units** — work in `in`, `cm`, or `mm` (the math is unit-agnostic).
- **Orientation** — match photo / force landscape / force portrait.
- **Add canvas to** — both sides, or biased to one edge (maps to the canvas anchor).
- **Fill / Fit** (optional, after expanding) — scale the active layer to cover or
  contain the canvas, aspect-locked (a locked Background layer is auto-promoted first).
- **Resize → exact size** (optional) — resample to the literal paper dimensions at a
  configurable PPI (default 300).

## How it works

- All document mutations run inside `core.executeAsModal` (required by Photoshop UXP).
- Inches are converted to pixels with the document's `resolution`, and **explicit
  pixel units** are passed to the resize actions so the user's ruler-unit
  preference can't interfere.
- The pure ratio math lives in [`ratio.js`](ratio.js) with no Photoshop
  dependency, so it is unit-tested in plain Node.

## Install (sideload via the UXP Developer Tool)

1. Install the **UXP Developer Tool (UDT)** from the Creative Cloud desktop app.
2. Open UDT → **Add Plugin** → select this folder's `manifest.json`.
3. Make sure Photoshop (24.0.0+) is running, then click **Load** next to the plugin.
4. The **Canvas Ratio** panel appears under *Plugins* in Photoshop.

## Develop / debug

- Edit the source, then click **Reload** in UDT to push changes to Photoshop.
- Click **Debug** (the `•••` menu in UDT) to open Chrome DevTools for the panel
  (console, DOM inspection, breakpoints).
- The plugin is plain HTML/JS — no build step.

### Project tooling

```bash
npm install        # dev tooling only (ESLint); the plugin itself has no deps
npm test           # run the pure-math unit tests (node --test)
npm run lint       # ESLint over the panel + Node code
npm run icons      # regenerate icons/*.png from tools/build-icons.js
```

The recommended **Validator for UXP** VS Code extension
(`JaroslavBereza.uxpvalidator`, community-maintained) lints `manifest.json` and
UXP CSS; VS Code will offer to install it from `.vscode/extensions.json`.

## Manual test checklist

The plugin can only be exercised inside Photoshop (it can't be auto-tested here).
After sideloading:

1. Open a wide landscape photo (e.g. **27.95 × 15.75 in @ 240 ppi**). The panel shows
   the **Original document** size automatically (tap **Re-read document** if needed).
2. Type a target paper size, e.g. **16 × 20** (or pick it from **Common sizes**).
3. The **Preview** updates: target ratio, original canvas, and the new canvas with the
   grow direction/amount — confirm it only grows one side.
4. Tap **Expand canvas** → the canvas grows to the ratio with a band on the short axis;
   the image is **uncropped**. **Undo** (⌘Z) restores the original.
5. (Optional) Tap **Fill canvas** / **Fit to canvas** → the active layer scales
   aspect-locked to cover / contain the frame.
6. (Optional) Set **Resize PPI** and tap **Resize to exact paper size** → the document
   lands on the literal print dimensions (e.g. 20 × 16 in @ 300 PPI = 6000 × 4800 px).
7. Switch **Unit** to cm and confirm values convert; try an EU A-size from Common sizes.

## Packaging to `.ccx`

1. In UDT, use the plugin's **•••** menu → **Package**.
2. UDT produces a signed `.ccx` file.
3. Double-clicking a `.ccx` installs the plugin via the **Creative Cloud desktop app**.

## Distribution

Public listing on the Adobe Marketplace requires a **real plugin ID** issued by
Adobe's [Developer Distribution](https://developer.adobe.com/distribution/)
portal. Replace the placeholder `com.valentino.canvasratio` in
[`manifest.json`](manifest.json) with that ID before submitting.

## Constraints / notes

- **UXP only** — CEP/ExtendScript is deprecated and intentionally not used.
- `manifest.json` must stay **manifestVersion 5** with a `host.minVersion`, or a
  `.ccx` install won't execute the panel's startup code.
- `doc.width` / `doc.height` are **pixels** in the UXP DOM; convert with
  `doc.resolution` for inches.
- Scaling is always aspect-locked — the image is never distorted.

## License

[MIT](LICENSE) © 2026 Valentino Zegna
