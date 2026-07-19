/**
 * One-off brand PNG export — run: npx --yes -p sharp node shoprally-brand-kit/scripts/export-pngs.mjs
 */
import sharp from "sharp";
import { mkdir, copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const appIconSvg = path.join(root, "public/brand/app-icon.svg");
const lockupSvg = path.join(root, "public/brand/lockup-horizontal-color.svg");
const pngDir = path.join(root, "shoprally-brand-kit/png");
const publicBrandDir = path.join(root, "public/brand");

const exports_ = [
  { input: appIconSvg, output: path.join(pngDir, "app-icon-512.png"), width: 512, height: 512 },
  { input: appIconSvg, output: path.join(pngDir, "app-icon-180.png"), width: 180, height: 180 },
  { input: appIconSvg, output: path.join(pngDir, "app-icon-1024.png"), width: 1024, height: 1024 },
  {
    input: lockupSvg,
    output: path.join(pngDir, "lockup-horizontal-color-1200w.png"),
    width: 1200,
    height: null,
  },
];

const copies = [
  { from: path.join(pngDir, "app-icon-512.png"), to: path.join(publicBrandDir, "app-icon-512.png") },
  { from: path.join(pngDir, "app-icon-180.png"), to: path.join(publicBrandDir, "app-icon-180.png") },
];

async function renderSvg({ input, output, width, height }) {
  let pipeline = sharp(input, { density: 300 });
  if (height != null) {
    pipeline = pipeline.resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  } else {
    pipeline = pipeline.resize(width, null, { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  await pipeline.png().toFile(output);
  const info = await stat(output);
  if (info.size === 0) throw new Error(`Empty PNG: ${output}`);
  const meta = await sharp(output).metadata();
  if (meta.format !== "png") throw new Error(`Not PNG: ${output}`);
  return { output, size: info.size, width: meta.width, height: meta.height };
}

await mkdir(pngDir, { recursive: true });
await mkdir(publicBrandDir, { recursive: true });

const results = [];
for (const spec of exports_) {
  results.push(await renderSvg(spec));
}

for (const { from, to } of copies) {
  await copyFile(from, to);
  const info = await stat(to);
  results.push({ output: to, size: info.size, copied: true });
}

console.log("ShopRally brand PNG export complete:\n");
for (const r of results) {
  console.log(`  ${r.output}`);
  console.log(`    size: ${r.size} bytes${r.width ? `, ${r.width}x${r.height}` : ""}${r.copied ? " (copy)" : ""}`);
}
