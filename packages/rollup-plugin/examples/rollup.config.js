// Example Rollup configuration using @nocojs/rollup-plugin

import rollupNocoPlugin from '@nocojs/rollup-plugin';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { resolve } from 'path';

export default {
  input: 'src/main.js',
  output: [
    {
      file: 'dist/bundle.esm.js',
      format: 'esm'
    },
    {
      file: 'dist/bundle.cjs.js',
      format: 'cjs'
    }
  ],
  plugins: [
    // Add node resolve plugin to handle module resolution
    nodeResolve({
      preferBuiltins: false,
      browser: true
    }),
    
    // Basic usage with default options
    // rollupNocoPlugin(),
    
    // Or with custom configuration
    rollupNocoPlugin({
      // Custom public directory
      publicDir: resolve('./assets'),
      
      // Custom cache directory
      cacheFileDir: resolve('./.cache'),
      
      // Process files matching glob patterns (new pattern-based approach)
      include: [
        '**/*.{js,jsx,ts,tsx,vue,svelte}', // Process all JS/TS files
        'src/**/*.{js,ts}',                // Only process JS/TS files in src directory
        '**/components/**/*.tsx'           // Only process TSX files in components directories
      ],
      
      // Exclude files matching glob patterns
      exclude: [
        '**/node_modules/**',              // Exclude node_modules
        '**/*.test.{js,ts,tsx}',          // Exclude test files
        '**/*.spec.{js,ts,tsx}',          // Exclude spec files
        '**/dist/**',                      // Exclude build output
        '**/.next/**'                      // Exclude Next.js build files
      ],
      
      cache: true,
      width: 12,

      placeholderType: 'blurred',

      // Logging
      logLevel: 'verbose'
    })
  ],
  
  // External dependencies (not bundled) - removed @nocojs/core to allow bundling client
  // external: ['@nocojs/core']
};
