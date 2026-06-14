# Canvas Ratio

A Photoshop panel that expands your photo's canvas to a chosen print paper ratio
**without ever cropping the image** — then helps you fit the photo to the new frame.

![The Canvas Ratio panel in Photoshop](docs/panel.jpg)

## Why you'd want it

When you mat a photo onto a fixed paper size (17×22, 16×20, A4, 5×7…), Photoshop's
**Canvas Size crops** the moment a target dimension is smaller than your image. There's
no built-in "just add canvas to reach this ratio" command.

Canvas Ratio does exactly that: it keeps your image's longer side fixed and grows **only
the shorter side** until the canvas matches the paper ratio. Because it only ever *adds*
canvas, **nothing is cropped** and the added border is transparent. You see the exact new
size before you commit.

## How to use it

1. **Open your photo.** The panel shows its current size at the top and keeps it up to
   date as you work or switch documents.
2. **Choose the paper size.** Pick from **Common sizes** (US frame sizes and EU A-series),
   or type any **Width × Height** and choose your unit (in / cm / mm).
3. **Set the options:**
   - **Orientation** — match your photo, or force landscape / portrait.
   - **Add canvas to** — center the photo (border on both sides) or push it to one edge.
4. **Check the Preview.** It shows the target ratio, your original canvas, the computed
   new canvas, and how much will be added — e.g. *"Grow width by 0.99 in · nothing is
   clipped."* If your canvas already matches the ratio, **Expand canvas** is disabled.
5. **Click Expand canvas.** The canvas grows to the ratio with a transparent border; your
   image is untouched. (A locked *Background* becomes a normal layer so the border can be
   transparent.) Undo (⌘Z) restores it.

### After expanding (optional)

Scale your photo within the new frame:

- **Fill** — enlarge to cover the whole canvas (edges may extend past the frame).
- **Fit** — shrink to sit fully inside the canvas (transparent margins remain).
- **Warp** — stretch to fill the canvas exactly (no cropping, slight distortion).

Hover any of the three for a one-line description.

## Installing

Canvas Ratio isn't on the Adobe Marketplace yet, so you install it manually with Adobe's
free **UXP Developer Tool (UDT)**:

1. In the **Creative Cloud desktop app**, search for and install **UXP Developer Tool**.
2. *(If your Photoshop has it)* enable **Settings → Plugins → Enable Developer Mode**.
3. [Download this plugin](https://github.com/valentinozegna/canvas-calculator) (green
   **Code → Download ZIP**) and unzip it somewhere permanent.
4. Open **Photoshop**, then open **UDT** → **Add Plugin** → select the plugin's
   `manifest.json`.
5. Click **Load**. The **Canvas Ratio** panel appears under Photoshop's **Plugins** menu.

> Requires Photoshop 2024 (24.0) or newer.

Tip: dock the panel alongside your other panels — it sizes itself to show everything at once.

## Good to know

- The added border is **transparent**. Flatten or add your own background layer if you
  want a white (or colored) mat for printing.
- Expanding changes only the canvas ratio, not your print resolution — your photo keeps its
  original pixels and PPI.
- Scaling (Fill / Fit / Warp) always keeps the photo from being cropped except **Fill**,
  which intentionally covers the frame.

## License

[MIT](LICENSE) © 2026 Valentino Zegna

---

<details>
<summary>For developers</summary>

Plain HTML/JS UXP plugin — no build step. The pure ratio math lives in
[`ratio.js`](ratio.js) (no Photoshop dependency) and is unit-tested.

```bash
npm install     # dev tooling only (ESLint)
npm test        # run the ratio math unit tests
npm run lint    # ESLint
npm run icons   # regenerate panel icons
```

- **Debug:** in UDT, use the plugin's ••• → **Debug** to open DevTools for the panel.
- **Reload:** after editing source, click **Reload** in UDT (manifest changes need a full
  unload/reload, and a workspace reset or relaunch to pick up new panel sizes).
- **Package:** UDT ••• → **Package** produces a signed `.ccx`; double-clicking it installs
  via the Creative Cloud desktop app.
- **Publishing:** a public Marketplace listing needs a real plugin ID from Adobe's
  [Developer Distribution](https://developer.adobe.com/distribution/) portal, replacing the
  placeholder `com.valentino.canvasratio` in [`manifest.json`](manifest.json).

</details>
