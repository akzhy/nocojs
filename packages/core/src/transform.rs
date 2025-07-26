use futures::{stream::FuturesUnordered, StreamExt};
use napi_derive::napi;
use once_cell::sync::Lazy;
use oxc::{
  allocator::{Allocator, Box as OxcBox},
  ast::{
    ast::{
      Argument, CallExpression, Expression, ImportDeclaration, ImportDeclarationSpecifier,
      ObjectPropertyKind, Program, PropertyKey, SourceType, StringLiteral,
    },
    AstBuilder, NONE,
  },
  ast_visit::{walk_mut, VisitMut},
  codegen::{Codegen, CodegenOptions},
  parser::{Parser, ParserReturn},
  semantic::{Scoping, SemanticBuilder, SymbolId},
};
use reqwest::Client;
use rusqlite::Connection;
use std::path::PathBuf;
use tokio::runtime::Runtime;
use tokio::task::JoinHandle;

use crate::placeholder_image::{self, download_and_process_image, PlaceholderImageOutputKind};

#[derive(PartialEq, Debug, Clone)]
enum Pass {
  First,
  Second,
}

const IMPORT_PATH: &str = "laaazy";

#[napi(object)]
#[derive(Clone)]
pub struct TransformOptions {
  pub code: String,
  pub file_path: String,
  pub placeholder_image_kind: Option<PlaceholderImageOutputKind>,
  pub replace_function_call: Option<bool>,
}

#[napi(object)]
pub struct TransformOutput {
  pub code: String,
  pub sourcemap: Option<String>,
}

#[napi(object)]
#[derive(Clone)]
pub struct PreviewOptions {
  pub width: Option<u32>,
  pub height: Option<u32>,
  pub output_kind: PlaceholderImageOutputKind,
  pub replace_function_call: bool,
}

impl PreviewOptions {
  pub fn default() -> Self {
    PreviewOptions {
      width: None,
      height: None,
      output_kind: PlaceholderImageOutputKind::Normal,
      replace_function_call: true,
    }
  }
}

pub struct SymbolStore {
  pub symbol_id: SymbolId,
  pub fn_id: u32,
}

// Create a global Tokio runtime
static TOKIO: Lazy<Runtime> = Lazy::new(|| {
  tokio::runtime::Builder::new_multi_thread()
    .enable_all()
    .build()
    .expect("Failed to build Tokio runtime")
});

static RUSQLITE_FILE_NAME: &str = "lazycache.db";

pub async fn transform(options: TransformOptions) -> Option<TransformOutput> {
  if !options.file_path.ends_with(".tsx") {
    return None;
  }

  let conn = Connection::open(RUSQLITE_FILE_NAME).unwrap();
  // Create a table
  conn
    .execute(
      "CREATE TABLE IF NOT EXISTS images (
          url     TEXT PRIMARY KEY,
          placeholder   TEXT NOT NULL
      )",
      [],
    )
    .unwrap();

  let allocator = Allocator::default();
  let source_type = SourceType::from_path(&options.file_path).unwrap();

  let sourcemap_file_path = options.file_path.clone().replace(".tsx", ".tsx.map");

  let ParserReturn { mut program, .. } =
    Parser::new(&allocator, &options.code, source_type).parse();

  let semantic_builder = SemanticBuilder::new().build(&program);

  let scoping = semantic_builder.semantic.into_scoping();

  let ast_builder = AstBuilder::new(&allocator);
  let mut symbold_ids_vec: Vec<SymbolStore> = vec![];
  let util_import_symbols: Vec<SymbolId> = vec![];
  let http_client = Client::new();
  let tokio_handles: Vec<JoinHandle<()>> = vec![];

  let mut tasks = FuturesUnordered::new();
  // Traverse the AST
  let mut visitor = TransformVisitor {
    allocator: &allocator,
    ast_builder,
    scoping: &scoping,
    identifier_symbol_ids: &mut symbold_ids_vec,
    pass: Pass::First,
    util_import_symbols,
    http_client,
    rusqlite_conn: conn,
    tokio_handles,
    tasks,
    options: options.clone(),
  };

  visitor.begin(&mut program).await;

  let codegen = Codegen::new();
  let codegen = codegen.with_options(CodegenOptions {
    source_map_path: Some(PathBuf::from(&sourcemap_file_path)),
    ..CodegenOptions::default()
  });
  let result = codegen.build(&program);

  let result_code: String = result.code;
  println!("Transformed result:\n{}", result_code);
  let sourcemap: Option<String> = {
    if result.map.is_some() {
      Some(result.map.unwrap().to_json_string())
    } else {
      None
    }
  };

  Some(TransformOutput {
    code: result_code,
    sourcemap: sourcemap,
  })
}

