// usage: node scripts/png.mjs <outDir> <compId> [compId...]  — renders frame 0 of each composition to <outDir>/<compId>.png
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
const [outDir, ...ids] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  const output = path.join(outDir, `${id}.png`);
  await renderStill({ composition, serveUrl, frame: 0, output, imageFormat: "png", browserExecutable, chromiumOptions: { gl: "swangle" } });
  console.log("wrote", output);
}
