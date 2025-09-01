# @nocojs/core

The Rust-powered core engine for nocojs, providing high-performance AST parsing and image processing capabilities via Node.js bindings.

## Overview

`@nocojs/core` is the heart of the nocojs ecosystem, built in Rust with Node.js bindings via NAPI-RS. It serves two main purposes:

### 1. Build Tool Integration
Powers bundler integrations like `@nocojs/webpack-loader`, `@nocojs/rollup-plugin`, and `@nocojs/parcel-transformer` for build-time image placeholder generation.

### 2. Direct Node.js Usage  
Provides the `getPlaceholder()` function for server-side frameworks and applications like:
- **Astro** - Generate placeholders during static site generation
- **Next.js** - Create placeholders in API routes or server components  
- **Custom Node.js apps** - Programmatic placeholder generation
- **Build scripts** - Custom image processing workflows

## Core Capabilities

- **AST Parsing & Transformation** - Uses OXC (Oxc Compiler) for blazing-fast JavaScript/TypeScript parsing
- **Image Processing** - Leverages Rust's `image`, `avif_decode` and `fast_image_resize` crates for efficient image manipulation
- **Caching** - SQLite-based caching system to avoid redundant processing

## API Reference

### `transform(code, filePath, options?)`

The main transformation function that processes source code and replaces `preview()` function calls with optimized placeholders.

```typescript
import { transform } from '@nocojs/core';

const result = await transform(
  'const img = preview("/image.jpg");',
  '/src/component.tsx',
  {
    publicDir: 'public',
    placeholderType: 'blurred',
    width: 12
  }
);

console.log(result.code); // Transformed code with inlined placeholder
```

#### Parameters

- **`code`** (`string`) - Source code to transform
- **`filePath`** (`string`) - Absolute path to the file being processed
- **`options`** (`TransformOptions`, optional) - Transformation configuration

#### Returns

```typescript
{
  code: string;        // Transformed source code
  map: string | null;  // Source map (if enabled)
  logs: Log[];        // Processing logs and warnings
}
```

### `getPlaceholder(url, options?)`

Direct function for generating image placeholders programmatically in Node.js environments, perfect for server-side frameworks and custom build scripts.

```typescript
import { getPlaceholder } from '@nocojs/core';

const result = await getPlaceholder(
  '/path/to/image.jpg',
  {
    width: 16,
    placeholderType: 'blurred',
    cache: true,
    wrapWithSvg: true
  }
);

console.log(result.placeholder); // Base64 data URL
console.log(result.logs);       // Processing logs
console.log(result.isError);    // Error status
```

#### Parameters

- **`url`** (`string`) - Path to local image file or HTTP/HTTPS URL
- **`options`** (`GetPlaceholderOptions`, optional) - Placeholder generation options

#### Returns

```typescript
{
  placeholder: string;  // Base64 data URL of the generated placeholder
  logs: Log[];         // Processing logs and warnings  
  isError: boolean;    // Whether an error occurred during processing
}
```

#### `GetPlaceholderOptions`

```typescript
interface GetPlaceholderOptions {
  width?: number;        // Placeholder width in pixels (default: 12)
  height?: number;       // Placeholder height in pixels (auto-calculated if not provided)
  placeholderType?: 'normal' | 'blurred' | 'grayscale' | 'dominant-color' | 'average-color' | 'transparent';
  cacheFileDir?: string; // Cache directory (default: '.nocojs')
  cache?: boolean;       // Enable caching (default: true)
  wrapWithSvg?: boolean; // Wrap in SVG for exact aspect ratio (default: true)
}
```

#### Usage Examples

**Static Site Generation (Astro)**
```typescript
// In an Astro component or build script
const heroPlaceholder = await getPlaceholder('/src/assets/hero.jpg', {
  placeholderType: 'blurred',
  width: 20
});
```

**Server-Side Rendering (Next.js)**
```typescript
// In API routes or server components
export async function getServerSideProps() {
  const placeholder = await getPlaceholder('https://cdn.example.com/image.jpg', {
    placeholderType: 'dominant-color'
  });
  
  return {
    props: { imagePlaceholder: placeholder.placeholder }
  };
}
```

**Custom Build Scripts**
```typescript
// Process multiple images programmatically
const images = ['hero.jpg', 'about.jpg', 'contact.jpg'];
const placeholders = await Promise.all(
  images.map(img => getPlaceholder(`/assets/${img}`, { 
    placeholderType: 'blurred',
    width: 16 
  }))
);
```

