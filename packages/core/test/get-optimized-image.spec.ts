import { existsSync } from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  type GetOptimizedImageOptions,
  getOptimizedImage,
} from "../src/get-optimized-image";
import { defaultTransformOptions } from "./utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("getOptimizedImage function tests", () => {
  const testImagePath = path.join(
    defaultTransformOptions.publicDir,
    "good_boy_4x5.jpg",
  );
  const baseOptions: GetOptimizedImageOptions = {
    outputDir: path.join(__dirname, "public", "get_srcset"),
  };

  test("should generate optimized image files", async () => {
    const result = await getOptimizedImage(testImagePath, baseOptions);
    expect(result.images.length).toBeGreaterThan(0);

    result.images.forEach((img) => {
      expect(typeof img.src).toBe("string");
      expect(typeof img.width).toBe("number");
      expect(typeof img.height).toBe("number");
      expect(typeof img.format).toBe("string");
      expect(typeof img.filePath).toBe("string");

      expect(existsSync(img.filePath)).toBe(true);
    });
  });
});
