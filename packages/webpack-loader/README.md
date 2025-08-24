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

The loader accepts the same options as the [@nocojs/core transform function](../core/README.md#transform-options)

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
