import { rm } from 'fs/promises';
import path from 'path';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlaceholderType, transform } from '../api';
import { defaultTransformOptions, getInput } from './utils';

const fileTypes = ['avif', 'webp', 'jpg', 'png', 'gif'];
const placeholderTypes: PlaceholderType[] = ['normal', 'average-color', 'dominant-color', 'grayscale', 'blurred'];

describe.for(fileTypes)('Process image type %s', (fileType) => {
  test.each(placeholderTypes)('placeholderType - %s', async (placeholderType) => {
    beforeEach(async () => {
      await rm(defaultTransformOptions.cacheFileDir!, { recursive: true });
    });

    const input = getInput({
      url: `/good_boy.${fileType}`,
    });

    const result = await transform(input, 'index.ts', {
      ...defaultTransformOptions,
      publicDir: path.join(import.meta.dirname, 'public'),
      placeholderType,
    });

    const imageSrc = result.code.match(/let img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();

    expect(imageSrc![1].startsWith("data:image")).toBeTruthy();
  });
});
