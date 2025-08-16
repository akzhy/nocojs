// Basic example of how to use the plugin in a JavaScript project
import { preview } from '@nocojs/client';
// src/main.js
console.log('Starting application...');

// Example component that uses images
function createImageGallery() {
  const images = [
    preview('https://images.unsplash.com/photo-1506905925346-21bda4d32df4'),
    preview('https://images.unsplash.com/photo-1518837695005-2083093ee35b'),
    preview('https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5')
  ];

  const gallery = document.createElement('div');
  gallery.className = 'image-gallery';

  images.forEach((src, index) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Gallery image ${index + 1}`;
    img.style.width = '300px';
    img.style.height = '200px';
    img.style.objectFit = 'cover';
    img.style.margin = '10px';
    
    gallery.appendChild(img);
  });

  return gallery;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    const gallery = createImageGallery();
    app.appendChild(gallery);
  }
});

export { createImageGallery };
