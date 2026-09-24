import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Rendering the date picker in jsdom takes 3-4 seconds on its own -- a
    // month grid is a lot of nodes -- and the 5s default tipped over under
    // load, failing one or two runs in three. Nothing was wrong with the
    // component; the limit was just too close to the real cost. A flaky suite
    // that blocks deploys at random is worse than a slow one.
    testTimeout: 20000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
