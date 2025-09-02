import { describe, it, expect, vi, beforeEach } from "vitest";
import { rollupNocoPlugin } from "../index";

// Mock the @nocojs/core module
vi.mock("@nocojs/core", () => ({
  transform: vi.fn(),
}));

describe("rollupNocoPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a plugin with correct name", () => {
    const plugin = rollupNocoPlugin();
    expect(plugin.name).toBe("@nocojs/rollup-plugin");
  });

  it("should have a transform method", () => {
    const plugin = rollupNocoPlugin();
    expect(plugin.transform).toBeDefined();
    expect(typeof plugin.transform).toBe("function");
  });

  it("should use default options when none provided", () => {
    const plugin = rollupNocoPlugin();
    expect(plugin).toBeDefined();
  });

  it("should accept custom options", () => {
    const customOptions = {
      publicDir: "assets",
      cacheFileDir: ".cache",
      logLevel: "verbose" as const,
    };

    const plugin = rollupNocoPlugin(customOptions);
    expect(plugin).toBeDefined();
  });

  it("should skip processing for excluded file extensions", async () => {
    const { transform } = await import("@nocojs/core");
    const mockTransform = transform as any;

    const plugin = rollupNocoPlugin();
    const transformFn = plugin.transform as Function;
    const result = await transformFn.call(
      {},
      'console.log("test")',
      "test.txt"
    );

    expect(result).toBeNull();
    expect(mockTransform).not.toHaveBeenCalled();
  });

  it("should skip processing for files in node_modules", async () => {
    const { transform } = await import("@nocojs/core");
    const mockTransform = transform as any;

    const plugin = rollupNocoPlugin();
    const transformFn = plugin.transform as Function;
    const result = await transformFn.call(
      {},
      'console.log("test")',
      "/path/to/node_modules/package/index.js"
    );

    expect(result).toBeNull();
    expect(mockTransform).not.toHaveBeenCalled();
  });

  it("should process files matching glob patterns", async () => {
    const { transform } = await import("@nocojs/core");
    const mockTransform = transform as any;
    mockTransform.mockResolvedValue({
      code: "transformed code",
      map: "source map",
      logs: [],
    });

    const plugin = rollupNocoPlugin({
      include: ["**/src/**/*.{ts,js}"],
      exclude: ["**/node_modules/**"],
    });
    const transformFn = plugin.transform as Function;

    // Should process files matching the pattern
    const result1 = await transformFn.call(
      {},
      'console.log("test")',
      "/project/src/components/Button.ts"
    );
    expect(result1).toEqual({
      code: "transformed code",
      map: "source map",
    });

    // Should skip files not matching the pattern
    const result2 = await transformFn.call(
      {},
      'console.log("test")',
      "/project/dist/bundle.js"
    );
    expect(result2).toBeNull();
  });

  it("should process included file extensions", async () => {
    const { transform } = await import("@nocojs/core");
    const mockTransform = transform as any;
    mockTransform.mockResolvedValue({
      code: "transformed code",
      map: "source map",
      logs: [],
    });

    const plugin = rollupNocoPlugin();
    const transformFn = plugin.transform as Function;
    const result = await transformFn.call({}, 'console.log("test")', "test.js");

    expect(mockTransform).toHaveBeenCalledWith(
      'console.log("test")',
      "test.js",
      expect.objectContaining({
        publicDir: expect.stringContaining("public"),
        cacheFileDir: expect.stringContaining(".nocojs"),
      })
    );

    expect(result).toEqual({
      code: "transformed code",
      map: "source map",
    });
  });

  it("should handle transformation errors gracefully", async () => {
    const { transform } = await import("@nocojs/core");
    const mockTransform = transform as any;
    mockTransform.mockRejectedValue(new Error("Transform failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const plugin = rollupNocoPlugin();
    const transformFn = plugin.transform as Function;
    const result = await transformFn.call({}, 'console.log("test")', "test.js");

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[@nocojs/rollup-plugin] Error processing test.js:"
      ),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
