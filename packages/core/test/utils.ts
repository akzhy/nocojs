import path from "node:path";
import { parseSync, Visitor } from "oxc-parser";
import sharp from "sharp";
import { expect } from "vitest";
import type { PlaceholderOptions } from "../src/placeholder-image";
import type { TransformOptions } from "../src/transform";

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export const defaultTransformOptions: WithRequired<
  TransformOptions,
  "cacheFileDir" | "publicDir" | "logLevel"
> = {
  cacheFileDir: path.join(import.meta.dirname, ".cache"),
  publicDir: path.join(import.meta.dirname, "public"),
  logLevel: "debug",
};

interface GetInputProps {
  url?: string;
  previewOptions?: PlaceholderOptions;
}

export const getInput = (props?: GetInputProps | GetInputProps[]): string => {
  if (Array.isArray(props)) {
    const placeholderStatements = props
      .map((prop, i) => {
        const placeholderOptions = prop?.previewOptions
          ? `, ${JSON.stringify(prop.previewOptions)}`
          : "";
        const url =
          prop?.url ||
          "https://raw.githubusercontent.com/akzhy/nocojs/refs/heads/master/packages/core/__test__/public/good_boy_4x5.jpg";

        return `const img${i} = placeholder("${url}"${placeholderOptions});`;
      })
      .join("\n");

    return `import { placeholder } from 'nocojs/client';

${placeholderStatements}`;
  }

  const placeholderOptions = props?.previewOptions
    ? `, ${JSON.stringify(props.previewOptions)}`
    : "";
  const url =
    props?.url ||
    "https://raw.githubusercontent.com/akzhy/nocojs/refs/heads/master/packages/core/__test__/public/good_boy_4x5.jpg";

  return `import { placeholder } from 'nocojs/client';

const img = placeholder("${url}"${placeholderOptions});`;
};

export const base64ToSharpImage = (base64: string) => {
  if (base64.startsWith("data:image/svg+xml;")) {
    const base64Data = base64.substring("data:image/svg+xml;base64,".length);
    const buffer = Buffer.from(base64Data, "base64");
    return sharp(buffer);
  }

  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  return sharp(buffer);
};

export const numbersAreWithinPercent = (
  num1: number,
  num2: number,
  percent: number,
) => {
  const diff = Math.abs(num1 - num2);
  const max = Math.max(Math.abs(num1), Math.abs(num2));
  return diff <= (percent / 100) * max;
};

export const getDominantColor = async (image: sharp.Sharp) => {
  const { dominant } = await image.stats();
  return {
    rgb: dominant,
    string: `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`,
  };
};

export async function isImageSingleColor(
  sharpInstance: sharp.Sharp,
): Promise<boolean> {
  const { data, info } = await sharpInstance
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelValue = Array.from(data.subarray(0, info.channels));

  for (let i = 0; i < data.length; i += info.channels) {
    for (let c = 0; c < info.channels; c++) {
      if (data[i + c] !== pixelValue[c]) {
        return false;
      }
    }
  }
  return true;
}

export async function isFullyTransparent(sharpInstance: sharp.Sharp) {
  const { data, info } = await sharpInstance
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const alphaIndex = channels - 1;

  for (let i = alphaIndex; i < data.length; i += channels) {
    if (data[i] !== 0) {
      return false;
    }
  }
  return true;
}

export const checkPreviewImage = (code: string): boolean => {
  const imageSrc = code.match(/const img\d*\s*=\s*"(.*?)";/);
  if (!imageSrc) {
    return false;
  }

  return imageSrc[1].startsWith("data:image");
};

export const getCacheFileDirName = (randomize = false) => {
  return (
    path.join(
      defaultTransformOptions.cacheFileDir,
      expect
        .getState()
        .currentTestName?.replaceAll(" ", "_")
        ?.replaceAll(">", "_") ?? "default",
    ) + (randomize ? `_${Date.now()}` : "")
  );
};

export interface ImageAssignment {
  identifier: string;
  value: string;
}

export const getImageAssignments = (code: string): ImageAssignment[] => {
  return Array.from(
    code.matchAll(/const\s+(img\d*)\s*=\s*"(.*?)";/g),
    ([, identifier, value]) => ({
      identifier,
      value,
    }),
  );
};

export const extractImageSource = (code: string): string => {
  const assignments = getImageAssignments(code);
  if (assignments.length === 0) {
    throw new Error("Placeholder assignment not found");
  }

  return assignments[0].value;
};

export const getDataUriFromCode = (code: string): string => {
  const dataUri = extractImageSource(code);
  if (!dataUri.startsWith("data:image")) {
    throw new Error("Expected placeholder to be a data URI");
  }

  return dataUri;
};

export const decodeDataUri = (dataUri: string): string => {
  const commaIndex = dataUri.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid data URI");
  }

  return Buffer.from(dataUri.slice(commaIndex + 1), "base64").toString("utf8");
};

export const ensureSingleColorImage = async (dataUri: string) => {
  const sharpInstance = base64ToSharpImage(dataUri);
  const solidColor = await isImageSingleColor(sharpInstance);
  expect(solidColor).toBe(true);
};

export const ensureGrayscaleImage = async (dataUri: string) => {
  const sharpInstance = base64ToSharpImage(dataUri);
  const { data, info } = await sharpInstance
    .png()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels || 1;
  let isGrayscale = true;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? g;
    if (!(r === g && g === b)) {
      isGrayscale = false;
      break;
    }
  }

  expect(isGrayscale).toBe(true);
};

export const ensureTransparentImage = async (dataUri: string) => {
  const sharpInstance = base64ToSharpImage(dataUri);
  const transparent = await isFullyTransparent(sharpInstance);
  expect(transparent).toBe(true);
};

export function verifyPlaceholderCall(code: string) {
  const parsed = parseSync("verify-preview-call.ts", code);

  let found = false;
  let imageUpdated = false;

  const visitor = new Visitor({
    CallExpression: (node) => {
      if (found) {
        return;
      }

      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "placeholder"
      ) {
        found = true;
        const firstArg = node.arguments[0];

        if (firstArg && firstArg.type === "Literal") {
          const literalValue = firstArg.value;

          if (
            typeof literalValue === "string" &&
            literalValue.startsWith("data:")
          ) {
            imageUpdated = true;
          }
        }
      }
    },
  });

  visitor.visit(parsed.program);

  return {
    found,
    imageUpdated,
  };
}
