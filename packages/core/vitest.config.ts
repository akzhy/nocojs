import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 20000,
    environment: "node",
    include: ["test/**/*.{test,spec}.{js,ts}"],
    globalSetup: "./test/vitest.global-setup.ts",
  },
});
