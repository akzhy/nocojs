import path, { dirname } from "path";
import { describe, expect, test } from "vitest";
import { defaultTransformOptions } from "./utils";
import { GetSrcsetOptions, getSrcset } from "../src/get-srcset";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("getSrcset function tests", () => {
  const testImagePath = path.join(
    defaultTransformOptions.publicDir!,
    "good_boy_4x5.jpg"
  );
  const baseOptions: GetSrcsetOptions = {
    outputDir: path.join(__dirname, "public", "get_srcset"),
  };

  test("should generate srcset local image file", async () => {
    const result = await getSrcset(testImagePath, baseOptions);
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
