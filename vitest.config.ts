import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing";

export default defineConfig({
  plugins: WxtVitest() as any,
  test: {
    environment: "jsdom",
    testTimeout: 60000,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    exclude: ["playwright/**"],
  },
});
