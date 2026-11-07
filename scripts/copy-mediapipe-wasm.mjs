// Copies the MediaPipe vision WASM runtime into public/ so the entrance camera works fully offline.
// Files that are already there with the same size are skipped, so this is instant after the first run.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const target = join(root, "public", "mediapipe", "wasm");
const files = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];

if (!existsSync(source)) {
  console.warn("[copy-mediapipe-wasm] @mediapipe/tasks-vision is not installed; run npm install first.");
  process.exit(0);
}
mkdirSync(target, { recursive: true });
let copied = 0;
for (const file of files) {
  const from = join(source, file);
  const to = join(target, file);
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  try {
    copyFileSync(from, to);
    copied += 1;
  } catch (error) {
    console.warn(`[copy-mediapipe-wasm] could not copy ${file}: ${error.message}`);
  }
}
console.log(copied ? `[copy-mediapipe-wasm] copied ${copied} file(s) to public/mediapipe/wasm` : "[copy-mediapipe-wasm] already in place");
