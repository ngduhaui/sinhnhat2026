import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

/**
 * Builds ONE self-contained HTML file (`dist/phone/index.html`) with the CSS,
 * JS, fonts and photos all inlined, so the letter works offline on a phone:
 * Termux can serve it over localhost, or a browser can open it from /sdcard.
 *
 * Run with `npm run build:phone` (see scripts/build-phone.mjs).
 */
export default defineConfig({
  root: resolve(import.meta.dirname, "phone"),
  base: "./",
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  plugins: [viteReact(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: resolve(import.meta.dirname, "dist/phone"),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, "phone/index.html"),
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
