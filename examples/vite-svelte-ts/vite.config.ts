import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { rollupNocoPlugin } from "@nocojs/rollup-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      ...rollupNocoPlugin(),
      enforce: "post",
    },
    svelte(),
  ],
});
