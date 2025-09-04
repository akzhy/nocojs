import { preview } from "@nocojs/client";
import { PreviewImage } from "./image";

const images = [
  {
    preview: preview(
      "https://images.unsplash.com/photo-1638226917223-02aa2d5ea91c?q=80&w=2160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "dominant-color",
      }
    ),
    src: "https://images.unsplash.com/photo-1638226917223-02aa2d5ea91c?q=80&w=2160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/a-black-object-on-a-yellow-background-OjQurVkwzFU",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1517825738774-7de9363ef735?q=80&w=2610&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "dominant-color",
      }
    ),
    src: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?q=80&w=2610&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/grayscale-photo-of-leopard-9yvADFNcXOc",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "dominant-color",
      }
    ),
    src: "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/strawberry-ice-cream-on-cone-TLD6iCOlyb0",
  },
];

export const PlaceholderDominantColorType = () => {
  return (
    <div className="section">
      <h2>
        Placeholder type: <code>dominant-color</code>
      </h2>
      <div className="items-row placeholder-dominant-color-type">
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
