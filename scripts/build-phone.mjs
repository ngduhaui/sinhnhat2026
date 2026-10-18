#!/usr/bin/env node
/**
 * Builds the offline phone bundle: one self-contained `dist/phone/index.html`
 * with CSS, JS, fonts and photos inlined (no network needed).
 */
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist", "phone", "index.html");

execFileSync(
  process.execPath,
  [join(root, "node_modules", "vite", "bin", "vite.js"), "build", "--config", "vite.phone.config.ts"],
  { cwd: root, stdio: "inherit" },
);

if (!existsSync(out)) {
  console.error("phone build failed: dist/phone/index.html is missing");
  process.exit(1);
}
const kb = Math.round(statSync(out).size / 1024);
console.log(`\nphone bundle ready: dist/phone/index.html (${kb} KB, fully offline)`);
