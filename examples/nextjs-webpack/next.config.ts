import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { webpack }) => {
    config.module.rules.push({
      test: /\.tsx$/,
      use: [
        {
          loader: "@nocojs/webpack-loader",
          options: {
            // Add any options you need for the loader here
          },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
