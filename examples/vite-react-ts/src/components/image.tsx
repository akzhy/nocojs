import { type ImgHTMLAttributes } from "react";

export const PreviewImage = ({
  src,
  placeholder,
  imageSource,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  placeholder: string;
  imageSource?: string;
}) => {
  return (
    <div className="preview-image-container">
      <div className="image-container">
        <img src={placeholder} className="placeholder-image" />
        <img
          src={src}
          {...props}
          className={["main-image", props.className].join(" ")}
          loading="lazy"
        />
      </div>
      <div className="image-source">
        <a href={imageSource} target="_blank" rel="noopener noreferrer">
          Image Source
        </a>
      </div>
    </div>
  );
};
