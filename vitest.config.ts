import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // "server-only" throws unconditionally outside Next's RSC bundler; it's a no-op
      // marker package, so swap it for an empty module in the test runner.
      "server-only": path.resolve(__dirname, "tests/empty-module.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
  },
});
