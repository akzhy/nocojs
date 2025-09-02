# @nocojs/rollup-plugin

A Rollup plugin for nocojs image optimization that transforms your code to optimize and lazy-load images automatically.

## Installation

```bash
npm install @nocojs/rollup-plugin
# or
yarn add @nocojs/rollup-plugin
# or
pnpm add @nocojs/rollup-plugin
```

## Usage

### Basic Usage

```js
// rollup.config.js
import { rollupNocoPlugin } from '@nocojs/rollup-plugin';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [
    rollupNocoPlugin()
  ]
};
```

### With Custom Options

```js
// rollup.config.js
import { rollupNocoPlugin } from '@nocojs/rollup-plugin';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'esm'
  },
  plugins: [
    rollupNocoPlugin({
      // Directory where static assets are served from
      publicDir: 'public',
      
      // Directory for nocojs cache files
      cacheFileDir: '.nocojs',
      
      // File patterns to include (supports glob patterns)
      include: [
        '**/*.{js,jsx,ts,tsx,vue,svelte}', // Process all matching files
        'src/**/*.{js,ts}',                // Only process JS/TS files in src
        '**/components/**/*.tsx'           // Only TSX files in components dirs
      ],
      
      // File patterns to exclude (supports glob patterns)
      exclude: [
        '**/node_modules/**',              // Exclude node_modules
        '**/*.test.{js,ts,tsx}',          // Exclude test files
        '**/dist/**'                       // Exclude build output
      ],
      
      // Placeholder type for images
      placeholderType: 'blurred',
      
      // Enable caching
      cache: true,
      
      // Log level
      logLevel: 'info',
      
      // Default dimensions
      width: 12, 
      // height: 12 /* If either height or width is provided, the image will be resized with the aspect ratio preserved */
      wrapWithSvg: true, // Whether to wrap the generated preview in an SVG to keep aspect ratio.
    })
  ]
};
```

## Options

### `publicDir`
- **Type:** `string`
- **Default:** `'public'`

Directory where static assets are served from.

### `cacheFileDir`
- **Type:** `string`
- **Default:** `'.nocojs'`

Directory where nocojs cache files are stored.

### `include`
- **Type:** `string[]`
- **Default:** `['**/*.{js,jsx,ts,tsx,vue,svelte}']`

File patterns to include for processing. Supports glob patterns powered by [picomatch](https://github.com/micromatch/picomatch).

**Examples:**
- `['**/*.{js,ts}']` - Process all JS/TS files
- `['src/**/*.tsx']` - Process only TSX files in src directory
- `['**/components/**/*.{js,jsx}']` - Process JS/JSX files only in components directories

### `exclude`
- **Type:** `string[]`
- **Default:** `['**/node_modules/**']`

File patterns to exclude from processing. Supports glob patterns powered by [picomatch](https://github.com/micromatch/picomatch).

**Examples:**
- `['**/node_modules/**']` - Exclude node_modules
- `['**/*.test.{js,ts}']` - Exclude test files
- `['**/dist/**', '**/.next/**']` - Exclude build directories

### `placeholderType`
- **Type:** `'normal' | 'blurred' | 'grayscale' | 'dominant-color' | 'average-color' | 'transparent'`
- **Default:** `'normal'`

Type of placeholder to generate for images.

### `replaceFunctionCall`
- **Type:** `boolean`
- **Default:** `undefined`

Whether to replace function calls in the transformed code.

### `cache`
- **Type:** `boolean`
- **Default:** `undefined`

Enable or disable caching of processed images.

### `width`
- **Type:** `number`
- **Default:** `undefined`

Default width for image processing.

### `height`
- **Type:** `number`
- **Default:** `undefined`

Default height for image processing.

### `logLevel`
- **Type:** `'error' | 'info' | 'none' | 'verbose'`
- **Default:** `undefined`

Log level for the transformation process.

## Example

Before transformation:
```jsx
import { preview } from "@nocojs/client";
// src/App.jsx
function App() {
  return (
    <div>
      <img src={preview("https://example.com/image.jpg")} alt="Example" />
    </div>
  );
}
```

After transformation (conceptual):
```jsx
// The plugin will transform the code to include lazy loading and optimization
function App() {
  return (
    <div>
      <img 
        src="data:image/png;base64,..." 
        alt="Example"
      />
    </div>
  );
}
```

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## Related

- [@nocojs/core](../core) - Core transformation library
- [@nocojs/client](../client) - Client library
