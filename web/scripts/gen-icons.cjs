/* Regenerate PWA icons from a font-independent vector mark.
 * Requires `sharp` (dev-only): npm i -D sharp && node scripts/gen-icons.cjs
 * The "W" is drawn as strokes (no font dependency), so output is deterministic. */
const path = require("node:path");
const { writeFileSync } = require("node:fs");
const sharp = require("sharp");

const PUB = path.join(__dirname, "..", "public");
const EMERALD = "#059669";
const WHITE = "#ffffff";

const wPath = "M128 176 L192 336 L256 236 L320 336 L384 176";
const wMark = `<path d="${wPath}" fill="none" stroke="${WHITE}" stroke-width="48" stroke-linejoin="round" stroke-linecap="round"/>`;
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${EMERALD}"/>${wMark}</svg>`;
const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="${EMERALD}"/>${wMark}</svg>`;

(async () => {
  writeFileSync(path.join(PUB, "icon.svg"), anySvg + "\n");
  const jobs = [
    { svg: anySvg, size: 192, out: "icon-192.png" },
    { svg: anySvg, size: 512, out: "icon-512.png" },
    { svg: maskSvg, size: 512, out: "icon-maskable-512.png" },
    { svg: maskSvg, size: 180, out: "apple-touch-icon.png" },
  ];
  for (const j of jobs) {
    await sharp(Buffer.from(j.svg))
      .resize(j.size, j.size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(PUB, j.out));
    console.log("wrote", j.out);
  }
})();
