import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { webdriverio } from "@vitest/browser-webdriverio";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    include: ["e2e/**/*.test.ts"],
    deps: {
      optimizer: {
        web: {
          include: ["vue-router"],
        },
      },
    },
    browser: {
      enabled: true,
      headless: true,
      provider: webdriverio({
        capabilities: {
          "wdio:enforceWebDriverClassic": true,
        },
      }),
      instances: [{ browser: "chrome" }],
    },
  },
});
