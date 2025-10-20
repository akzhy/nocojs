# @nocojs/webpack-loader

Webpack loader that finds `placeholder()` calls imported from `nocojs`, generates placeholders, and inlines them while bundling.

## Installation

```bash
# application dependency
npm install nocojs

# dev dependency for your webpack build
npm install --save-dev @nocojs/webpack-loader
```

## Usage

### Basic Configuration

Add the loader to your webpack configuration:

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: [
          {
            loader: "@nocojs/webpack-loader",
            options: {
              publicDir: "public",
              cacheFileDir: ".nocojs",
              logLevel: "info",
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
};
```

Import and use the helper in your codebase:

```tsx
import { placeholder } from 'nocojs';

export function Avatar() {
  return <img src={placeholder('/images/avatar.jpg')} alt="Avatar" />;
}
```

The loader rewrites the call to a data URI in the emitted bundle.

### TypeScript Configuration

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          "ts-loader",
          {
            loader: "@nocojs/webpack-loader",
            options: {
              logLevel: "verbose",
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
};
```


## Examples

### Development vs Production

```javascript
// webpack.config.js
const isDevelopment = process.env.NODE_ENV === "development";

module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: [
          {
            loader: "@nocojs/webpack-loader",
            options: {
              logLevel: isDevelopment ? "verbose" : "error",
              placeholderType: "blurred"
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
};
```

### Custom Paths

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: [
          {
            loader: "@nocojs/webpack-loader",
            options: {
              publicDir: "src/assets",
              cacheFileDir: "node_modules/.cache/nocojs",
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
};
```

## License

MIT
