// Generates the panel icons (no external deps — built-in zlib + a tiny PNG
// encoder). Draws a concentric-frame glyph suggesting a canvas being expanded
// to a new aspect frame. Run: `node tools/build-icons.js`.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ---- minimal PNG (RGBA, 8-bit) encoder -----------------------------------

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  // 10..12 already 0 (compression, filter, interlace)
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

// ---- glyph -----------------------------------------------------------------

// A pixel is "on" if it sits in the stroke band of a rectangle defined by an
// inset from each edge and a stroke thickness.
function onRectBorder(x, y, size, ins, th) {
  const left = ins, top = ins, right = size - 1 - ins, bottom = size - 1 - ins;
  const inside = x >= left && x <= right && y >= top && y <= bottom;
  const nearEdge = x < left + th || x > right - th || y < top + th || y > bottom - th;
  return inside && nearEdge;
}

function drawIcon(size, color) {
  const rgba = Buffer.alloc(size * size * 4); // transparent
  const outerIns = Math.round(size * 0.13);
  const outerTh = Math.max(2, Math.round(size * 0.09));
  const innerIns = Math.round(size * 0.30);
  const innerTh = Math.max(1, Math.round(size * 0.06));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on =
        onRectBorder(x, y, size, outerIns, outerTh) ||
        onRectBorder(x, y, size, innerIns, innerTh);
      if (on) {
        const i = (y * size + x) * 4;
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = 255;
      }
    }
  }
  return encodePng(size, rgba);
}

// ---- emit ------------------------------------------------------------------

const DARK_GLYPH = [38, 38, 38];     // for light UI themes
const LIGHT_GLYPH = [235, 235, 235]; // for dark UI themes
const outDir = path.join(__dirname, "..", "icons");

const files = [
  ["light.png", 23, DARK_GLYPH],
  ["light@2x.png", 46, DARK_GLYPH],
  ["dark.png", 23, LIGHT_GLYPH],
  ["dark@2x.png", 46, LIGHT_GLYPH]
];

for (const [name, size, color] of files) {
  fs.writeFileSync(path.join(outDir, name), drawIcon(size, color));
  console.log("wrote icons/" + name + " (" + size + "x" + size + ")");
}
