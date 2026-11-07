// Copies the MediaPipe vision WASM runtime into public/ so the entrance camera works fully offline.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const target = join(root, "public", "mediapipe", "wasm");
if (!existsSync(source)) {
  console.warn("[copy-mediapipe-wasm] @mediapipe/tasks-vision is not installed; run npm install first.");
  process.exit(0);
}
mkdirSync(target, { recursive: true });
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  cpSync(join(source, file), join(target, file));
}
console.log("[copy-mediapipe-wasm] copied to public/mediapipe/wasm");
