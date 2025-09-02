# nocojs

A build-time library to create image previews.

## Overview

nocojs scans your code during build time to find `preview()` function calls imported from `@nocojs/client`, then replaces these calls with optimized, tiny placeholder images (12px width by default). These placeholders are designed to work seamlessly with popular lazy loading libraries, preventing layout shifts and improving your web application's Core Web Vitals.

**Note**: nocojs generates placeholder images but does not handle lazy loading itself. You'll need to integrate it with a lazy loading library such as:
- [react-lazy-load-image-component](https://www.npmjs.com/package/react-lazy-load-image-component)
- [lozad.js](https://github.com/ApoorvSaxena/lozad.js)
- [lazysizes](https://github.com/aFarkas/lazysizes)
- [vanilla-lazyload](https://github.com/verlok/vanilla-lazyload)
- Or any other library that supports placeholder images

## Features

- **Zero runtime overhead** - Everything happens at build time
- **Multiple placeholder types** - Normal, blurred, grayscale, dominant color, average color, or transparent
- **Automatic aspect ratio preservation** - Maintains original image proportions
- **Intelligent caching** - Avoids redundant processing with SQLite-based caching
- **Universal build tool support** - Works with Webpack, Rollup/Vite, Parcel, and Next.js
- **Direct Node.js API** - Use `getPlaceholder()` function in server-side frameworks (Astro, Next.js, etc.)
- **TypeScript support** - Full type safety out of the box

## How It Works

**Build tool integrations**
   - Analyze your code for `preview()` function calls using OXC AST parser
   - Download or access images from specified paths
   - Generate small, optimized placeholder images using Rust-based image processing
   - Replace function calls with base64-encoded data URLs

**Server-side**

Use `getPlaceholder()` directly in Node.js for server-side rendering, static generation, or custom workflows

## Packages

This monorepo contains the following packages:

### Core Package
- **[@nocojs/core](./packages/core)** - Rust-based core engine with Node.js bindings via NAPI-RS
  - Uses OXC for fast AST parsing and manipulation
  - `image` and `fast_image_resize` crates for high-performance image processing  
  - `reqwest` for HTTP image downloading
  - `rusqlite` for intelligent caching
  - Exports `getPlaceholder()` function for direct Node.js usage (Astro, Next.js, etc.)

### Client Package
- **[@nocojs/client](./packages/client)** - TypeScript client library that exports the `preview()` function

### Build Tool Integrations
- **[@nocojs/rollup-plugin](./packages/plugin-rollup)** - Rollup plugin (works with Vite)
- **[@nocojs/webpack-loader](./packages/webpack-loader)** - Webpack loader for seamless integration
- **[@nocojs/rspack-loader](./packages/webpack-loader)** - Webpack loader for seamless integration
- **[@nocojs/parcel-transformer](./packages/parcel-transformer)** - Parcel transformer plugin

## Quick Start

### Installation

```bash
# Install the client library
npm install @nocojs/client

# Install the appropriate build tool integration
npm install --save-dev @nocojs/rollup-plugin @nocojs/core     # For Rollup/Vite  
npm install --save-dev @nocojs/webpack-loader @nocojs/core    # For Webpack/Next.js
npm install --save-dev @nocojs/rspack-loader @nocojs/core    # For Rspack
npm install --save-dev @nocojs/parcel-transformer @nocojs/core # For Parcel

# Or install core package alone for direct Node.js usage
npm install @nocojs/core                          # For server-side frameworks (Astro, Next.js, etc.)
```

### Usage

```typescript
import { preview } from '@nocojs/client';

// Basic usage
const imagePreview = preview('https://example.com/image.jpg');

// With options
const customPreview = preview('/local-image.png', {
  width: 16,
  placeholderType: 'blurred',
  cache: true
});

// Use in React components with lazy loading
function ImageComponent() {

  return (
    <LazyImage
      placeholder={preview('/full-image.jpg')}
      src={'/full-image.jpg'}
      alt="Example"
    />
  );
}
```

## Configuration

### Build Tool Setup

#### Webpack

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|ts|jsx|tsx)$/,
        use: [
          {
            loader: '@nocojs/webpack-loader',
            options: {
              publicDir: 'public',
              cacheFileDir: '.nocojs',
              placeholderType: 'blurred',
              width: 12
            }
          }
        ]
      }
    ]
  }
};
```

#### Vite (Rollup)
```javascript
import { defineConfig } from 'vite';
import { rollupNocoPlugin } from '@nocojs/rollup-plugin';

