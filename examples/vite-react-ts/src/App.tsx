import { preview } from "@nocojs/client";
import { useState } from "react";
import "./App.css";

const images = [
  {
    preview: preview(
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4"
    ),
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b"
    ),
    src: "https://images.unsplash.com/photo-1518837695005-2083093ee35b",
  },
  {
    preview: preview(
      "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5"
    ),
    src: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5",
  },
];

function App() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="App">
      <div className="image-gallery">
        {images.map((image) => (
          <img
            key={image.src}
            src={hovered === image.src ? image.src : image.preview}
            alt=""
            onMouseEnter={() => setHovered(image.src)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
