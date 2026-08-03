import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * Chrome extension pages reject Vite's modulepreload of shared chunks
 * ("cross-world extension resource mismatch"). Strip those tags and
 * remove unnecessary crossorigin attrs on extension scripts.
 */
function chromeExtensionHtml(): Plugin {
  return {
    name: "chrome-extension-html",
    enforce: "post",
    transformIndexHtml(html) {
      return html
        .replace(/<link[^>]*rel=["']modulepreload["'][^>]*>\s*/gi, "")
        .replace(
          /(<script[^>]*type=["']module["'][^>]*)\s+crossorigin(?:=["'][^"']*["'])?/gi,
          "$1"
        )
        .replace(
          /(<link[^>]*rel=["']stylesheet["'][^>]*)\s+crossorigin(?:=["'][^"']*["'])?/gi,
          "$1"
        );
    },
  };
}

export default defineConfig({
  plugins: [react(), chromeExtensionHtml()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Critical: do not inject <link rel="modulepreload"> for shared chunks.
    // Chrome extension worlds cannot use those preloads.
    modulePreload: false,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
        sessionHost: resolve(__dirname, "session-host.html"),
        settings: resolve(__dirname, "settings.html"),
        background: resolve(__dirname, "src/background.ts"),
        contentLoginBridge: resolve(
          __dirname,
          "src/content-login-bridge.ts"
        ),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          if (chunk.name === "contentLoginBridge") {
            return "content-login-bridge.js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
