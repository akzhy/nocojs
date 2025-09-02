import typescript from "@rollup/plugin-typescript";
import { defineConfig, RolldownOptions } from "rolldown";
import pkg from "./package.json";

const createOptions = (format: "esm" | "cjs"): RolldownOptions => {
  return {
    input: "src/index.ts",
    platform: "node",
    output: {
      dir: `dist/${format}`,
      format: format,
      esModule: format === "esm",
    },
    external: [
      ...Object.keys(pkg.devDependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ],
  };
};

export default defineConfig([
  createOptions("esm"),
  createOptions("cjs"),
  {
    input: "src/index.ts",
    output: {
      dir: "dist/types",
    },
    plugins: [typescript({ tsconfig: "./tsconfig.json" })],
  },
]);
