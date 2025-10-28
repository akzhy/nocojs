import type { PlaceholderOptions } from "@nocojs/core";

// biome-ignore lint/correctness/noUnusedFunctionParameters: Options used by consumer
const placeholder = (url: string, options?: PlaceholderOptions): string => url;

export { placeholder };
