// One-off: downscale + re-encode the oversized club source photos.
// The originals were 6–9 MB PNGs (photographs, wrongly saved as PNG) and a
// 1.7 MB JPG. They render at most ~half viewport width, so 1600px on the long
// edge is ample for retina. Outputs progressive mozjpeg ~82q, in the 120–250 KB
// range to match the existing court-*.jpg assets. Run: node scripts/optimize-photos.mjs
import sharp from "sharp";
import { readFile, writeFile, unlink, stat } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "public", "photos");
const MAX = 1600;
const Q = 82;

// [sourceFile, outputJpgBasename]
const jobs = [
  ["community-women.png", "community-women.jpg"],
  ["players-action.png", "players-action.jpg"],
  ["community-court.png", "community-court.jpg"],
  ["breathe-kitchen.png", "breathe-kitchen.jpg"],
  ["tournament-winners.jpg", "tournament-winners.jpg"], // recompress in place
];

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

for (const [srcName, outName] of jobs) {
  const srcPath = path.join(DIR, srcName);
  const outPath = path.join(DIR, outName);
  const before = (await stat(srcPath)).size;

  // Read fully into a buffer so we can safely overwrite the same path (the
  // tournament job reads and writes the identical file).
  const input = await readFile(srcPath);
  const buf = await sharp(input)
    .rotate() // honor EXIF orientation before stripping metadata
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: Q, mozjpeg: true, progressive: true })
    .toBuffer();

  await writeFile(outPath, buf);
  if (srcName !== outName) await unlink(srcPath); // drop the PNG original

  const meta = await sharp(buf).metadata();
  console.log(`${srcName} → ${outName}  ${kb(before)} → ${kb(buf.length)}  (${meta.width}×${meta.height})`);
}
console.log("done");
