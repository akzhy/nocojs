# nocojs

Build-time image tooling for modern web apps. Generate lightweight placeholders, responsive image variants, and matching client helpers without shipping extra runtime code.

## Overview

nocojs can work both on the client side during bundling and on the server side in build scripts or SSR frameworks.

For client side, with appropriate bundler integration, nocojs scans your source during bundling, finds calls to `placeholder()`, and replaces them with inline data URLs.
On the server (Astro, NextJS, Tanstack Start) you can call `getPlaceholder()` or `getOptimizedImage()` to create the same assets programmatically.


**Note:** nocojs focuses on build-time generation, you will have to handle lazy-loading yourself. Pair it with your preferred lazy-loading or progressive enhancement strategy, such as:
- [react-lazy-load-image-component](https://www.npmjs.com/package/react-lazy-load-image-component)
- [lozad.js](https://github.com/ApoorvSaxena/lozad.js)
- [lazysizes](https://github.com/aFarkas/lazysizes)
- [vanilla-lazyload](https://github.com/verlok/vanilla-lazyload)

## Features

- **Zero runtime overhead** – placeholders are inlined during the build.
- **Multiple placeholder types** – blurred, grayscale, dominant-color, average-color, transparent, or the default miniaturized version.
- **Responsive outputs** – `getOptimizedImage()` creates multi-format, multi-width srcsets and optional placeholders in one call.
- **Bundler integrations** – works with Webpack, Rspack, Rollup/Vite, and Parcel.


## Quick Start

### Installation

Install the main package along with the bundler integration (if you require client-side support) that matches your stack:

```bash
# Pick the integration that matches your bundler
npm install nocojs @nocojs/rollup-plugin      # Rollup / Vite
npm install nocojs @nocojs/webpack-loader     # Webpack / Next.js
npm install nocojs @nocojs/rspack-loader      # Rspack
npm install nocojs @nocojs/parcel-transformer # Parcel
```

### Client usage

```tsx
import { placeholder } from "nocojs";

export function HeroImage() {
  return <img src={placeholder("/images/hero.jpg")} alt="Hero" />;
}
```

With an integration configured, the bundler replaces the call above with a base64 data URI during the build.

### Server or build scripts

```ts
import { getPlaceholder, getOptimizedImage } from "nocojs";

const heroPlaceholder = await getPlaceholder("./public/hero.jpg", {
  placeholderType: "blurred",
  width: 16,
});

const responsive = await getOptimizedImage("./public/hero.jpg", {
  outputDir: "./public/generated",
  baseUrl: "/generated",
  widths: [640, 960, 1280],
  formats: ["webp", "jpg"],
});

console.log(heroPlaceholder.placeholder);
console.log(responsive.srcset);
```


## Configuration

### Vite / Rollup

```js
import { defineConfig } from "vite";
import { rollupNocoPlugin } from "@nocojs/rollup-plugin";

export default defineConfig({
  plugins: [
    rollupNocoPlugin({
      publicDir: "public",
      cacheFileDir: ".nocojs",
      placeholderType: "blurred",
      width: 12,
    }),
  ],
});
```

### Webpack / Next.js

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|ts|jsx|tsx)$/,
        use: [
          {
            loader: "@nocojs/webpack-loader",
            options: {
              publicDir: "public",
              cacheFileDir: ".nocojs",
              placeholderType: "blurred",
              width: 12,
            },
          },
        ],
      },
    ],
  },
};
```

### Transform options

Bundler integrations forward these options to the core transformer:

```ts
interface TransformOptions {
  placeholderType?: "normal" | "blurred" | "grayscale" | "dominant-color" | "average-color" | "transparent";
  width?: number;
  height?: number;
  wrapWithSvg?: boolean;
  cache?: boolean;
  replaceFunctionCall?: boolean;
  publicDir?: string;
  cacheFileDir?: string;
  logLevel?: "none" | "error" | "info" | "verbose";
}
```

### Placeholder options (server APIs)

```ts
interface GetPlaceholderOptions {
  placeholderType?: "normal" | "blurred" | "grayscale" | "dominant-color" | "average-color" | "transparent";
  width?: number;
  height?: number;
  wrapWithSvg?: boolean;
  cache?: boolean;
  cacheFileDir?: string;
  _enableLogging?: boolean;
}
```

### Optimized image options

```ts
interface GetOptimizedImageOptions {
  outputDir: string;
  widths?: number[];
  baseUrl?: string;
  formats?: string[];
  quality?: number;
  namingPattern?: string;
  placeholderOptions?: GetPlaceholderOptions | null;
  cache?: boolean;
}
```

## Best Practices for client side usage

- Use static string literals for `placeholder()` so the transformer can resolve paths.
- Point relative paths to your `publicDir` (for example `placeholder("/images/photo.jpg")`).
- Combine the generated placeholders with a lazy-loading strategy to avoid layout shifts.
- Keep the cache directory (default `.nocojs`) between builds for faster CI/CD pipelines.

## Caching

nocojs stores metadata and generated placeholders in `.nocojs/cache.db` (configurable). Restoring this directory between builds allows the transformer and server APIs to reuse prior results.

### CI examples

**Netlify**

```js
export const onPreBuild = async ({ utils }) => {
  await utils.cache.restore(".nocojs");
};

export const onPostBuild = async ({ utils }) => {
  await utils.cache.save(".nocojs");
};
```


## Packages

This monorepo contains the following packages:

- **`nocojs`** – top-level package that re-exports the client `placeholder()` helper and the server utilities `getPlaceholder()` and `getOptimizedImage()`.
- **`@nocojs/core`** – TypeScript engine that implements the transformer, placeholder generation, optimized image pipeline, and cache management.
- **`@nocojs/rollup-plugin`** – Rollup/Vite integration.
- **`@nocojs/webpack-loader`** – Webpack (and Next.js) loader.
- **`@nocojs/rspack-loader`** – Rspack loader.
- **`@nocojs/parcel-transformer`** – Parcel integration.

## Development

This is a Lerna workspace with packages written in TypeScript.

```
packages/
├── core/               # TypeScript engine shared by all integrations
├── nocojs/             # Aggregated public API (client + server)
├── rollup-plugin/      # Rollup / Vite integration + example
├── webpack-loader/     # Webpack integration + example
├── rspack-loader/      # Rspack integration
└── parcel-transformer/ # Parcel integration + example
```

```bash
# Enable pnpm via Corepack (once per environment)
corepack enable

# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Run tests
pnpm test
```

## Performance

- **Fast builds** – `oxc-parser` provides speedy AST traversal and transformation.
- **Efficient processing** – `sharp` powers resizing and color extraction.
- **Tiny payloads** – placeholders are typically under 1 KB and served inline.

## License

MIT

## Contributing

Contributions are welcome! To get started:

1. Fork and clone the repo.
2. Run `pnpm install` to bootstrap dependencies.
3. Use `pnpm build:packages` and `pnpm test` to validate changes.
4. Add or update documentation when introducing new features.
5. Create a changeset with `pnpm changeset` before opening a pull request.

Create issues for bugs or ideas, or start a discussion if you’re planning a larger feature.