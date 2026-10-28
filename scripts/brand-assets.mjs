// Builds transparent logos and app icons from the approved artwork in brand_assets/.
// Run: pnpm brand:assets
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "brand_assets/logo-white-on-navy.jpg";
const OUT = "public/brand";
const ICONS = "public/icons";
const MIDNIGHT = [14, 28, 51]; // #0E1C33
const WHITE = [255, 255, 255];
const BLUE = [65, 105, 255]; // #4169FF

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ICONS, { recursive: true });

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

// Background colour = average of the four corners.
const bg = [0, 0, 0];
for (const [x, y] of [[4, 4], [W - 5, 4], [4, H - 5], [W - 5, H - 5]]) {
  const i = (y * W + x) * C;
  for (let c = 0; c < 3; c++) bg[c] += data[i + c] / 4;
}

// Un-mix every pixel into (foreground colour, alpha) over the navy background.
// Foreground is either white (outline + lettering) or Ujaagar Blue (bars).
const alpha = new Float32Array(W * H);
const isBlue = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) {
  const i = p * C;
  const d = [data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]];
  let best = 0;
  let blue = 0;
  for (const [k, f] of [[0, WHITE], [1, BLUE]]) {
    const v = [f[0] - bg[0], f[1] - bg[1], f[2] - bg[2]];
    const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    const a = Math.min(1, Math.max(0, (d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / vv));
    // residual: how well this candidate explains the pixel
    const r = Math.hypot(d[0] - a * v[0], d[1] - a * v[1], d[2] - a * v[2]);
    if (k === 0 || r < best) {
      best = r;
      alpha[p] = a;
      blue = k;
    }
  }
  isBlue[p] = blue;
  if (alpha[p] < 0.04) alpha[p] = 0; // remove JPEG noise in the background
}

function bbox(x0 = 0, x1 = W) {
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++)
    for (let x = x0; x < x1; x++)
      if (alpha[y * W + x] > 0.2) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// The bubble mark ends where the first empty column gap appears after it.
const full = bbox();
const colHas = (x) => {
  for (let y = full.top; y < full.top + full.height; y++) if (alpha[y * W + x] > 0.2) return true;
  return false;
};
let x = full.left;
while (x < W && colHas(x)) x++; // through the bubble
const markEnd = x;

function render(textColour, region) {
  const out = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const col = isBlue[p] ? BLUE : textColour;
    out[p * 4] = col[0];
    out[p * 4 + 1] = col[1];
    out[p * 4 + 2] = col[2];
    out[p * 4 + 3] = Math.round(alpha[p] * 255);
  }
  const pad = 8;
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).extract({
    left: Math.max(0, region.left - pad),
    top: Math.max(0, region.top - pad),
    width: Math.min(W - region.left + pad, region.width + pad * 2),
    height: Math.min(H - region.top + pad, region.height + pad * 2),
  });
}

const mark = bbox(full.left, markEnd);

await (await render(MIDNIGHT, full)).png().toFile(`${OUT}/logo-on-light.png`);
await (await render(WHITE, full)).png().toFile(`${OUT}/logo-on-dark.png`);
await (await render(MIDNIGHT, mark)).png().toFile(`${OUT}/mark-on-light.png`);
await (await render(WHITE, mark)).png().toFile(`${OUT}/mark-on-dark.png`);

// App icons: white bubble mark on Midnight.
const markPng = await render(WHITE, mark).png().toBuffer();
async function icon(size, scale, file, rounded = false) {
  const inner = Math.round(size * scale);
  const m = await sharp(markPng).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  let base = sharp({
    create: { width: size, height: size, channels: 4, background: { r: MIDNIGHT[0], g: MIDNIGHT[1], b: MIDNIGHT[2], alpha: 1 } },
  }).composite([{ input: m, gravity: "center" }]);
  if (rounded) {
    const r = Math.round(size * 0.22);
    const maskSvg = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></svg>`);
    base = sharp(await base.png().toBuffer()).composite([{ input: maskSvg, blend: "dest-in" }]);
  }
  await base.png().toFile(path.join(ICONS, file));
}
await icon(192, 0.62, "icon-192.png");
await icon(512, 0.62, "icon-512.png");
await icon(512, 0.5, "icon-maskable-512.png");
await icon(180, 0.62, "apple-touch-icon.png");
await icon(64, 0.7, "favicon-64.png", true);

console.log("logo bbox", full, "mark bbox", mark, "bg", bg.map(Math.round));
console.log("Wrote", fs.readdirSync(OUT), fs.readdirSync(ICONS));
