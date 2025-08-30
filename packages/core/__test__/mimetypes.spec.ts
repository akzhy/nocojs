import path from 'path';
import { describe, expect, test } from 'vitest';
import { PlaceholderType, transform } from '../api';
import { defaultTransformOptions, getCacheFileDirName, getInput } from './utils';

const fileTypes = ['avif', 'webp', 'jpg', 'png', 'gif'];
const placeholderTypes: PlaceholderType[] = ['normal', 'average-color', 'dominant-color', 'grayscale', 'blurred'];

describe.for(fileTypes)('Process image type %s', (fileType) => {
  test.each(placeholderTypes)('placeholderType - %s', async (placeholderType) => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput({
      url: `/good_boy.${fileType}`,
    });

    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      publicDir: path.join(import.meta.dirname, 'public'),
      cacheFileDir,
      placeholderType,
    });

    const imageSrc = result.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();

    expect(imageSrc![1].startsWith("data:image")).toBeTruthy();
  });
});
