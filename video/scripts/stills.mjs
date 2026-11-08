// usage: node scripts/stills.mjs <comp> <outDir> <frames comma list> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [comp, outDir, list, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable });
for (const fr of list.split(",").map(Number)) {
  const output = path.join(outDir, `f${String(fr).padStart(4, "0")}.jpg`);
  await renderStill({ composition, serveUrl, frame: fr, output, imageFormat: "jpeg", jpegQuality: 85, scale: Number(scale), browserExecutable,
    chromiumOptions: { gl: "swangle" } });
  console.log("wrote", output);
}
