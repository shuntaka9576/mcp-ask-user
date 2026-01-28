import path from "node:path";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const INPUT = process.env.INPUT;
if (!INPUT) {
  throw new Error("INPUT environment variable is not set");
}

export default defineConfig({
  root: "src",
  plugins: [viteSingleFile()],
  build: {
    rollupOptions: {
      input: path.resolve(import.meta.dirname, "src", INPUT),
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
    outDir: "../dist",
    emptyOutDir: false,
  },
});
