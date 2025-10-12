export type PlaceholderImageType = "normal" | "blurred" | "grayscale" | "dominant-color" | "average-color" | "transparent";

export interface PreviewOptions {
  placeholderType?: PlaceholderImageType;
  replaceFunctionCall?: boolean;
  cache?: boolean;
  width?: number;
  height?: number;
  wrapWithSvg?: boolean;
}