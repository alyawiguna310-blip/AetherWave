import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
// @ts-expect-error type error without @types/node package
import path from "node:path";
// @ts-expect-error type error without @types/node package
import { fileURLToPath } from "node:url";

const host = process.env.TAURI_DEV_HOST;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  plugins: [react()],

  resolve: {
    alias: {
      // Always use the local stub. When running `pnpm tauri dev` / `pnpm tauri build`
      // the stub is still used — system audio capture is handled via Tauri's IPC
      // internally and the stub's no-op functions are never called in that path.
      "tauri-plugin-wasapi-api": path.resolve(__dirname, "src/wasapi-stub.ts"),
    },
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
}));