export default defineConfig({
  plugins: [rollupNocoPlugin ({
    placeholderType: 'blurred',
    width: 12
  })]
});
```

#### Next.js
```javascript
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(js|ts|jsx|tsx)$/,
      use: [{
        loader: '@nocojs/webpack-loader',
        options: {
          // configuration options
        }
      }]
    });
    return config;
  }
};
```

## Direct Node.js Usage

For server-side frameworks like Astro, Next.js, or custom Node.js applications, you can use the `getPlaceholder` function directly from `@nocojs/core` to generate placeholders programmatically:

```typescript
import { getPlaceholder } from '@nocojs/core';

// Generate placeholder for a local image
const placeholder = await getPlaceholder('/path/to/image.jpg', {
  width: 16,
  placeholderType: 'blurred', // 'normal', 'blurred', 'grayscale', 'dominant-color', 'average-color', 'transparent'
  cache: true,
  wrapWithSvg: true
});

console.log(placeholder.placeholder); // Base64 data URL

// Use in Astro components
const heroPlaceholder = await getPlaceholder('/public/hero.jpg', {
  width: 12,
  placeholderType: 'blurred'
});

// Use in Next.js API routes or server components
export async function generateStaticProps() {
  const imagePlaceholder = await getPlaceholder('https://example.com/image.jpg', {
    placeholderType: 'dominant-color',
    width: 20
  });
  
  return {
    props: {
      placeholder: imagePlaceholder.placeholder
    }
  };
}
```


## Preview Options

```typescript
interface PreviewOptions {
  placeholderType?: 'normal' | 'blurred' | 'grayscale' | 'dominant-color' | 'average-color' | 'transparent';
  width?: number;           // Width in pixels (default: 12)
  height?: number;          // Height in pixels (calculated from aspect ratio if not provided)
  cache?: boolean;          // Enable caching (default: true)
  replaceFunctionCall?: boolean; // Replace function calls entirely (default: true)
  wrapWithSvg?: boolean;   // Whether to wrap the image in an SVG. Helps keep exact aspect ratio (default: true)
}
```

### Placeholder Types

- **`normal`** - Standard downscaled version of the image
- **`blurred`** - Blurred version using SVG filters for artistic effect
- **`grayscale`** - Black and white version of the image
- **`dominant-color`** - Single color rectangle based on the dominant color
- **`average-color`** - Single color rectangle based on the average color
- **`transparent`** - Fully transparent placeholder

## Important Guidelines (for bundler integration)

### DOs ✅

- **Use static, analyzable paths**: Always provide fixed string literals or easily resolvable paths
  ```typescript
  preview('/images/hero.jpg')           // ✅ Good
  preview('https://cdn.example.com/image.jpg') // ✅ Good
  ```

- **Use with lazy loading libraries**: Combine with libraries like `react-intersection-observer`, `lozad.js`, or `lazysizes`
- **Keep placeholders small**: Default 12px width is optimized for performance
- **Use consistent placeholder types**: Stick to one type across your application for visual consistency

### DON'Ts ❌

- **Avoid dynamic arguments**: The build-time parser cannot resolve dynamic values
  ```typescript
  const imagePath = '/images/photo.jpg';
  preview(imagePath)                    // ❌ Bad - dynamic variable
  preview(`/images/${filename}`)        // ❌ Bad - template literal with variables
  preview(getImagePath())               // ❌ Bad - function call result
  ```

- **Don't use with conditionals**: Build-time analysis requires static calls
  ```typescript
  preview(condition ? 'img1.jpg' : 'img2.jpg') // ❌ Bad - conditional expression
  ```

- **Avoid runtime modifications**: The `preview()` function is replaced at build time
  ```typescript
  const result = preview('/image.jpg');
  const modified = result + '?v=1';     // ❌ Bad - modifying the result
  ```

**Important**: All `preview()` function calls must be statically analyzable at build time. The arguments must be string literals or easily resolvable static expressions that the build tool can evaluate without executing your code.

## Transform Options

Build tool integrations support additional options:

```typescript
interface TransformOptions extends PreviewOptions {
  publicDir?: string;     // Public directory path (default: 'public')
  cacheFileDir?: string;  // Cache directory (default: '.nocojs')
  logLevel?: 'none' | 'error' | 'info' | 'verbose'; // Logging level
}
```

## Caching

nocojs uses SQLite-based caching to avoid redundant image processing. The cache stores:
- Downloaded image metadata and processed placeholder data
- Generated placeholder images and their configurations

### Cache Location

By default, the cache is stored in the `.nocojs` directory (configurable via `cacheFileDir` option). The cache directory contains:
- `cache.db` - SQLite database with image metadata

### Production Build Optimization

For production builds, preserving the cache between deployments can significantly speed up build times by avoiding re-downloading and re-processing images that haven't changed. The approach varies by deployment provider:

#### Netlify

Use `@netlify/cache-utils` to preserve the cache:

```javascript
export const onPreBuild = async function ({ utils }) {
  await utils.cache.restore('./nocojs')
}

