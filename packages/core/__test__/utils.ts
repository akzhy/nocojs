import path from "path";
import { TransformOptions } from "..";
import { PreviewOptions } from "..";

export const defaultTransformOptions: TransformOptions = {
  cacheFileDir: path.join(import.meta.dirname, '.cache'),
  logLevel: 'verbose'
}

interface GetInputProps {
  url?: string;
  previewOptions?: PreviewOptions;
}

export const getInput = (props?: GetInputProps | GetInputProps[]) : string => {
  if (Array.isArray(props)) {
    const previewStatements = props.map((prop, i) => {
      const previewOptions = prop?.previewOptions ? `, ${JSON.stringify(prop.previewOptions)}` : '';
      const url = prop?.url || 'https://picsum.photos/id/237/200/300';
      
      return `const img${i} = preview("${url}"${previewOptions});`;
    }).join('\n');

    return `import { preview } from 'nocojs';

${previewStatements}`;
  }

  const previewOptions = props?.previewOptions ? `, ${JSON.stringify(props.previewOptions)}` : '';
  const url = props?.url || 'https://picsum.photos/id/237/200/300';

  return `import { preview } from 'nocojs';

let img = preview("${url}"${previewOptions});`;
};


export const numbersAreWithinPercent = (num1: number, num2: number, percent: number) =>{
  const diff = Math.abs(num1 - num2);
  const max = Math.max(Math.abs(num1), Math.abs(num2));
  return diff <= (percent / 100) * max;
}