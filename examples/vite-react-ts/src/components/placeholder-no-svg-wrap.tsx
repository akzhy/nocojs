import { preview } from "@nocojs/client";
import { PreviewImage } from "./image";

const images = [
  {
    preview: preview(
      "https://images.unsplash.com/photo-1748615745898-a896dceae0c8?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        wrapWithSvg: false,
        placeholderType: "normal",
      }
    ),
    src: "https://images.unsplash.com/photo-1748615745898-a896dceae0c8?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/a-daisy-stands-out-against-a-yellow-background-C7X5ijG_-uM",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1701806244887-391677f29718?q=80&w=2664&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        wrapWithSvg: false,
        placeholderType: "grayscale",
      }
    ),
    src: "https://images.unsplash.com/photo-1701806244887-391677f29718?q=80&w=2664&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/a-white-sports-car-driving-down-the-road-YKF2FrwgGUE",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1750595132287-5a2368a7fdef?q=80&w=1476&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        wrapWithSvg: false,
        placeholderType: "dominant-color",
      }
    ),
    src: "https://images.unsplash.com/photo-1750595132287-5a2368a7fdef?q=80&w=1476&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/a-pink-lotus-flower-blooms-against-blue-4Cb8q7Ld5rs",
  },
];

export const PlaceholderNoSvgWrap = () => {
  return (
    <div className="section">
      <h2>
        With <code>wrapWithSvg: false</code>
      </h2>
      <div className="items-row placeholder-normal-type">
        {images.map((image) => (
          <div className="item" key={image.src}>
            <PreviewImage
              placeholder={image.preview}
              src={image.src}
              imageSource={image.source}
            />
          </div>
        ))}
      </div>
      <p
        style={{
          marginTop: "12px",
        }}
      >
        You may notice a small layout shift when hovering over some of the images. This
        is because its not possible to maintain the exact aspect ratio when the
        image is shrunk to small sizes. <code>wrapWithSvg</code> is set to true
        by default, which allows the placeholder to maintain the aspect ratio of
        the image. When set to false, it will not wrap the placeholder in an
        SVG, which can lead to layout shifts when the image is loaded.
      </p>
    </div>
  );
};
