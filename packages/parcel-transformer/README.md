# @nocojs/parcel-transformer

A Parcel plugin for nocojs image optimization and lazy loading.

## Installation

```bash
npm install @nocojs/parcel-transformer
# or
yarn add @nocojs/parcel-transformer
```

## Usage

Add this to your `.parcelrc` file

```json
"transformers": {
   "*.{js,jsx,ts,tsx}": [
   "@nocojs/parcel-transformer",
   "..."
   ]
}
```

### Configuration Options

You can pass options by adding a `@nocojs/parcel-transformer` field in your package.json

```json
"@nocojs/parcel-transformer": {
   "publicDir": "public",
   "cacheFileDir": ".nocojs",
   "placeholderType": "blurred",
   "logLevel": "info"
}
```

Available options for the transform function:

- `publicDir` (string): Directory containing static assets (default: 'public')
- `cacheFileDir` (string): Directory for nocojs cache files (default: '.nocojs')
- `placeholderType` ('normal' | 'blurred' | 'grayscale' | 'dominant-color' | 'average-color' | 'transparent'): Type of placeholder image (default: 'normal')
- `logLevel` ('error' | 'info' | 'none' | 'verbose'): Logging level (default: 'info')
- `replaceFunctionCall` (boolean): Whether to replace function calls (default: true)
- `cache` (boolean): Enable caching (default: true)
- `width` (number): Default width for image processing
- `height` (number): Default height for image processing

## How it Works

This plugin transforms your JavaScript/TypeScript code to optimize images for lazy loading using the nocojs core library. It processes files during the Parcel build process and replaces preview calls with appropriate placeholders.

## Development

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Build the plugin:

   ```bash
   yarn build
   ```

3. Run tests:

   ```bash
   yarn test
   ```

4. Development mode:
   ```bash
   yarn dev
   ```

## License

MIT
