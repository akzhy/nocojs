import { getSharpInstance } from "./image";

export type PlaceholderImageType =
  | "normal"
  | "blurred"
  | "grayscale"
  | "dominant-color"
  | "average-color"
  | "transparent";

export interface PlaceholderOptions {
  placeholderType?: PlaceholderImageType;
  replaceFunctionCall?: boolean;
  cache?: boolean;
  width?: number;
  height?: number;
  wrapWithSvg?: boolean;
}

export interface GetPlaceholderImageResult {
  placeholder: string;
  originalWidth: number;
  originalHeight: number;
  placeholderPng?: string;
}

export const getPlaceholderImage = async (
  url: string,
  options: PlaceholderOptions
): Promise<GetPlaceholderImageResult> => {
  const sharpInstance = await getSharpInstance(url);
  const metadata = await sharpInstance.metadata();

  const targetWidth = options?.width ?? 12;
  const targetHeight = options?.height;

  if (options.placeholderType === "dominant-color") {
    const stats = await sharpInstance.stats();

    const { r, g, b } = stats.dominant;

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${metadata.width} ${metadata.height}' width='${metadata.width}' height='${metadata.height}'><rect width='100%' height='100%' fill='rgb(${r}, ${g}, ${b})'/></svg>`;

    return {
      placeholder: `data:image/svg+xml;base64,${Buffer.from(svg).toString(
        "base64"
      )}`,
      originalWidth: metadata.width || 0,
      originalHeight: metadata.height || 0,
    };
  } else if (options.placeholderType === "average-color") {
    const stats = await sharpInstance.stats();
    const r = Math.round(stats.channels[0].mean);
    const g = Math.round(stats.channels[1].mean);
    const b = Math.round(stats.channels[2].mean);

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${metadata.width} ${metadata.height}' width='${metadata.width}' height='${metadata.height}'><rect width='100%' height='100%' fill='rgb(${r}, ${g}, ${b})'/></svg>`;
    return {
      placeholder: `data:image/svg+xml;base64,${Buffer.from(svg).toString(
        "base64"
      )}`,
      originalWidth: metadata.width || 0,
      originalHeight: metadata.height || 0,
    };
  } else if (options.placeholderType === "transparent") {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${metadata.width} ${metadata.height}' width='${metadata.width}' height='${metadata.height}'><rect width='100%' height='100%' fill='transparent'/></svg>`;
    return {
      placeholder: `data:image/svg+xml;base64,${Buffer.from(svg).toString(
        "base64"
      )}`,
      originalWidth: metadata.width || 0,
      originalHeight: metadata.height || 0,
    };
  }

  sharpInstance.resize(targetWidth, targetHeight);

  if (options.placeholderType === "grayscale") {
    sharpInstance.grayscale();
  }

  const buffer = await sharpInstance.png({ quality: 80 }).toBuffer();
  const base64 = buffer.toString("base64");

  if (options.placeholderType === "blurred") {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${
      metadata.width
    } ${metadata.height}' width='${metadata.width}' height='${
      metadata.height
    }'><filter id='b' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='${Math.round(
      metadata.width * 0.05
    )}'/><feColorMatrix values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1' result='s'/><feFlood x='0' y='0' width='100%' height='100%'/><feComposite operator='out' in='s'/><feComposite in2='SourceGraphic'/><feGaussianBlur stdDeviation='${Math.round(
      metadata.width * 0.05
    )}'/></filter><image width='100%' height='100%' x='0' y='0' preserveAspectRatio='none' style='filter: url(#b);' href='data:image/png;base64,${base64}'/></svg>`;

    return {
      placeholder: `data:image/svg+xml;base64,${Buffer.from(svg).toString(
        "base64"
      )}`,
      originalWidth: metadata.width || 0,
      originalHeight: metadata.height || 0,
    };
  }

  if (options.wrapWithSvg) {
    return {
      placeholder: wrapWithSvg(
        `data:image/png;base64,${base64}`,
        metadata.width,
        metadata.height
      ),
      placeholderPng: `data:image/png;base64,${base64}`,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
    };
  }

  const placeholder = `data:image/png;base64,${base64}`;
  return {
    placeholder,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
  };
};

export const wrapWithSvg = (base64: string, width: number, height: number) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width}' height='${height}'><image href='${base64}' width='${width}' height='${height}'/></svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

export const shouldWrapWithSvg = (options: PlaceholderOptions) => {
  return (
    (options.wrapWithSvg ?? true) &&
    ["normal", "grayscale"].includes(options.placeholderType || "blurred")
  );
};
