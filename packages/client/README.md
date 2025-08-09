# @nocojs/client

A lightweight client library for generating optimized image previews at build time. The `@nocojs/client` package provides a simple API that integrates with build tools to replace image URLs with small, optimized placeholder images.

## Installation

```bash
npm install @nocojs/client
```

## Usage

The package exports a single function `preview` that by itself is a pass-through function returning the first argument unchanged. However, when used with the appropriate build-time integration (webpack, rollup, or parcel), the `preview` function calls are replaced with small optimized versions of the images.

### Basic Usage

```typescript
import { preview } from '@nocojs/client';

// Basic usage - just pass the image URL
const imagePreview = preview('https://example.com/image.jpg');

// Use in your components
function ImageComponent() {
  return (
    <img 
      src={preview('/path/to/image.jpg')} 
      alt="Optimized preview"
    />
  );
}
```

### With Options

The second argument allows you to customize the preview generation:

```typescript
import { preview } from '@nocojs/client';

// Custom width (default: 12px)
const smallPreview = preview('/image.jpg', { width: 8 });

// Custom height
const tallPreview = preview('/image.jpg', { height: 20 });

// Different placeholder types
const blurredPreview = preview('/image.jpg', { placeholderType: 'blurred' });
const grayscalePreview = preview('/image.jpg', { placeholderType: 'grayscale' });
const dominantColorPreview = preview('/image.jpg', { placeholderType: 'dominant-color' });

// Disable caching for specific images
const uncachedPreview = preview('/image.jpg', { cache: false });
```

## API Reference

### `preview(url, options?)`

Generates an optimized preview of an image at build time.

#### Parameters

- **`url`** (string): The path or URL to the image
- **`options`** (PreviewOptions, optional): Configuration options for the preview generation

#### Returns

- **string**: The original URL (at runtime), or optimized preview data URL (after build transformation)

### PreviewOptions

```typescript
interface PreviewOptions {
  placeholderType?: PlaceholderType;
  replaceFunctionCall?: boolean;
  cache?: boolean;
  width?: number;
  height?: number;
}
```

#### Options

- **`placeholderType`**: The type of placeholder to generate
  - `'normal'` (default): Standard downscaled image
  - `'blurred'`: Blurred version of the normal one
  - `'grayscale'`: Grayscale version of the image  
  - `'dominant-color'`: Single color based on dominant color
  - `'average-color'`: Single color based on average color
  - `'transparent'`: Transparent placeholder

- **`width`**: Width of the generated preview in pixels (default: 12)
- **`height`**: Height of the generated preview in pixels (calculated from aspect ratio if not specified)
- **`cache`**: Whether to cache the generated preview (default: true)
- **`replaceFunctionCall`**: Whether to replace the function call entirely (internal use)

## Build Tool Integration

To actually generate the optimized previews, you need to use one of the build tool integrations:

### Webpack

```bash
npm install @nocojs/webpack-loader
```

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        use: [
          'ts-loader', // or your preferred loader
          {
            loader: '@nocojs/webpack-loader',
            options: {
              publicDir: 'public',
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

### Rollup/Vite

```bash
npm install @nocojs/plugin-rollup
```

```javascript
// rollup.config.js or vite.config.js
import { nocojs } from '@nocojs/plugin-rollup';

export default {
  plugins: [
    nocojs({
      publicDir: 'public',
      placeholderType: 'blurred'
    })
  ]
};
```

### Parcel

```bash
npm install @nocojs/parcel-transformer
```

The transformer will be automatically detected and used by Parcel.

## Examples

### Image Gallery with Previews

```typescript
import { preview } from '@nocojs/client';

function createImageGallery() {
  const images = [
    {
      preview: preview('https://images.unsplash.com/photo-1506905925346-21bda4d32df4'),
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'
    },
    {
      preview: preview('https://images.unsplash.com/photo-1518837695005-2083093ee35b', { 
        placeholderType: 'blurred',
        width: 16 
      }),
      src: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b'
    }
  ];

  return images.map(image => `
    <img src="${image.preview}" 
         data-src="${image.src}" 
         style="width: 300px; height: 200px;" />
  `).join('');
}
```


## How It Works

1. During development, `preview()` simply returns the original URL
2. At build time, the build tool integration:
   - Analyzes your code for `preview()` function calls
   - Downloads or accesses the images from the specified paths
   - Generates small, optimized placeholder images (12px width by default)
   - Replaces the function calls with base64-encoded data URLs of the placeholders
3. In the final bundle, your `preview()` calls become tiny optimized images

This enables instant loading of image previews while maintaining the flexibility to lazy-load full-resolution images when needed.


## License

ISC