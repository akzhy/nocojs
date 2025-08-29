import { describe, expect, test } from 'vitest';
import { transform } from '../api';
import { defaultTransformOptions, getInput } from './utils';

describe('Caching should work as expected', async () => {
  test('no cache is working', async () => {
    const cacheFileDir = `${defaultTransformOptions.cacheFileDir}/${new Date().getTime()}`;
    const input = getInput({
      url: '/good_boy.avif',
      previewOptions: {
        cache: false,
      },
    });

    await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: 'normal',
    });

    const result2 = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: 'normal',
    });

    const cacheHits = result2.logs?.filter((log) => log.message.includes('Cache hit')).length || 0;

    expect(cacheHits).toBe(0);
  });

  // Currently this doesn't work because the existence of the cache is checked during the first pass
  // and the cache is created only after the first pass.
  // Could update it later by adding an intermediate cached state
  test.skip('immediate cache hit', async () => {
    const multiInput = getInput([{ url: '/good_boy.avif' }, { url: '/good_boy.avif' }]);

    const result = await transform(multiInput, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'normal',
    });

    const cacheHits = result.logs?.filter((log) => log.message.includes('Cache hit')).length || 0;
    expect(cacheHits).toBe(1);
  });

  test('loads cached db file', async () => {
    const input = getInput({
      url: `/good_boy.avif`,
    });

    const cacheFileDir = `${defaultTransformOptions.cacheFileDir}/${new Date().getTime()}`;

    await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: 'normal',
    });

    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: 'normal',
    });

    const cacheHits = result.logs?.filter((log) => log.message.includes('Cache hit')).length || 0;

    expect(cacheHits).toBe(1);
  });

  test('cache ignored if preview options change', async () => {
    const cacheFileDir = `${defaultTransformOptions.cacheFileDir}/${new Date().getTime()}`;

    const input = getInput({
      url: '/good_boy.avif',
    });
    await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'normal',
      cacheFileDir,
      cache: false,
    });

    const result1 = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: 'dominant-color',
    });

    const cacheHits1 = result1.logs?.filter((log) => log.message.includes('Cache hit')).length || 0;
    expect(cacheHits1).toBe(0);

    const result2 = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'average-color',
      cacheFileDir,
    });

    const cacheHits2 = result2.logs?.filter((log) => log.message.includes('Cache hit')).length || 0;
    expect(cacheHits2).toBe(0);

    const result3 = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'average-color',
      width: 10,
      cacheFileDir,
    });

    const cacheHits3 = result3.logs?.filter((log) => log.message.includes('Cache hit')).length || 0;
    expect(cacheHits3).toBe(0);

    const result4 = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'average-color',
      width: 10,
      height: 10,
      cacheFileDir,
    });
    const cacheHits4 = result4.logs?.filter((log) => log.message.includes('Cache hit')).length || 0;
    expect(cacheHits4).toBe(0);
  }, 10000);
});
