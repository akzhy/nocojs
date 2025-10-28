import path from "node:path";
import { describe, expect, test } from "vitest";
import type { PlaceholderImageType } from "../src/placeholder-image";
import { Transformer } from "../src/transform";
import {
  checkPreviewImage,
  decodeDataUri,
  defaultTransformOptions,
  ensureGrayscaleImage,
  ensureSingleColorImage,
  getCacheFileDirName,
  getDataUriFromCode,
  getInput,
  verifyPlaceholderCall,
} from "./utils";

const fileTypes = ["avif", "webp", "jpg", "png", "gif"];
const placeholderTypes: PlaceholderImageType[] = [
  "normal",
  "average-color",
  "dominant-color",
  "grayscale",
  "blurred",
];

describe.for(fileTypes)("Process image type %s", (fileType) => {
  test.each(placeholderTypes)(
    "placeholderType - %s",
    async (placeholderType) => {
      const cacheFileDir = getCacheFileDirName();
      const input = getInput({
        url: `/good_boy.${fileType}`,
      });

      const t = new Transformer({
        ...defaultTransformOptions,
        publicDir: path.join(import.meta.dirname, "public"),
        cacheFileDir,
        placeholderType,
      });
      await t.preTransform();
      const result = await t.transform(input, "index.ts");
      await t.postTransform();

      if (!result) {
        throw new Error("No transform result");
      }

      expect(checkPreviewImage(result.code)).toBe(true);
      const placeholderCall = verifyPlaceholderCall(result.code);
      expect(placeholderCall.found).toBe(false);

      const dataUri = getDataUriFromCode(result.code);
      expect(dataUri.startsWith("data:image")).toBe(true);
      const svgContent = decodeDataUri(dataUri);

      if (placeholderType === "normal") {
        expect(svgContent).toContain("<image");
        expect(svgContent).not.toContain("feGaussianBlur");
      } else if (placeholderType === "blurred") {
        expect(svgContent).toContain("feGaussianBlur");
      } else if (placeholderType === "grayscale") {
        await ensureGrayscaleImage(dataUri);
      } else {
        await ensureSingleColorImage(dataUri);
        expect(svgContent).toContain("<rect");
      }
    },
  );
});
