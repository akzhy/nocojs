import path from "node:path";
import { describe, expect, test } from "vitest";
import {
  type GetPlaceholderOptions,
  getPlaceholder,
} from "../src/get-placeholder";
import { defaultTransformOptions, type WithRequired } from "./utils";

describe("getPlaceholder function tests", () => {
  const testImagePath = path.join(
    // biome-ignore lint/style/noNonNullAssertion: Value defined
    defaultTransformOptions.publicDir!,
    "good_boy_4x5.jpg",
  );
  const baseOptions: WithRequired<GetPlaceholderOptions, "cacheFileDir"> = {
    cacheFileDir: path.join(
      // biome-ignore lint/style/noNonNullAssertion: Value defined
      defaultTransformOptions.cacheFileDir!,
      "get_placeholder",
    ),
  };

  describe("Basic functionality", () => {
    test("should generate placeholder for local image file", async () => {
      const result = await getPlaceholder(testImagePath, baseOptions);
      expect(result).toBeDefined();
      expect(result.placeholder).toBeDefined();
      expect(typeof result.placeholder).toBe("string");
      expect(result.placeholder).toMatch(/^data:image/);
    });

    test("should generate placeholder for HTTP URL", async () => {
      const httpUrl =
        "https://raw.githubusercontent.com/akzhy/nocojs/refs/heads/master/packages/core/__test__/public/good_boy_4x5.jpg";
      const result = await getPlaceholder(httpUrl, baseOptions);

      expect(result).toBeDefined();
      expect(result.placeholder).toBeDefined();
      expect(typeof result.placeholder).toBe("string");
      expect(result.placeholder).toMatch(/^data:image/);
    });
  });

  describe("Caching", () => {
    const cacheFileDir = path.join(baseOptions.cacheFileDir, "cache_test");
    const options = {
      ...baseOptions,
      _enableLogging: true,
      cacheFileDir,
    };

    test("caching should work", async () => {
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.join(" "));
        originalLog(...args);
      };

      const result = await getPlaceholder(testImagePath, options);
      expect(result).toBeDefined();
      expect(result.placeholder).toMatch(/^data:image/);

      const cachedResult = await getPlaceholder(testImagePath, options);
      expect(cachedResult).toBeDefined();
      expect(cachedResult.placeholder).toBe(result.placeholder);
      expect(logs.filter((log) => log.includes("Cache hit")).length).toBe(1);
    });
  });

  describe("Error handling", () => {
    test("should handle non-existent local file", async () => {
      const nonExistentPath = "/non-existent.jpg";

      await expect(
        getPlaceholder(nonExistentPath, baseOptions),
      ).rejects.toThrow();
    });

    test("should handle invalid URL", async () => {
      const invalidUrl = "https://example.com/non-existent-image.jpg";

      await expect(getPlaceholder(invalidUrl, baseOptions)).rejects.toThrow();
    });
  });
});