export const onPostBuild = async function ({ utils }) {
  await utils.cache.save('./nocojs')
}
```

Or configure in `netlify.toml`:

```toml
[build]
  command = "npm run build"
  
[[plugins]]
  package = "@netlify/plugin-cache"
  
  [plugins.inputs]
    paths = [ ".nocojs" ]
```

#### GitHub Actions

Cache the directory using `actions/cache`:

```yaml
# .github/workflows/build.yml
name: Build
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Cache nocojs
        uses: actions/cache@v3
        with:
          path: .nocojs
          key: nocojs-cache
          restore-keys: |
            nocojs-cache
            
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
```

#### Custom CI/CD

For custom setups, ensure the `.nocojs` directory is:
1. **Restored** before the build starts
2. **Saved** after the build completes

```bash
#!/bin/bash
# Example build script

# Restore cache if available
if [ -d "$CACHE_DIR/.nocojs" ]; then
  cp -r "$CACHE_DIR/.nocojs" .
fi

# Run build
npm run build

# Save cache
mkdir -p "$CACHE_DIR"
cp -r .nocojs "$CACHE_DIR/"
```

### Cache Management

#### Cache Invalidation
The cache automatically updates when:
- Image URLs change
- Configuration options change

#### Manual Cache Control
```bash
# Clear the cache manually
rm -rf .nocojs

# Or programmatically in your build script
const fs = require('fs');
if (process.env.CLEAR_CACHE) {
  fs.rmSync('.nocojs', { recursive: true, force: true });
}
```

## Examples

The repository includes comprehensive examples for different frameworks:

- **Next.js** - [Webpack](./examples/nextjs-webpack) and [Turbopack](./examples/nextjs-turbopack) configurations
- **Vite + React** - [TypeScript setup](./examples/vite-react-ts)
- **Vite + Svelte** - [TypeScript setup](./examples/vite-svelte-ts)
- **Webpack + React** - [Complete configuration](./examples/webpack-react)
- **Parcel** - [React](./examples/parcel-react) and [Vanilla JS](./examples/parcel-vanilla) setups
- **Basic Webpack** - [Minimal setup](./examples/webpack-basic)

## Development

This project is a Lerna monorepo with the following structure:

```
packages/
├── core/                 # Rust core with Node.js bindings
├── client/              # TypeScript client library  
├── webpack-loader/      # Webpack integration
├── rspac-loader/        # Rspack integration
├── plugin-rollup/       # Rollup/Vite integration
└── parcel-transformer/  # Parcel integration

examples/                # Example projects for each build tool
```

### Building from Source

```bash
# Install dependencies
yarn install

# Build all packages
lerna run build

# Run tests
lerna run test
```

## Performance

- **Build time**: Fast AST parsing with OXC and efficient image processing with Rust
- **Runtime**: Zero overhead - placeholders are inlined as base64 data URLs
- **Cache**: SQLite-based caching prevents redundant processing
- **Size**: Tiny placeholder images (typically < 1KB each)

## License

MIT

## Contributing

We welcome contributions to nocojs! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Getting Started

1. **Fork the repository** and clone it locally
2. **Install dependencies**: `yarn install`
3. **Build all packages**: `lerna run build`
4. **Run tests**: `lerna run test`

### Development Setup

This is a Lerna monorepo with packages written in both Rust and TypeScript:

#### Prerequisites
- **Node.js** 16+ and **Yarn** 1.x
- **Rust** (latest stable version)
- **NAPI-RS CLI**: `npm install -g @napi-rs/cli`

#### Building the Core Package
The core package requires Rust compilation:

```bash
cd packages/core
yarn build:all        # Builds both Rust and TypeScript
yarn build:debug  # Debug build for development
```

### Making Changes

#### Code Style
- **TypeScript**: Use Prettier and ESLint
- **Rust**: Use `cargo fmt` and follow Rust conventions
- **Commits**: Use conventional commit messages

#### Testing
- Run tests before submitting: `lerna run test`
- Add tests for new features
- Ensure examples still work after changes

#### Pull Request Process
1. **Create a feature branch** from `master`
2. **Make your changes** with appropriate tests
3. **Update documentation** if needed
4. **Run the full test suite**
5. **Submit a pull request** with a clear description



### Getting Help

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas

Thank you for contributing to nocojs! 🚀