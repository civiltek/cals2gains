/**
 * Cals2Gains Remotion Render Script
 * ===================================
 * Headless render: reads a JSON scene file, bundles the project,
 * selects the composition, and renders to MP4.
 *
 * Usage:
 *   ts-node render.ts --props path/to/reel_props.json --output output/reel.mp4
 *   ts-node render.ts --props path/to/reel_props.json  (output auto-named)
 */

import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ReelProps } from "./src/types";

// ---- CLI args ----
const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const propsFile = getArg("--props");
const outputArg = getArg("--output");
const compositionId = getArg("--id") ?? "ReelComposition";

if (!propsFile) {
  console.error("Usage: ts-node render.ts --props reel_props.json [--output out.mp4]");
  process.exit(1);
}

// ---- Load input props ----
const propsPath = path.resolve(propsFile);
if (!fs.existsSync(propsPath)) {
  console.error(`Props file not found: ${propsPath}`);
  process.exit(1);
}

const inputProps: ReelProps = JSON.parse(fs.readFileSync(propsPath, "utf-8"));

// Auto-generate output filename from first scene title if not provided
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const slug = inputProps.scenes[0]?.title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .slice(0, 30) ?? "reel";
const defaultOutput = path.resolve(__dirname, "output", `${timestamp}_${slug}.mp4`);
const outputLocation = outputArg ? path.resolve(outputArg) : defaultOutput;

// Ensure output dir exists
fs.mkdirSync(path.dirname(outputLocation), { recursive: true });

async function main() {
  console.log(`[Remotion] Bundling project...`);

  const entryPoint = path.resolve(__dirname, "src", "index.tsx");

  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
    publicDir: path.resolve(__dirname, "public"),
  });

  console.log(`[Remotion] Bundle complete: ${bundleLocation}`);
  console.log(`[Remotion] Selecting composition: ${compositionId}`);

  // Remotion requires Record<string, unknown> for inputProps
  const props = inputProps as unknown as Record<string, unknown>;

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: props,
  });

  console.log(
    `[Remotion] Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...`
  );
  console.log(`[Remotion] Output: ${outputLocation}`);

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps: props,
    imageFormat: "jpeg",
    jpegQuality: 90,
    // Increase timeout: Sora video files can take longer to preload in Chrome
    timeoutInMilliseconds: 60000,
    // Serialize rendering to avoid parallel Chrome workers fighting over video files
    concurrency: 1,
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const pct = Math.round(progress * 100);
      process.stdout.write(`\r[Remotion] ${pct}% (rendered=${renderedFrames} encoded=${encodedFrames})`);
    },
  });

  console.log(`\n[Remotion] Done! Video saved to: ${outputLocation}`);
}

main().catch((err) => {
  console.error("[Remotion] Render failed:", err);
  process.exit(1);
});
