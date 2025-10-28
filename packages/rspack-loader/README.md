# @nocojs/rspack-loader

Rspack loader that transforms `placeholder()` calls from `nocojs` into inline data URIs using `@nocojs/core` under the hood.

## Installation

```bash
# application dependency
npm install nocojs

# dev dependency for your Rspack build
npm install --save-dev @nocojs/rspack-loader
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

The loader accepts the same [`TransformOptions`](../core/README.md#transform-options) as `@nocojs/core`. Common settings include:

- `publicDir` (`string`, default `'public'`): root directory for resolving `/`-prefixed paths.
- `cacheFileDir` (`string`, default `'.nocojs'`): location of the SQLite cache database.
- `placeholderType` (`"normal" | "blurred" | ...`, default `'blurred'`): controls placeholder style.
- `logLevel` (`"none" | "error" | "info" | "verbose"`): adjusts diagnostic output.
## Using the client helper

In your UI code import from `nocojs`:

```tsx
import { placeholder } from 'nocojs';

export function ProfileImage() {
  return <img src={placeholder('/images/profile.jpg')} alt="Profile" />;
}
```

When the loader runs it rewrites the call to an inline data URI, so no runtime dependency remains.

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
