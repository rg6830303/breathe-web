// Render the admin PWA icons from admin-source.svg into PNGs.
// Run: node scripts/generate-admin-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(here, "..", "public", "icons");
const svg = readFileSync(join(iconsDir, "admin-source.svg"));

const targets = [
  { size: 192, file: "admin-icon-192.png" },
  { size: 512, file: "admin-icon-512.png" },
  { size: 180, file: "admin-apple-touch-icon.png" },
];

for (const t of targets) {
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(join(iconsDir, t.file));
  console.log("wrote", t.file);
}
