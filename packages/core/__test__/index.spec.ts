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

describe('Global placeholderType option tests', () => {
  beforeEach(async () => {
    await rm(defaultTransformOptions.cacheFileDir!, { recursive: true });
  })

  test('placeholderType - normal', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'normal',
    });
    expect(result.code).toMatchSnapshot();
  });

  test('placeholderType - average-color', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'average-color',
    });
    expect(result.code).toMatchSnapshot();
  });

  test('placeholderType - dominant-color', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'dominant-color',
    });
    expect(result.code).toMatchSnapshot();
  });

  test('placeholderType - black-and-white', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'black-and-white',
    });
    expect(result.code).toMatchSnapshot();
  });

  test('placeholderType - transparent', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'transparent',
    });
    expect(result.code).toMatchSnapshot();
  });
});
