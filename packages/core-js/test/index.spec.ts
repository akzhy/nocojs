import { readFile } from "fs/promises";
import path from "path";
import { describe, expect, test } from "vitest";
import { Transformer } from "../src/transform";
import {
  defaultTransformOptions,
  getCacheFileDirName,
  getInput,
} from "./utils";

describe("Basic Transform Tests", () => {
  test("transforms with no options", async () => {
    const input = getInput();
    const t = new Transformer();
    const result = await t.transform(input, "index.ts");
    expect(result).toMatchSnapshot();
  });

  test("transforms with custom cache dir", async () => {
    const input = getInput();
    const cacheDir = getCacheFileDirName(true);
    const t = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir: cacheDir,
    });
    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    const cacheFilePath = path.join(cacheDir, "cache.db");

    const cacheFileExists = await readFile(cacheFilePath);
    expect(cacheFileExists).toBeDefined();

    expect(result).toMatchSnapshot();
  });

  test("transforms with custom publicDir", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
    });

    const t = new Transformer({
      ...defaultTransformOptions,
      publicDir: path.join(__dirname, "static"),
    });
    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  });

  test("ignores invalid URLs and Paths", async () => {
    const input = getInput([
      {
        url: "/invalid-url.jpg",
      },
      {
        url: "file:///invalid-path.jpg",
      },
      {
        url: "https://example.com/invalid-image.jpg",
      },
      {
        url: "/good_boy_4x5.jpg",
      },
    ]);
    const t = new Transformer(defaultTransformOptions);
    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  }, 20000);
});

describe("Global placeholderType option tests with remote image", () => {
  test("placeholderType - normal", async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();

    const t = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
      cacheFileDir,
    });

    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  });

  test("placeholderType - blurred", async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const t = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "blurred",
      cacheFileDir,
    });

    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  });

  test("placeholderType - average-color", async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const t = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "average-color",
      cacheFileDir,
    });

    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  });

  test("placeholderType - dominant-color", async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const t = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "dominant-color",
      cacheFileDir,
    });
    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  });

  test("placeholderType - grayscale", async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const t = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "grayscale",
      cacheFileDir,
    });
    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  });

  test("placeholderType - transparent", async () => {
    const cacheFileDir = getCacheFileDirName();
    const input = getInput();
    const t = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "transparent",
      cacheFileDir,
    });
    await t.preTransform();
    const result = await t.transform(input, "index.ts");
    await t.postTransform();

    expect(result).toMatchSnapshot();
  });
});
