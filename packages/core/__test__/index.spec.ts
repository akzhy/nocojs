import { readFile } from 'fs/promises';
import path from 'path';
import { describe, expect, test } from 'vitest';
import { transform } from '../api';
import { checkPreviewImage, defaultTransformOptions, getCacheFileDirName, getInput } from './utils';

describe('Basic Transform Tests', () => {
  test('transforms with no options', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts');
    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('transforms with custom cache dir', async () => {
    const input = getInput();
    const result = await transform(input, 'index.ts', defaultTransformOptions);

    const cacheFilePath = path.join(defaultTransformOptions.cacheFileDir!, 'cache.db');

    const cacheFileExists = await readFile(cacheFilePath);
    expect(cacheFileExists).toBeDefined();

    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('transforms with custom publicDir', async () => {
    const input = getInput({
      url: '/good_boy_4x5.jpg',
    });
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      publicDir: path.join(__dirname, 'static'),
    });

    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('ignores invalid URLs and Paths', async () => {
    const input = getInput([
      {
        url: '/invalid-url.jpg',
      },
      {
        url: 'file:///invalid-path.jpg',
      },
      {
        url: 'https://example.com/invalid-image.jpg',
      },
      {
        url: '/good_boy_4x5.jpg',
      },
    ]);
    const result = await transform(input, 'index.ts', defaultTransformOptions);

    const matches = result.code.match(/const img\d*\s*=\s*(.*)/gm);
    if (!matches) {
      return;
    }

    expect(checkPreviewImage(matches[0])).toBe(false);
    expect(checkPreviewImage(matches[1])).toBe(false);
    expect(checkPreviewImage(matches[2])).toBe(false);
    expect(checkPreviewImage(matches[3])).toBe(true);
  }, 20000);
});

describe('Global placeholderType option tests with remote image', () => {
  test('placeholderType - normal', async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'normal',
      cacheFileDir,
    });
    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('placeholderType - normal', async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'blurred',
      cacheFileDir,
    });
    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('placeholderType - average-color', async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'average-color',
      cacheFileDir,
    });
    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('placeholderType - dominant-color', async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'dominant-color',
      cacheFileDir,
    });
    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('placeholderType - grayscale', async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'grayscale',
      cacheFileDir,
    });
    expect(checkPreviewImage(result.code)).toBeTruthy();
  });

  test('placeholderType - transparent', async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      placeholderType: 'transparent',
      cacheFileDir,
    });
    expect(checkPreviewImage(result.code)).toBeTruthy();
  });
});
