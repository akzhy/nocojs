import { describe, expect, test } from "vitest";
import { Transformer } from "../src/transform";
import {
  defaultTransformOptions,
  getCacheFileDirName,
  getInput,
} from "./utils";

describe("Caching should work as expected", async () => {
  const logs: Record<string, string[]> = {};

  const originalLog = console.log;
  console.log = (...args) => {
    const currentTestName = expect.getState().currentTestName ?? "default";
    logs[currentTestName] = logs[currentTestName] || [];
    logs[currentTestName].push(args.join(" "));
    originalLog(...args);
  };

  test("no cache is working", async () => {
    const currentTestName = expect.getState().currentTestName ?? "default";

    const cacheFileDir = getCacheFileDirName();
    const input = getInput({
      url: "/good_boy.avif",
      previewOptions: {
        cache: false,
      },
    });

    const t1 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: "normal",
    });
    await t1.preTransform();
    await t1.transform(input, "index.ts");
    await t1.postTransform();

    const t2 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: "normal",
    });
    await t2.preTransform();
    await t2.transform(input, "index.ts");
    await t2.postTransform();

    expect(
      logs[currentTestName].filter((log) => log.includes("Cache hit")).length
    ).toBe(1);
  });

  // Currently this doesn't work
  // Could update it later by adding an intermediate cached state
  test.skip("immediate cache hit", async () => {
    const currentTestName = expect.getState().currentTestName ?? "default";

    const multiInput = getInput([
      { url: "/good_boy.avif" },
      { url: "/good_boy.avif" },
    ]);

    const t1 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
    });
    await t1.preTransform();
    await t1.transform(multiInput, "index.ts");
    await t1.postTransform();

    const cacheHits = logs[currentTestName].filter((log) =>
      log.includes("Cache hit")
    ).length;
    expect(cacheHits).toBe(1);
  });

  test("cache ignored if preview options change", async () => {
    const currentTestName = expect.getState().currentTestName ?? "default";
    const cacheFileDir = getCacheFileDirName();

    const input = getInput({
      url: "/good_boy.avif",
    });
    const t1 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "normal",
      cacheFileDir,
      cache: false,
    });
    await t1.preTransform();
    await t1.transform(input, "index.ts");
    await t1.postTransform();

    const t2 = new Transformer({
      ...defaultTransformOptions,
      cacheFileDir,
      placeholderType: "dominant-color",
    });
    await t2.preTransform();
    await t2.transform(input, "index.ts");
    await t2.postTransform();

    const t3 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "average-color",
      cacheFileDir,
    });
    await t3.preTransform();
    await t3.transform(input, "index.ts");
    await t3.postTransform();


    const t4 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "average-color",
      width: 10,
      cacheFileDir,
    });

    await t4.preTransform();
    await t4.transform(input, "index.ts");
    await t4.postTransform();


    const t5 = new Transformer({
      ...defaultTransformOptions,
      placeholderType: "average-color",
      width: 10,
      height: 10,
      cacheFileDir,
    });
    await t5.preTransform();
    await t5.transform(input, "index.ts");
    await t5.postTransform();

    const cacheHits = logs[currentTestName]?.filter((log) =>
      log.includes("Cache hit")
    ).length ?? 0;
    expect(cacheHits).toBe(0);
  });
});
