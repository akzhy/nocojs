import path from 'path';
import { TransformOptions } from '..';
import { PreviewOptions } from '..';
import sharp from 'sharp';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export const defaultTransformOptions: TransformOptions = {
  cacheFileDir: path.join(import.meta.dirname, '.cache'),
  publicDir: path.join(import.meta.dirname, 'public'),
  logLevel: 'verbose',
};

interface GetInputProps {
  url?: string;
  previewOptions?: PreviewOptions;
}

export const getInput = (props?: GetInputProps | GetInputProps[]): string => {
  if (Array.isArray(props)) {
    const previewStatements = props
      .map((prop, i) => {
        const previewOptions = prop?.previewOptions ? `, ${JSON.stringify(prop.previewOptions)}` : '';
        const url = prop?.url || 'https://picsum.photos/id/237/200/300';

        return `const img${i} = preview("${url}"${previewOptions});`;
      })
      .join('\n');

    return `import { preview } from '@nocojs/client';

${previewStatements}`;
  }

  const previewOptions = props?.previewOptions ? `, ${JSON.stringify(props.previewOptions)}` : '';
  const url = props?.url || 'https://picsum.photos/id/237/200/300';

  return `import { preview } from '@nocojs/client';

let img = preview("${url}"${previewOptions});`;
};

export const base64ToSharpImage = (base64: string) => {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  return sharp(buffer);
};

export const numbersAreWithinPercent = (num1: number, num2: number, percent: number) => {
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

export async function isImageSingleColor(sharpInstance: sharp.Sharp): Promise<boolean> {
  const { data, info } = await sharpInstance
    .clone()
    .resize(1, 1, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelValue = Array.from(data);

  const { data: originalData } = await sharpInstance.clone().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < originalData.length; i += info.channels) {
    for (let c = 0; c < info.channels; c++) {
      if (originalData[i + c] !== pixelValue[c]) {
        return false;
      }
    }
  }
  return true;
}

export async function isFullyTransparent(sharpInstance: sharp.Sharp) {
  const { data, info } = await sharpInstance.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const alphaIndex = channels - 1;

  for (let i = alphaIndex; i < data.length; i += channels) {
    if (data[i] !== 0) {
      return false;
    }
  }
  return true;
}

export function verifyPreviewCall(code: string) {
  const ast = parse(code, {
    sourceType: 'module', // or "script" if not ESM
    plugins: ['jsx', 'typescript'], // add if needed
  });

  let found = false;
  let imageUpdated = false;

  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      if (callee.type === 'Identifier' && callee.name === 'preview') {
        found = true;
        const args = path.node.arguments;
        const firstArg = args[0];

        if (firstArg.type === 'StringLiteral' && firstArg.value.startsWith('data:')) {
          imageUpdated = true;
        }

        path.stop(); // Stop early
      }
    },
  });

  return {
    found,
    imageUpdated,
  };
}
