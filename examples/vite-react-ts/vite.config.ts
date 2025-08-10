import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import rollupNocoPlugin from "@nocojs/rollup-plugin";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), rollupNocoPlugin()],
});