struct TransformVisitor<'a> {
  allocator: &'a Allocator,
  ast_builder: AstBuilder<'a>,
  scoping: &'a Scoping,
  identifier_symbol_ids: &'a mut Vec<SymbolStore>,
  util_import_symbols: Vec<SymbolId>,
  pass: Pass,
  http_client: Client,
  rusqlite_conn: Connection,
  tokio_handles: Vec<JoinHandle<()>>,
  tasks: FuturesUnordered<JoinHandle<()>>,
  options: TransformOptions,
}

impl<'a> TransformVisitor<'a> {
  async fn begin(&mut self, program: &mut Program<'a>) {
    self.visit_program(program);

    self.pass = Pass::Second;

    while let Some(result) = self.tasks.next().await {
      println!("Task completed: {:?}", result);
    }

    self.visit_program(program);
  }

  fn prepare_images_from_fn_call(
    &mut self,
    call: &mut OxcBox<'a, CallExpression<'a>>,
  ) -> Result<(), Box<dyn std::error::Error>> {
    let first_arg = &call.arguments.first();
    let user_options_arg = &call.arguments.get(1);

    let preview_options = self.get_preview_options_from_argument(user_options_arg);

    if let Some(image_url) = first_arg {
      if let Expression::StringLiteral(string_value) = image_url.as_expression().unwrap() {
        self.spawn_image_resize(string_value.value.to_string(), preview_options);
      }
    } else {
      return Err("No image URL provided in the function call".into());
    }

    return Ok(());
  }

  fn get_image_result_from_fn_call(
    &mut self,
    call: &mut OxcBox<'a, CallExpression<'a>>,
  ) -> Result<(String, PreviewOptions), Box<dyn std::error::Error>> {
    if let Some(first_arg) = call.arguments.first() {
      if let Expression::StringLiteral(string_value) = first_arg.as_expression().unwrap() {
        let image_url = string_value.value.to_string();

        let placeholder_image_url: Result<String, _> = self.rusqlite_conn.query_one(
          "SELECT placeholder FROM images WHERE url = ?",
          [image_url.clone()],
          |row| Ok(row.get(0)?),
        );

        if placeholder_image_url.is_ok() {
          let options = self.get_preview_options_from_argument(&call.arguments.get(1));
          return Ok((placeholder_image_url.unwrap(), options));
        } else {
          return Err(format!("Image not found in database: {}", image_url).into());
        }
      }
    }
    Err("No image URL provided in the function call".into())
  }

  fn get_preview_options_from_argument(&mut self, arg: &Option<&Argument<'a>>) -> PreviewOptions {
    let mut preview_options = PreviewOptions::default();

    if let Some(user_options_arg) = arg {
      if let Expression::ObjectExpression(object_expr) = user_options_arg.as_expression().unwrap() {
        object_expr.properties.iter().for_each(|prop| {
          if let ObjectPropertyKind::ObjectProperty(key_value) = prop {
            if let PropertyKey::StaticIdentifier(key) = &key_value.key {
              if key.name == "width" {
                if let Expression::NumericLiteral(numeric_literal) = &key_value.value {
                  preview_options.width = Some(numeric_literal.value as u32);
                }
              } else if key.name == "height" {
                if let Expression::NumericLiteral(numeric_literal) = &key_value.value {
                  preview_options.height = Some(numeric_literal.value as u32);
                }
              } else if key.name == "outputKind" {
                if let Expression::StringLiteral(string_literal) = &key_value.value {
                  preview_options.output_kind = match string_literal.value.as_str() {
                    "normal" => PlaceholderImageOutputKind::Normal,
                    "black-and-white" => PlaceholderImageOutputKind::BlackAndWhite,
                    "dominant-color" => PlaceholderImageOutputKind::DominantColor,
                    "transparent" => PlaceholderImageOutputKind::Transparent,
                    "average-color" => PlaceholderImageOutputKind::AverageColor,
                    _ => PlaceholderImageOutputKind::Normal,
                  };
                }
              } else if key.name == "replaceFunctionCall" {
                if let Expression::BooleanLiteral(boolean_literal) = &key_value.value {
                  preview_options.replace_function_call = boolean_literal.value;
                }
              }
            }
          }
        });
      }
    }

    preview_options
  }

