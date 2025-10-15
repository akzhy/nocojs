import path from "path";
import { describe, expect, test } from "vitest";
import { Transformer } from "../src/transform";
import {
  defaultTransformOptions,
  getCacheFileDirName,
  getInput,
} from "./utils";
import { PlaceholderImageType } from "../src/placeholder-image";

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

      expect(result).toMatchSnapshot();
    }
  );
});
