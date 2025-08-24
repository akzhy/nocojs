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

Available options are same options as the [@nocojs/core transform function](../core/README.md#transform-options)

## How it Works

This plugin transforms your JavaScript/TypeScript code to optimize images for lazy loading using the nocojs core library. It processes files during the Parcel build process and replaces preview calls with appropriate placeholders.

## License

MIT
