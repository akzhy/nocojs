import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 20000,
    environment: 'node',
    include: ['__test__/**/*.{test,spec}.{js,ts}'],
    env: {
      OXC_TSCONFIG_PATH: './__test__/tsconfig.json',
    },
    globalSetup: './__test__/vitest.global-setup.ts',
  },
  esbuild: {
    target: 'node14',
  },
});
