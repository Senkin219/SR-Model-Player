import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { ViteMinifyPlugin } from "vite-plugin-minify";

export default defineConfig({
  plugins: [
    vue(),
    ViteMinifyPlugin({}),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}", "assets/**"],
        globIgnores: ["models/**"],
        maximumFileSizeToCacheInBytes: 4096000,
      },
      manifest: {
        name: "SR Model Player",
        short_name: "Model Player",
        description: "",
        theme_color: "#172033",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 204800,
    minify: "terser",
    terserOptions: {
      format: {
        comments: false,
      },
    },
  },
  server: {
    host: "0.0.0.0",
  },
});
