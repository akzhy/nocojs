import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { Transformer } from "../src/transform";
import {
  checkPreviewImage,
  decodeDataUri,
  defaultTransformOptions,
  ensureGrayscaleImage,
  ensureSingleColorImage,
  ensureTransparentImage,
  getCacheFileDirName,
  getDataUriFromCode,
  getImageAssignments,
  getInput,
  verifyPlaceholderCall,
} from "./utils";

describe("Basic Transform Tests", () => {
  test("transforms with no options", async () => {
    const input = getInput();
    const t = new Transformer();
    const result = await t.transform(input, "index.ts");
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("feGaussianBlur");
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("feGaussianBlur");
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("feGaussianBlur");
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const assignments = getImageAssignments(result.code);
    expect(assignments).toHaveLength(4);
    expect(assignments[0].value).toBe("/invalid-url.jpg");
    expect(assignments[1].value).toBe("file:///invalid-path.jpg");
    expect(assignments[2].value).toBe("https://example.com/invalid-image.jpg");

    const validPlaceholder = assignments[3].value;
    expect(validPlaceholder.startsWith("data:image")).toBe(true);
    const svgContent = decodeDataUri(validPlaceholder);
    expect(svgContent).toContain("feGaussianBlur");
  }, 30000);
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("<image");
    expect(svgContent).not.toContain("feGaussianBlur");
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("feGaussianBlur");
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    await ensureSingleColorImage(dataUri);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("<rect");
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    await ensureSingleColorImage(dataUri);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("<rect");
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    await ensureGrayscaleImage(dataUri);
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

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("Expected transform result");
    }

    expect(checkPreviewImage(result.code)).toBe(true);
    const placeholderCall = verifyPlaceholderCall(result.code);
    expect(placeholderCall.found).toBe(false);

    const dataUri = getDataUriFromCode(result.code);
    await ensureTransparentImage(dataUri);
    const svgContent = decodeDataUri(dataUri);
    expect(svgContent).toContain("fill='transparent'");
  });
});
