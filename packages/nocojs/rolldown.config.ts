import typescript from "@rollup/plugin-typescript";
import { defineConfig, type RolldownOptions } from "rolldown";
import pkg from "./package.json";

const createOptions = (
  format: "esm" | "cjs",
  entry: string,
  outDir: string,
): RolldownOptions => {
  return {
    input: entry,
    platform: "node",
    output: {
      dir: outDir,
      format: format,
      esModule: format === "esm",
    },
    external: [
      ...Object.keys(pkg.dependencies ?? {}),
      "@nocojs/core",
      "@parcel/plugin",
      "@parcel/sourcemap",
    ],
  };
};

export default defineConfig([
  createOptions("esm", "src/index.ts", "dist/esm"),
  createOptions("cjs", "src/index.ts", "dist/cjs"),

  createOptions("esm", "src/client.ts", "dist/esm/client"),
  createOptions("cjs", "src/client.ts", "dist/cjs/client"),
  {
    input: {
      index: "src/index.ts",
      client: "src/client.ts",
    },
    output: {
      dir: "dist/types",
    },
    plugins: [typescript({ tsconfig: "./tsconfig.json" })],
  },
]);
