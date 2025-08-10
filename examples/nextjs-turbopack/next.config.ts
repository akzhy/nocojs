import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.tsx": {
        loaders: ["@nocojs/webpack-loader"],
      },
    },
  },
};

export default nextConfig;
