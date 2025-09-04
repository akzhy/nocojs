import { preview } from "@nocojs/client";
import { PreviewImage } from "./image";

const images = [
  {
    preview: preview(
      "https://images.unsplash.com/photo-1754772512355-299e9c2b1b76?q=80&w=2653&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "grayscale",
      }
    ),
    src: "https://images.unsplash.com/photo-1754772512355-299e9c2b1b76?q=80&w=2653&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/a-young-deer-with-antlers-stands-in-a-field-eNjQmnaxUEg",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1583795128727-6ec3642408f8?q=80&w=2714&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "grayscale",
      }
    ),
    src: "https://images.unsplash.com/photo-1583795128727-6ec3642408f8?q=80&w=2714&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source: "https://unsplash.com/photos/brown-and-white-tabby-cat-mBRfYA0dYYE",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1520496938502-73e942d08cc3?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "grayscale",
      }
    ),
    src: "https://images.unsplash.com/photo-1520496938502-73e942d08cc3?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/brown-and-black-jazz-guitar-with-dim-light--KuyYQcnAbg",
  },
];

export const PlaceholderGrayscaleType = () => {
  return (
    <div className="section">
      <h2>
        Placeholder type: <code>grayscale</code>
      </h2>
      <div className="items-row placeholder-grayscale-type">
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
    </div>
  );
};
