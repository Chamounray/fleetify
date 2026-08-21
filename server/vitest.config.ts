import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 600000,
    include: ["src/tests/**/*.test.ts"],
  },
});
