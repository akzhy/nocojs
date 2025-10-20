# nocojs

Build-time image tooling for modern web apps. Generate lightweight placeholders, responsive image variants, and matching client helpers without shipping extra runtime code.

## Installation

```bash
npm install nocojs
```

For client side rendering, pair it with the bundler integration that matches your stack:

```bash
npm install --save-dev @nocojs/rollup-plugin      # Rollup / Vite
npm install --save-dev @nocojs/webpack-loader     # Webpack / Next.js
npm install --save-dev @nocojs/rspack-loader      # Rspack
npm install --save-dev @nocojs/parcel-transformer # Parcel
```

## Exports

```ts
import {
  placeholder,              // client helper replaced at build time
  getPlaceholder,           // server API for single placeholders
  getOptimizedImage,        // server API for responsive images
  type GetPlaceholderOptions,
  type GetOptimizedImageOptions,
  type GetOptimizedImageOutput,
  type GetPlaceholderImageResult,
  type PlaceholderOptions,
  type SrcsetImage,
  type ImageMeta,
} from "nocojs";
```

## Client Usage

```tsx
import { placeholder } from "nocojs";

export function HeroImage() {
  return <img src={placeholder("/images/hero.jpg")} alt="Hero" />;
}
```

With the appropriate bundler integration configured, the call above is replaced with a base64 data URI during the build.

## Server / Build Usage

```ts
import { getPlaceholder, getOptimizedImage } from "nocojs";

const placeholderResult = await getPlaceholder("./public/hero.jpg", {
  placeholderType: "blurred",
  width: 16,
});

const imageResult = await getOptimizedImage("./public/hero.jpg", {
  outputDir: "./public/generated",
  baseUrl: "/generated",
  widths: [640, 960, 1280],
  formats: ["webp", "jpg"],
});
```

### Placeholder Options

See [`GetPlaceholderOptions`](../core/README.md#getplaceholderoptions).

### Optimized Image Options

See [`GetOptimizedImageOptions`](../core/README.md#getoptimizedimageoptions).

## Notes

- The package is implemented in TypeScript and ships ESM and CJS builds.
- All heavy lifting (image processing, caching, AST transforms) lives in `@nocojs/core`; this wrapper keeps application imports stable.

## License

MIT
