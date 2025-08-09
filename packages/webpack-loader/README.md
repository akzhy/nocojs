# @nocojs/webpack-loader

A webpack loader for [@nocojs/core](../core) that enables automatic image placeholder generation during the build process.

## Installation

```bash
npm install @nocojs/webpack-loader
# or
yarn add @nocojs/webpack-loader
# or
pnpm add @nocojs/webpack-loader
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

## Options

The loader accepts the same options as the [@nocojs/core transform function](../core/README.md#transform-options), with additional webpack-specific defaults:

| Option                | Type                                       | Default     | Description                                                       |
| --------------------- | ------------------------------------------ | ----------- | ----------------------------------------------------------------- |
| `publicDir`           | `string`                                   | `"public"`  | Directory for static assets (relative to webpack context)         |
| `cacheFileDir`        | `string`                                   | `".nocojs"` | Cache directory for transformations (relative to webpack context) |
| `logLevel`            | `"error" \| "info" \| "none" \| "verbose"` | `"info"`    | Logging level                                                     |
| `placeholderType`     | `PlaceholderType`                          | `"normal"`  | Type of placeholder to generate                                   |
| `replaceFunctionCall` | `boolean`                                  | `true`      | Whether to replace function calls                                 |
| `cache`               | `boolean`                                  | `true`      | Enable/disable caching                                            |
| `width`               | `number`                                   | `undefined` | Default width for transformations                                 |
| `height`              | `number`                                   | `undefined` | Default height for transformations                                |

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

## How it Works

The loader processes your source files and transforms any image-related code using the @nocojs/core library. It automatically:

1. Detects image references in your code
2. Generates placeholders
3. Replaces the original references with the placeholder.
4. Caches results for faster subsequent builds

## License

MIT
