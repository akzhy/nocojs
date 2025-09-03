import { defineConfig, RolldownOptions } from 'rolldown';
import copy from 'rollup-plugin-copy';
import typescript from '@rollup/plugin-typescript';

const createOptions = (format: 'esm' | 'cjs'): RolldownOptions => {
  return {
    input: 'api.ts',
    platform: 'node',
    output: {
      dir: `dist/${format}`,
      format: format,
      esModule: true,
    },
    external: (id) => {
      return id.endsWith('.node') || id.includes('node_modules');
    },
    plugins: [
      process.env.NODE_ENV !== 'production' &&
        copy({
          targets: [
            {
              src: '*.node',
              dest: `dist/${format}`,
            },
            {
              src: '*.wasm',
              dest: `dist/${format}`,
            },
          ],
        }),
    ],
  };
};

export default defineConfig([
  createOptions('esm'),
  createOptions('cjs'),
  {
    input: 'api.ts',
    output: {
      dir: 'dist/types',
    },
    plugins: [
      typescript({ tsconfig: './tsconfig.json' }),
      copy({
        targets: [
          {
            src: 'index.d.ts',
            dest: 'dist/types',
          },
        ],
      }),
    ],
  },
]);
