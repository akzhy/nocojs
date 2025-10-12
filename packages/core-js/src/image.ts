import sharp from "sharp";

export const getSharpInstance = async (
  urlOrPath: string
): Promise<sharp.Sharp> => {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    if (!isValidUrl(urlOrPath)) {
      throw new Error(`Invalid URL: ${urlOrPath}`);
    }
    const response = await fetch(urlOrPath);
    const buffer = await response.arrayBuffer();
    const image = sharp(Buffer.from(buffer));
    return image;
  } else {
    const image = sharp(urlOrPath);
    return image;
  }
};

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
