# @nocojs/parcel-transformer

Parcel transformer that turns `placeholder()` calls imported from `nocojs` into inline data URIs using the TypeScript implementation of `@nocojs/core`.

## Installation

```bash
# application dependency
npm install nocojs

# add the transformer to your Parcel toolchain
npm install --save-dev @nocojs/parcel-transformer
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

Then import from `nocojs` inside your source files:

```tsx
import { placeholder } from 'nocojs';

export function CardImage() {
   return <img src={placeholder('/images/card.jpg')} alt="Card" />;
}
```

Parcel runs the transformer during builds and replaces the call with a base64 data URI.

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

Available options map directly to the [`@nocojs/core` transform options](../core/README.md#transform-options).

## How it Works

This transformer processes your JavaScript/TypeScript modules during the Parcel build, generates placeholders through `@nocojs/core`, and replaces `placeholder("...")` calls with inline data URLs.

## License

MIT