### Options

#### `TransformOptions`

```typescript
interface TransformOptions {
  // Preview generation options
  placeholderType?: 'normal' | 'blurred' | 'grayscale' | 'dominant-color' | 'average-color' | 'transparent';
  width?: number;              // Placeholder width in pixels (default: 12)
  height?: number;             // Placeholder height in pixels (auto-calculated if not provided)
  
  // Behavior options
  replaceFunctionCall?: boolean; // Replace function calls entirely (default: true)
  cache?: boolean;             // Enable caching (default: true)
  wrapWithSvg?: boolean;       // Wrap blurred placeholders in SVG (default: true)
  
  // Directory options
  publicDir?: string;          // Public directory path (default: 'public')
  cacheFileDir?: string;       // Cache directory (default: '.nocojs')
  
  // Development options
  logLevel?: 'none' | 'error' | 'info' | 'verbose'; // Logging verbosity
  sourcemapFilePath?: string;  // Source map output path
}
```

## Placeholder Types

### `normal`
Standard downscaled version preserving original colors and details.

### `blurred`
Heavily blurred version wrapped in SVG with blur filters for smooth loading transitions.

### `grayscale`
Black and white version of the image, useful for artistic effects.

### `dominant-color`
Single-color rectangle using the most prominent color from the original image.

### `average-color`
Single-color rectangle using the mathematical average of all pixel colors.

### `transparent`
Fully transparent placeholder maintaining aspect ratio, useful for skeleton loading states.

## Performance Characteristics

### Build Time Performance
- **Fast AST Parsing** - OXC provides near-native parsing speeds
- **Parallel Processing** - Multi-threaded image processing with Rayon
- **Smart Caching** - Avoids redundant downloads and processing
- **Memory Efficient** - Streaming image processing without loading full images into memory

### Runtime Performance
- **Zero Overhead** - All processing happens at build time
- **Tiny Payloads** - Generated placeholders are typically < 1KB each
- **Inlined Data URLs** - No additional network requests for placeholders

## Caching System

The core uses an SQLite database to cache:

## Platform Support

Pre-built binaries are available for:

- **Windows** - `x86_64-pc-windows-msvc`, `i686-pc-windows-msvc`, `aarch64-pc-windows-msvc`
- **macOS** - `x86_64-apple-darwin`, `aarch64-apple-darwin`
- **Linux** - `x86_64-unknown-linux-gnu`, `x86_64-unknown-linux-musl`, `aarch64-unknown-linux-gnu`, `aarch64-unknown-linux-musl`
- **ARM** - `armv7-unknown-linux-gnueabihf`
- **Android** - `aarch64-linux-android`, `armv7-linux-androideabi`

## Development

```bash
yarn
# During development
yarn build:debug 

# Run tests
yarn test
```

### Requirements

- **Rust** 1.70+ with `cargo`
- **Node.js** 16+ for bindings
- **NAPI-RS CLI** for cross-compilation

### Architecture Details

```
src/
├── lib.rs              # Main library entry point
├── transform.rs        # Code transformation logic
├── image_processor.rs  # Image processing utilities
├── cache.rs           # SQLite caching implementation
├── download.rs        # HTTP image downloading
└── placeholder.rs     # Placeholder generation algorithms
```

## Usage Patterns

### Build Tool Integration
This package powers build tool integrations for automatic placeholder generation during bundling:

- `@nocojs/rollup-plugin` - For Rollup and Vite projects  
- `@nocojs/webpack-loader` - For Webpack and Next.js projects
- `@nocojs/rspack-loader` - For Rspack projects  
- `@nocojs/parcel-transformer` - For Parcel projects

These integrations require `@nocojs/client` for the `preview()` function calls.

### Direct Node.js Usage
For server-side applications and custom build scripts, use the `getPlaceholder()` function directly:

```bash
npm install @nocojs/core
```

```typescript
import { getPlaceholder } from '@nocojs/core';
// Generate placeholders programmatically
```

Perfect for:
- **Astro** static site generation
- **Next.js** server components and API routes
- **Custom build scripts** and image processing workflows
- **Node.js applications** with dynamic image handling

## License

MIT - See the main repository LICENSE file for details.

## Contributing

This is part of the nocojs monorepo. See the [main repository](../../README.md) for contribution guidelines and development setup instructions.