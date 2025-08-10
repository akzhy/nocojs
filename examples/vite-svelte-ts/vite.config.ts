import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import nocojsPlugin from "@nocojs/rollup-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), nocojsPlugin()],
});
