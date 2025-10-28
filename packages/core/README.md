# @nocojs/core

Core logic that drives image placeholder and optimization workflows across the nocojs ecosystem. It provides the AST transformer, placeholder generator, responsive image builder, and a lightweight SQLite cache used by every bundler integration.

## Overview

- **TypeScript implementation** – built with `sharp`, `oxc-parser`, and Node.js primitives
- **Server utilities** – programmatic helpers for generating placeholders or full responsive image sets.
- **Bundler transforms** – AST walker that replaces `placeholder()` calls at build time when used with an integration like `@nocojs/rollup-plugin` or `@nocojs/webpack-loader`.
- **SQLite caching** – deduplicates work across builds while keeping placeholder metadata available to transformers.


The `nocojs` package re-exports everything you need:

- **Client**: `placeholder()` – converted to inline data URIs by the bundler.
- **Server / build scripts**: `getPlaceholder()` and the new `getOptimizedImage()` helper.

You should not need to import anything directly from `@nocojs/core` in application code.

## Quick Start

### Client-side components

```tsx
import { placeholder } from "nocojs";

export function HeroImage() {
	return <img src={placeholder("/images/hero.jpg")} alt="Hero" />;
}
```

With a supported bundler plugin/loader the call above is replaced with the generated placeholder string during the build.

### Server-side rendering or build scripts

```ts
import { getPlaceholder, getOptimizedImage } from "nocojs";

const thumbnail = await getPlaceholder("./public/blog/cover.jpg", {
	placeholderType: "blurred",
	width: 16,
});

const responsive = await getOptimizedImage("./public/blog/cover.jpg", {
	outputDir: "./public/generated",
	widths: [640, 960, 1280],
	formats: ["webp", "jpg"],
	baseUrl: "/generated",
});

console.log(thumbnail.placeholder); // data:image/svg+xml;base64,...
console.log(responsive.srcset);     // ["/generated/cover-640w.webp 640w", ...]
```

## API Reference

### `getPlaceholder(url, options?)`

Generates a lightweight placeholder for a local file path or remote URL. Results include the base64 data URI and the original dimensions so you can preserve aspect ratio.

```ts
import { getPlaceholder } from "nocojs";

const result = await getPlaceholder("/images/team.jpg", {
	placeholderType: "dominant-color",
	cacheFileDir: ".nocojs",
	wrapWithSvg: true,
});

// result: GetPlaceholderImageResult
// {
//   placeholder: string;
//   originalWidth: number;
//   originalHeight: number;
//   placeholderPng?: string;
// }
```

#### `GetPlaceholderOptions`

```ts
interface GetPlaceholderOptions {
	placeholderType?: "normal" | "blurred" | "grayscale" | "dominant-color" | "average-color" | "transparent";
	width?: number;
	height?: number;
	wrapWithSvg?: boolean;
	cache?: boolean;
	cacheFileDir?: string;
	_enableLogging?: boolean; // diagnostic logging for cache hits
}
```

### `getOptimizedImage(url, options)`

Creates responsive image variants, optional format conversions, and an accompanying placeholder in a single call.

```ts
import { getOptimizedImage } from "nocojs";

const result = await getOptimizedImage("./public/gallery/photo.jpg", {
	outputDir: "./public/generated/gallery",
	widths: [480, 768, 1024],
	formats: ["webp", "avif"],
	quality: 75,
	baseUrl: "/generated/gallery",
	namingPattern: "{name}-{width}w.{format}",
	placeholderOptions: {
		placeholderType: "blurred",
	},
});

// result: GetOptimizedImageOutput
// {
//   srcset: string[];        // one entry per format
//   images: SrcsetImage[];   // [{ width, height, src, filePath, format }, ...]
//   placeholder: string | null;
//   isError: boolean;
//   meta: { width: number; height: number; format: string };
// }
```

#### `GetOptimizedImageOptions`

```ts
interface GetOptimizedImageOptions {
	outputDir: string;               // required destination for generated files
	widths?: number[];               // defaults to [320, 640, 960, 1280, 1920]
	baseUrl?: string;                // appended to generated filenames in srcset entries
	formats?: string[];              // defaults to the source format when omitted
	quality?: number;                // passed to sharp encoders (default 80)
	namingPattern?: string;          // defaults to "{name}-{width}w.{format}"
	placeholderOptions?: GetPlaceholderOptions | null; // set to null to skip placeholder generation
	cache?: boolean;                 // skip rewriting existing files when true (default)
}
```

## Bundler Transformation Flow

- Import `placeholder` from `nocojs` inside your UI code.
- The bundler integration (`@nocojs/rollup-plugin`, `@nocojs/webpack-loader`, `@nocojs/rspack-loader`, `@nocojs/parcel-transformer`) invokes the transformer from `@nocojs/core`.
- The transformer finds `placeholder("/path")` calls, generates placeholders with the configured options, and replaces the call with the inlined data URI.


## Caching & Performance

- Placeholder metadata is cached in a SQLite database under `.nocojs/cache.db` by default.
- `Store` handles in-memory caching during a single transform run while the database enables cross-build reuse.
- Image processing pipelines are powered by `sharp`, and AST traversal uses `oxc-parser` for fast JavaScript/TypeScript parsing.

## Development

```bash
npm install
npm run build --workspace @nocojs/core
npm run test --workspace @nocojs/core
```

You can also run `rolldown -w -c` inside `packages/core` for watch mode and `vitest` for the test suite. The project targets modern Node.js environments (18+) and relies purely on the TypeScript toolchain.

## License

MIT – see the repository root for details.

## Contributing

This package lives inside the nocojs monorepo. Refer to the [top-level README](../../README.md) for contribution guidelines and workspace development notes.
