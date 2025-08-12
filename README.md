# nocojs

A build-time library to create image previews effortlessly.

## Overview

nocojs scans your code during build time to find `preview()` function calls imported from `@nocojs/client`, then replaces these calls with optimized, tiny placeholder images (12px width by default). These placeholders are designed to work seamlessly with popular lazy loading libraries, providing instant visual feedback while preventing layout shifts and improving your web application's Core Web Vitals.

**Note**: nocojs generates placeholder images but does not handle lazy loading itself. You'll need to integrate it with a lazy loading library such as:
- [react-intersection-observer](https://github.com/thebuilder/react-intersection-observer)
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
- **TypeScript support** - Full type safety out of the box

## How It Works

1. **Development**: The `preview()` function simply returns the original URL
2. **Build time**: Build tool integrations:
   - Analyze your code for `preview()` function calls using OXC AST parser
   - Download or access images from specified paths
   - Generate small, optimized placeholder images using Rust-based image processing
   - Replace function calls with base64-encoded data URLs
3. **Runtime**: Your `preview()` calls become tiny optimized images in the final bundle

## Packages

This monorepo contains the following packages:

### Core Package
- **[@nocojs/core](./packages/core)** - Rust-based core engine with Node.js bindings via NAPI-RS
  - Uses OXC for fast AST parsing and manipulation
  - `image` and `fast_image_resize` crates for high-performance image processing  
  - `reqwest` for HTTP image downloading
  - `rusqlite` for intelligent caching

### Client Package
- **[@nocojs/client](./packages/client)** - TypeScript client library that exports the `preview()` function

### Build Tool Integrations
- **[@nocojs/webpack-loader](./packages/webpack-loader)** - Webpack loader for seamless integration
- **[@nocojs/rollup-plugin](./packages/plugin-rollup)** - Rollup plugin (works with Vite)
- **[@nocojs/parcel-transformer](./packages/parcel-transformer)** - Parcel transformer plugin

## Quick Start

### Installation

```bash
# Install the client library
npm install @nocojs/client

# Install the appropriate build tool integration
npm install --save-dev @nocojs/webpack-loader     # For Webpack/Next.js
npm install --save-dev @nocojs/rollup-plugin      # For Rollup/Vite  
npm install --save-dev @nocojs/parcel-transformer # For Parcel
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
  const [loaded, setLoaded] = useState(false);
  
  return (
    <img
      src={loaded ? '/full-image.jpg' : preview('/full-image.jpg')}
      onLoad={() => setLoaded(true)}
      alt="Example"
    />
  );
}

// With react-intersection-observer for lazy loading
import { useInView } from 'react-intersection-observer';

function LazyImageComponent() {
  const { ref, inView } = useInView({ triggerOnce: true });
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div ref={ref}>
      <img
        src={inView && !loaded ? '/full-image.jpg' : preview('/full-image.jpg')}
        onLoad={() => setLoaded(true)}
        alt="Example"
      />
    </div>
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
import nocojs from '@nocojs/rollup-plugin';

export default defineConfig({
  plugins: [nocojs({
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

## Preview Options

```typescript
interface PreviewOptions {
  placeholderType?: 'normal' | 'blurred' | 'grayscale' | 'dominant-color' | 'average-color' | 'transparent';
  width?: number;           // Width in pixels (default: 12)
  height?: number;          // Height in pixels (calculated from aspect ratio if not provided)
  cache?: boolean;          // Enable caching (default: true)
  replaceFunctionCall?: boolean; // Replace function calls entirely (default: true)
}
```

### Placeholder Types

- **`normal`** - Standard downscaled version of the image
- **`blurred`** - Blurred version using SVG filters for artistic effect
- **`grayscale`** - Black and white version of the image
- **`dominant-color`** - Single color rectangle based on the dominant color
- **`average-color`** - Single color rectangle based on the average color
- **`transparent`** - Fully transparent placeholder

## Important Guidelines

### DOs ✅

- **Use static, analyzable paths**: Always provide fixed string literals or easily resolvable paths
  ```typescript
  preview('/images/hero.jpg')           // ✅ Good
  preview('./assets/banner.png')        // ✅ Good  
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
- **Cache**: Intelligent SQLite-based caching prevents redundant processing
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
yarn build        # Builds both Rust and TypeScript
yarn build:debug  # Debug build for development
```

#### Working with Examples
Test your changes using the example projects:

```bash
cd examples/vite-react-ts
yarn dev          # Start development server
yarn build        # Test build-time transformation
```

### Making Changes

#### Code Style
- **TypeScript**: Use Prettier and ESLint (configs included)
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

### Types of Contributions

#### Bug Reports
- Use the issue template
- Include reproduction steps
- Specify affected packages and versions

#### Feature Requests
- Describe the use case
- Consider implementation complexity
- Discuss API design implications

#### Code Contributions
- **Core features**: Changes to the Rust engine
- **Build integrations**: New bundler support
- **Documentation**: README improvements, code comments
- **Examples**: New framework demonstrations

### Project Structure

```
packages/
├── core/                 # Rust core + Node.js bindings
├── client/              # TypeScript client library
├── webpack-loader/      # Webpack integration
├── plugin-rollup/       # Rollup/Vite integration
└── parcel-transformer/  # Parcel integration
```

### Release Process

Releases are managed with Lerna:
- Version bumping: `lerna version`
- Publishing: `lerna publish`
- Pre-release builds are automatically created for PRs

### Getting Help

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Discord/Slack**: (Add community links if available)

Thank you for contributing to nocojs! 🚀