  // fn update_string_expression(&mut self, string_value: &mut OxcBox<'a, StringLiteral<'a>>) {
  //   let image_url = string_value.value.to_string();

  //   println!("Updating string expression: {}", image_url);
  //   let placeholder_image_url: Result<String, _> = self.rusqlite_conn.query_one(
  //     "SELECT placeholder FROM images WHERE url = ?",
  //     [image_url.clone()],
  //     |row| Ok(row.get(0)?),
  //   );

  //   match self.pass {
  //     Pass::First => {
  //       if placeholder_image_url.is_err() {
  //         self.spawn_image_resize(image_url);
  //       }
  //     }
  //     Pass::Second => {
  //       if placeholder_image_url.is_ok() {
  //         let placeholder_image_url = placeholder_image_url.unwrap();
  //         let atom = self
  //           .ast_builder
  //           .atom(self.allocator.alloc_str(&placeholder_image_url));

  //         // Update the string literal value
  //         string_value.value = atom;
  //       }
  //     }
  //   }

  //   // let updated_class_names_str = self.get_updated_classname(&string_value.value);
  //   // let atom = self
  //   //   .ast_builder
  //   //   .atom(self.allocator.alloc_str(&updated_class_names_str));

  //   // // Update the string literal value
  //   // string_value.value = atom;
  // }

  fn spawn_image_resize(&mut self, url: String, options: PreviewOptions) {
    let client = self.http_client.clone();

    self.tasks.push(tokio::spawn(async move {
      match download_and_process_image(&client, &url, &options).await {
        Ok(image) => {
          println!("✅ Processed image: {}", image);
          let rusqlite_conn = Connection::open(RUSQLITE_FILE_NAME).unwrap();
          rusqlite_conn
            .execute(
              "INSERT INTO images (url, placeholder) VALUES (?, ?)",
              (url, image),
            )
            .unwrap();
          // Optionally: save to disk or update a shared cache
        }
        Err(e) => eprintln!("❌ Failed to process {}: {}", url, e),
      }
    }));
  }
}

impl<'a> VisitMut<'a> for TransformVisitor<'a> {
  fn visit_import_declaration(&mut self, it: &mut ImportDeclaration<'a>) {
    if it.source.value == IMPORT_PATH {
      it.specifiers
        .as_ref()
        .unwrap()
        .iter()
        .for_each(|specifier| {
          if let ImportDeclarationSpecifier::ImportSpecifier(import_specifier) = specifier {
            if import_specifier.local.name == "preview" {
              self
                .util_import_symbols
                .push(import_specifier.local.symbol_id());
            }
          }
        });
    }
    walk_mut::walk_import_declaration(self, it);
  }

  fn visit_expression(&mut self, expr: &mut Expression<'a>) {
    if let Expression::CallExpression(call) = expr {
      let mut replace = false;
      let mut placeholder_image_url: Option<String> = None;

      if let Expression::Identifier(identifier_calle) = &call.callee {
        let callee_ref = self.scoping.get_reference(identifier_calle.reference_id());
        let callee_symbol_id = callee_ref.symbol_id();
        if let Some(callee_symbol_id) = callee_symbol_id {
          if self.util_import_symbols.contains(&callee_symbol_id) {
            if self.pass == Pass::First {
              let _ = self.prepare_images_from_fn_call(call);
            } else {
              let check = self.get_image_result_from_fn_call(call);
              if check.is_ok() {
                let (url, options) = check.unwrap();
                placeholder_image_url = Some(url);
                replace = true;
              }
            }
          }
        }
      }

      if replace && placeholder_image_url.is_some() {
        let atom = self
          .ast_builder
          .atom(self.allocator.alloc_str(&placeholder_image_url.unwrap()));
        let lit = StringLiteral {
          value: atom,
          raw: None,
          span: call.span,
          lone_surrogates: false,
        };
        *expr = Expression::StringLiteral(OxcBox::new_in(lit, self.allocator));
      }
    }

    walk_mut::walk_expression(self, expr);
  }
}
