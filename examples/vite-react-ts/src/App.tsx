import "./App.css";
import { PlaceholderAverageColorType } from "./components/placeholder-average-color";
import { PlaceholderBlurredType } from "./components/placeholder-blurred";
import { PlaceholderDominantColorType } from "./components/placeholder-dominant-color";
import { PlaceholderGrayscaleType } from "./components/placeholder-grayscale";
import { PlaceholderNoSvgWrap } from "./components/placeholder-no-svg-wrap";
import { PlaceholderNormalType } from "./components/placeholder-normal";

function App() {
  return (
    <div className="App">
      <h1>nocojs</h1>
      <a
        href="https://github.com/akzhy/nocojs"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
      </a>
      <p>Hover over the image to reveal the actual image.</p>
      <PlaceholderNormalType />
      <PlaceholderBlurredType />
      <PlaceholderGrayscaleType />
      <PlaceholderDominantColorType />
      <PlaceholderAverageColorType />
      <PlaceholderNoSvgWrap />
    </div>
  );
}

export default App;
