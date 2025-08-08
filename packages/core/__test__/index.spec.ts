import { beforeEach, describe, expect, test } from 'vitest';
import { transform } from '../api';
import { defaultTransformOptions, getInput } from './utils';
import path from 'path';
import { readFile, rm } from 'fs/promises';

describe('Basic Transform Tests', () => {
  test('transforms with no options', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts');
    expect(result.code).toMatchSnapshot();
  });

  test('transforms with custom cache dir', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', defaultTransformOptions);

    const cacheFilePath = path.join(defaultTransformOptions.cacheFileDir!, 'cache.db');

    const cacheFileExists = await readFile(cacheFilePath);
    expect(cacheFileExists).toBeDefined();

    expect(result.code).toMatchSnapshot();
  });
});


describe('Global placeholderType option tests with remote image', () => {
  beforeEach(async () => {
    await rm(defaultTransformOptions.cacheFileDir!, { recursive: true });
  })

  test.skip('placeholderType - normal', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'normal',
    });
    expect(result.code).toMatchSnapshot();
  });

  test.skip('placeholderType - average-color', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'average-color',
    });
    expect(result.code).toMatchSnapshot();
  });

  test.skip('placeholderType - dominant-color', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'dominant-color',
    });
    expect(result.code).toMatchSnapshot();
  });

  test.skip('placeholderType - grayscale', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'grayscale',
    });
    expect(result.code).toMatchSnapshot();
  });

  test.skip('placeholderType - transparent', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'transparent',
    });
    expect(result.code).toMatchSnapshot();
  });
});
