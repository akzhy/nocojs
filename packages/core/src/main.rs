mod transform;
mod placeholder_image;
use std::time::Instant;
use transform::{transform, TransformOptions};

#[tokio::main]
async fn main() {
  let start = Instant::now();

  let options = TransformOptions {
    code: r#"import React from 'react';
import { preview } from 'laaazy';

const App = () => {
  return (
    <div>
      <h1>My Image</h1>
      <img
        src={preview("https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=2355&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")}
        alt="A description of the image"
      />
    </div>
  );
};

export default App;"#.to_string(),
    file_path: "TestCase.tsx".to_string(),
    placeholder_image_kind: Some(placeholder_image::PlaceholderImageOutputKind::AverageColor),
    replace_function_call: Some(true),
  };

  
  if let Some(result) = transform(options).await {
    let duration = start.elapsed();
    println!("Transformed code:\n{}", result.code);
    println!("Transformation took: {:?}", duration);
  } else {
    println!("Transformation failed or skipped.");
  }
}
