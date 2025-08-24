# @nocojs/rspack-loader

A Rspack loader for @nocojs/core transformations.

## Installation

```bash
npm install @nocojs/rspack-loader @nocojs/core
# or
yarn add @nocojs/rspack-loader @nocojs/core
# or
pnpm add @nocojs/rspack-loader @nocojs/core
```

## Usage

### Basic Configuration

Add the loader to your `rspack.config.js`:

```javascript
const { defineConfig } = require('@rspack/cli');

module.exports = defineConfig({
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx|vue)$/,
        use: [
          {
            loader: '@nocojs/rspack-loader',
            options: {
              // Loader options
              logLevel: 'info',
              publicDir: 'public',
              cacheFileDir: '.nocojs'
            }
          }
        ]
      }
    ]
  }
});
```

### TypeScript Configuration

```typescript
import { defineConfig } from '@rspack/cli';
import type { NocoLoaderOptions } from '@nocojs/rspack-loader';

export default defineConfig({
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx|vue)$/,
        use: [
          {
            loader: '@nocojs/rspack-loader',
            options: {
              logLevel: 'info',
              publicDir: 'public',
              cacheFileDir: '.nocojs'
            } as NocoLoaderOptions
          }
        ]
      }
    ]
  }
});
```

## Options

The loader accepts all @nocojs/core `TransformOptions` plus the following additional options:

### `publicDir`
- Type: `string`
- Default: `'public'` (relative to Rspack context)
- Description: Public directory path for static assets

### `cacheFileDir`
- Type: `string`
- Default: `'.nocojs'` (relative to Rspack context)
- Description: Cache directory for nocojs transformations

### Other Options

All other options from [@nocojs/core](../core/README.md) are supported:

- `logLevel`: Control logging verbosity
- `preserveComments`: Whether to preserve comments in transformed code
- And more...

## Examples

### Vue Single File Components

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        use: [
          'vue-loader',
          {
            loader: '@nocojs/rspack-loader',
            options: {
              logLevel: 'debug'
            }
          }
        ]
      }
    ]
  }
};
```

### React Components

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(jsx|tsx)$/,
        use: [
          'babel-loader',
          {
            loader: '@nocojs/rspack-loader',
            options: {
              publicDir: './assets',
              cacheFileDir: './cache'
            }
          }
        ]
      }
    ]
  }
};
```

## License

MIT
