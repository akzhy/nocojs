<script lang="ts">
  import { preview } from "@nocojs/client";

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

  let hovered = $state<null | string>(null);
</script>

<main>
  <div class="image-gallery">
    {#each images as image}
      <img
        src={hovered === image.src ? image.src : image.preview}
        alt=""
        onmouseenter={() => (hovered = image.src)}
        onmouseleave={() => (hovered = null)}
      />
    {/each}
  </div>
</main>

<style>
  .image-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }

  .image-gallery img {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    width: 500px;
    max-width: 500px;
    object-fit: cover;
  }

</style>
