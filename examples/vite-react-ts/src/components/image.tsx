import { useEffect, useState, type ImgHTMLAttributes } from "react";

export const PreviewImage = ({
  actualSrc,
  placeholder,
  imageSource,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  placeholder: string;
  actualSrc: string;
  imageSource?: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.src = actualSrc;
    image.onload = () => setLoaded(true);
  }, []);

  return (
    <div className="preview-image-container">
      <img
        {...props}
        src={hovered && loaded ? actualSrc : placeholder}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {hovered && !loaded && (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      )}
      {imageSource && (
        <div className="image-source">
          <a href={imageSource} target="_blank" rel="noopener noreferrer">
            Image Source
          </a>
        </div>
      )}
    </div>
  );
};
