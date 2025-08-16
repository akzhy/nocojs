import { preview } from "@nocojs/client";
import { PreviewImage } from "./image";

const images = [
  {
    preview: preview(
      "https://images.unsplash.com/photo-1755216007736-9920ec4d07f3?q=80&w=2575&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "average-color",
      }
    ),
    src: "https://images.unsplash.com/photo-1755216007736-9920ec4d07f3?q=80&w=2575&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/surfers-ride-a-large-wave-in-the-ocean-BVyzjR1AcOI",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1754901350791-04eff8b6289c?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "average-color",
      }
    ),
    src: "https://images.unsplash.com/photo-1754901350791-04eff8b6289c?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/tall-thin-structures-against-a-blue-sky-with-clouds-wKdWb9j2BIg",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1755004609166-f20e6ecd22c4?q=80&w=2573&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "average-color",
      }
    ),
    src: "https://images.unsplash.com/photo-1755004609166-f20e6ecd22c4?q=80&w=2573&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/close-up-of-vibrant-green-fern-leaves-in-soft-light-bYiJojtkHnc",
  },
];

export const PlaceholderAverageColorType = () => {
  return (
    <div className="section">
      <h2>
        Placeholder type: <code>average-color</code>
      </h2>
      <div className="items-row placeholder-average-color-type">
        {images.map((image) => (
          <div className="item" key={image.src}>
            <PreviewImage
              placeholder={image.preview}
              actualSrc={image.src}
              imageSource={image.source}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
