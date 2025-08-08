import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__test__/**/*.{test,spec}.{js,ts}'],
    env: {
      OXC_TSCONFIG_PATH: './__test__/tsconfig.json',
    },
  },
  esbuild: {
    target: 'node14',
  },
});
