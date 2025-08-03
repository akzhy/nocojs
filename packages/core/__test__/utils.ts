import path from "path";
import { TransformOptions } from "..";
import { PreviewOptions } from "..";

export const defaultTransformOptions: TransformOptions = {
  cacheFileDir: path.join(import.meta.dirname, '.cache'),
}

interface GetInputProps {
  previewOptions?: PreviewOptions;
}

export const getInput = (props?: GetInputProps) => {
  const previewOptions = props?.previewOptions ? `, ${JSON.stringify(props.previewOptions)}` : '';
  return `import { preview } from 'nocojs';

let img = preview("https://picsum.photos/id/237/200/300"${previewOptions});`;
};
