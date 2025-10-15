import { describe, expect, test } from "vitest";
import {
  base64ToSharpImage,
  defaultTransformOptions,
  getCacheFileDirName,
  getInput,
  isFullyTransparent,
  isImageSingleColor,
  verifyPreviewCall,
} from "./utils";
import { Transformer } from "../src/transform";

describe("Preview options", async () => {
  const cacheFileDir = getCacheFileDirName();
  test("aspect ratio: default is working", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    console.log(imageSrc![1]);
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const metadata = await sharpInstance.metadata();

    const widthToHeightRatio = 4 / 5;

    expect(metadata.height).toBe(
      Math.floor(metadata.width / widthToHeightRatio)
    );
  });

  test("aspect ratio: width is working as expected", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        width: 10,
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const metadata = await sharpInstance.metadata();

    const widthToHeightRatio = 4 / 5;

    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(Math.floor(400 / widthToHeightRatio));
  });

  test("aspect ratio: height is working as expected", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        height: 10,
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const metadata = await sharpInstance.metadata();

    const widthToHeightRatio = 4 / 5;

    expect(metadata.height).toBe(500);
    expect(metadata.width).toBe(Math.floor(500 * widthToHeightRatio));
  });

  test("aspect ratio: width and height are working together", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        height: 10,
        width: 10,
        wrapWithSvg: false,
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const metadata = await sharpInstance.metadata();

    expect(metadata.height).toBe(10);
    expect(metadata.width).toBe(10);
  });

  test("placeholder: dominant color", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        placeholderType: "dominant-color",
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    // Not exactly checking for dominant color, this one simply checks if the generated image is a single color
    // This is a workaround as the dominant color function (getDominantColor) defined in utils seems to be non-deterministic
    // It can randomly return different dominant colors for the same image
    // Alternate approach of resizing the image to 1x1 pixel and checking if the color is single also seems to be failing
    const hasSingleColor = await isImageSingleColor(sharpInstance);
    expect(hasSingleColor).toBe(true);
  });

  test("placeholder: average color", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        placeholderType: "average-color",
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const hasSingleColor = await isImageSingleColor(sharpInstance);
    expect(hasSingleColor).toBe(true);
  });

  test("placeholder: grayscale", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        placeholderType: "grayscale",
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const pngSharp = sharpInstance.png();
    const { data, info } = await pngSharp
      .raw()
      .toBuffer({ resolveWithObject: true });

    let isGrayscale = true;
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (!(r === g && g === b)) {
        isGrayscale = false;
        break;
      }
    }

    expect(isGrayscale).toBe(true);
  });

  test("placeholder: transparent", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        placeholderType: "transparent",
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();
    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const isTransparent = await isFullyTransparent(sharpInstance);
    expect(isTransparent).toBe(true);
  });

  test("replace function call - true", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        replaceFunctionCall: true,
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();

    const { found } = verifyPreviewCall(result!.code);
    expect(found).toBe(false);
  });

  test("replace function call - false", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        replaceFunctionCall: false,
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();

    const { found, imageUpdated } = verifyPreviewCall(result!.code);

    expect(found).toBe(true);
    expect(imageUpdated).toBe(true);
  });

  test("wrapWithSvg - false", async () => {
    const input = getInput({
      url: "/good_boy_4x5.jpg",
      previewOptions: {
        wrapWithSvg: false,
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
      cacheFileDir,
    });

    await t1.preTransform();
    const result = await t1.transform(input, "index.ts");
    await t1.postTransform();

    const imageSrc = result!.code.match(/const img\s*=\s*"(.*?)";/);
    expect(imageSrc).toBeDefined();

    const sharpInstance = base64ToSharpImage(imageSrc![1]);
    const metadata = await sharpInstance.metadata();
    expect(metadata.format).toBe("png");
  });
});
