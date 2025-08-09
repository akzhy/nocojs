// Basic example of how to use the plugin in a JavaScript project
import { preview } from "@nocojs/client";
// src/main.js
console.log("Starting application...");

// Example component that uses images
function createImageGallery() {
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

  const gallery = document.createElement("div");
  gallery.className = "image-gallery";

  images.forEach((image, index) => {
    const img = document.createElement("img");
    img.src = image.preview;
    img.alt = `Gallery image ${index + 1}`;
    img.style.width = "300px";
    img.style.height = "200px";
    img.style.objectFit = "cover";
    img.style.margin = "10px";
    img.dataset.src = image.src;

    img.addEventListener("mouseenter", (e) => {
      const target = e.target as HTMLImageElement;
      if (target.dataset.src) {
        const temp = target.dataset.src;
        target.dataset.src = target.src; // Swap src to preview
        target.src = temp;
      }
    });

    img.addEventListener('mouseleave', (e) => {
      const target = e.target as HTMLImageElement;
      if (target.dataset.src) {
        const temp = target.dataset.src;
        target.dataset.src = target.src;
        target.src = temp;
      }
    });

    gallery.appendChild(img);
  });

  return gallery;
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  if (app) {
    const gallery = createImageGallery();
    app.appendChild(gallery);
  }
});

export { createImageGallery };
