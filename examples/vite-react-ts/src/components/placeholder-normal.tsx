import { preview } from "@nocojs/client";
import { PreviewImage } from "./image";

const images = [
  {
    preview: preview("/mountain-lake.jpg"),
    src: "/mountain-lake.jpg",
    source:
      "https://unsplash.com/photos/lake-near-mountain-range-under-blue-sky-during-daytime-KZ0SZ2fEd20",
  },
  {
    preview: preview("/yellow-lines.jpg"),
    src: "/yellow-lines.jpg",
    source:
      "https://unsplash.com/photos/yellow-line-on-gray-asphalt-road-eUjT8kweNlg",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1559511331-6a3a4e72f588?q=80&w=2747&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    ),
    src: "https://images.unsplash.com/photo-1559511331-6a3a4e72f588?q=80&w=2747&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    source: "https://unsplash.com/photos/boats-on-harbor-y5q_e7b7LJ0",
  },
];

export const PlaceholderNormalType = () => {
  return (
    <div className="section">
      <h2>
        Placeholder type: <code>normal</code>
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
