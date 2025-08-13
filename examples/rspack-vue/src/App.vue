<script setup lang="ts">
import { preview } from '@nocojs/client';
import { ref } from 'vue';

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

const hovered = ref<string | null>(null);
</script>

<template>
  <div class="image-gallery">
    <img
      v-for="image in images"
      :key="image.src"
      :src="hovered === image.src ? image.src : image.preview"
      @mouseover="hovered = image.src"
      @mouseleave="hovered = null"
    />
  </div>
</template>

<style scoped>
.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.image-gallery img {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  width: 500px;
  max-width: 500px;
}

.image-gallery img:hover {
  transform: scale(1.05);
}
</style>
