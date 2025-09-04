import { preview } from "@nocojs/client";
import { PreviewImage } from "./image";

const images = [
  {
    preview: preview(
      "https://images.unsplash.com/photo-1754901350480-c0fdd1a427b4?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "blurred",
      }
    ),
    src: "https://images.unsplash.com/photo-1754901350480-c0fdd1a427b4?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/waves-gently-wash-over-a-sandy-beach-with-rocks-TEWLhkplCOo",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1754905021202-9f143b2527fc?q=80&w=2543&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "blurred",
      }
    ),
    src: "https://images.unsplash.com/photo-1754905021202-9f143b2527fc?q=80&w=2543&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/sparklers-create-a-dazzling-light-display-at-night-2qjPlJKnZ6M",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1754765297352-c63d9713895d?q=80&w=2654&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      {
        placeholderType: "blurred",
      }
    ),
    src: "https://images.unsplash.com/photo-1754765297352-c63d9713895d?q=80&w=2654&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source:
      "https://unsplash.com/photos/modern-white-buildings-against-a-bright-blue-sky-9VwX8GLnjOA",
  },
];

export const PlaceholderBlurredType = () => {
  return (
    <div className="section">
      <h2>
        Placeholder type: <code>blurred</code>
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
    </div>
  );
};
