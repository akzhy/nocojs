use futures::{stream::FuturesUnordered, StreamExt};
use napi_derive::napi;
use oxc::{
  allocator::{Allocator, Box as OxcBox},
  ast::{
    ast::{
      Argument, CallExpression, Expression, ImportDeclaration, ImportDeclarationSpecifier,
      ObjectPropertyKind, Program, PropertyKey, SourceType, StringLiteral,
    },
    AstBuilder,
  },
  ast_visit::{walk_mut, VisitMut},
  codegen::{Codegen, CodegenOptions},
  parser::{Parser, ParserReturn},
  semantic::{Scoping, SemanticBuilder, SymbolId},
};
use reqwest::Client;
use rusqlite::Connection;
use std::{
  collections::HashMap,
  path::PathBuf,
  sync::{Arc, Mutex},
};
use tokio::task::JoinHandle;

use crate::placeholder_image::{download_and_process_image, PlaceholderImageOutputKind};

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
  pub cache: Option<bool>,
}

#[napi(object)]
pub struct TransformOutput {
  pub code: String,
  pub sourcemap: Option<String>,
}

#[derive(Clone)]
struct Data {
  #[allow(dead_code)]
  url: String,
  placeholder: String,
  cache: bool,
  preview_type: PlaceholderImageOutputKind,
}

impl Data {
  pub fn new(
    url: String,
    placeholder: String,
    preview_type: PlaceholderImageOutputKind,
    cache: bool,
  ) -> Self {
    Data {
      url,
      placeholder,
      cache,
      preview_type,
    }
  }
}

#[napi(object)]
#[derive(Clone)]
pub struct PreviewOptions {
  pub width: Option<u32>,
  pub height: Option<u32>,
  pub output_kind: PlaceholderImageOutputKind,
  pub replace_function_call: bool,
  pub cache: bool,
}

impl PreviewOptions {
  pub fn from_global_options(options: &TransformOptions) -> Self {
    PreviewOptions {
      width: None,
      height: None,
      output_kind: options
        .placeholder_image_kind
        .clone()
        .unwrap_or(PlaceholderImageOutputKind::Normal),
      replace_function_call: options.replace_function_call.unwrap_or(true),
      cache: options.cache.unwrap_or(true),
    }
  }
}

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
          placeholder   TEXT NOT NULL,
          preview_type TEXT DEFAULT 'normal'
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
  let util_import_symbols: Vec<SymbolId> = vec![];
  let http_client = Client::new();

  let tasks = FuturesUnordered::new();

  let shared_data = Arc::new(Mutex::new(HashMap::new()));

  let has_changes = false;
  // Traverse the AST
  let mut visitor = TransformVisitor {
    allocator: &allocator,
    ast_builder,
    scoping: &scoping,
    pass: Pass::First,
    util_import_symbols,
    http_client,
    rusqlite_conn: conn,
    tasks,
    options: options.clone(),
    data: shared_data,
    has_changes,
  };

  visitor.begin(&mut program).await;

  let codegen = Codegen::new();
  let codegen = codegen.with_options(CodegenOptions {
    source_map_path: Some(PathBuf::from(&sourcemap_file_path)),
    ..CodegenOptions::default()
  });
  let result = codegen.build(&program);

  let result_code: String = result.code;

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
  util_import_symbols: Vec<SymbolId>,
  pass: Pass,
  http_client: Client,
  rusqlite_conn: Connection,
  tasks: FuturesUnordered<JoinHandle<()>>,
  options: TransformOptions,
  data: Arc<Mutex<HashMap<String, Data>>>,
  has_changes: bool,
}

impl<'a> TransformVisitor<'a> {
  async fn begin(&mut self, program: &mut Program<'a>) {
    let _ = self.init_shared_data_from_db();

    self.visit_program(program);

    self.pass = Pass::Second;

    if self.has_changes {
      while let Some(result) = self.tasks.next().await {
        println!("Task completed: {:?}", result);
      }

      let _ = self.push_hashmap_to_db();

      self.visit_program(program);
    }
  }

  fn init_shared_data_from_db(&mut self) -> Result<(), Box<dyn std::error::Error + '_>> {
    let mut stmt = self
      .rusqlite_conn
      .prepare("SELECT url, placeholder, preview_type FROM images")?;

    let rows = stmt.query_map([], |row| {
      Ok((
        row.get::<_, String>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
      ))
    })?;

    let mut map = self.data.lock()?;
    for row in rows {
      let (url, placeholder, preview_type_str) = row?;
      let preview_type = self.get_placeholder_enum_value_from_string(&preview_type_str);
      map.insert(
        url.clone(),
        Data::new(url.clone(), placeholder, preview_type, true),
      );
    }

    Ok(())
  }

  fn prepare_image_from_fn_call(
    &mut self,
    call: &mut OxcBox<'a, CallExpression<'a>>,
  ) -> Result<(), Box<dyn std::error::Error + '_>> {
    let first_arg = &call.arguments.first();
    let user_options_arg = &call.arguments.get(1);

    let preview_options = self.get_preview_options_from_argument(user_options_arg);

    if let Some(image_url) = first_arg {
      if let Expression::StringLiteral(string_value) = image_url.as_expression().unwrap() {
        let url = string_value.value.to_string();

        self.has_changes = true;

        let exists_in_cache =
          { self.check_image_cache(url.clone(), preview_options.output_kind.clone())? };

        if exists_in_cache {
          println!("Image already cached: {}", url);
          return Ok(());
        }

        self.spawn_image_resize(url, preview_options);
      }
    } else {
      return Err("No image URL provided in the function call".into());
    }

    return Ok(());
  }

  fn check_image_cache(
    &self,
    url: String,
    output_kind: PlaceholderImageOutputKind,
  ) -> Result<bool, Box<dyn std::error::Error + '_>> {
    let map = &self.data.lock()?;
    Ok(
      map.contains_key(&url)
        && map.get(&url).ok_or("URL not found in cache")?.preview_type == output_kind,
    )
  }

  fn push_hashmap_to_db(&mut self) -> Result<(), Box<dyn std::error::Error + '_>> {
    let data_vecc: Vec<(String, Data)> = {
      let map = self.data.lock()?;
      map.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
    };

    let prepared_data = data_vecc
      .iter()
      .map(|(url, data)| {
        (
          url.clone(),
          data.placeholder.clone(),
          self.get_placeholder_string_value_from_enum(data.preview_type.clone()),
          data.cache,
        )
      })
      .collect::<Vec<_>>();

    let tx = self.rusqlite_conn.transaction()?; // BEGIN TRANSACTION

    {
      let mut stmt = tx.prepare(
        "INSERT OR REPLACE INTO images (url, placeholder, preview_type) VALUES (?, ?, ?)",
      )?;

      for (url, placeholder, preview_type, cache) in prepared_data {
        if cache {
          stmt.execute((url, placeholder, preview_type))?;
        }
      }
    }

    tx.commit()?;

    Ok(())
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

  fn get_placeholder_enum_value_from_string(&self, value: &String) -> PlaceholderImageOutputKind {
    match value.as_str() {
      "normal" => PlaceholderImageOutputKind::Normal,
      "black-and-white" => PlaceholderImageOutputKind::BlackAndWhite,
      "dominant-color" => PlaceholderImageOutputKind::DominantColor,
      "transparent" => PlaceholderImageOutputKind::Transparent,
      "average-color" => PlaceholderImageOutputKind::AverageColor,
      _ => PlaceholderImageOutputKind::Normal,
    }
  }

  fn get_placeholder_string_value_from_enum(&self, value: PlaceholderImageOutputKind) -> String {
    match value {
      PlaceholderImageOutputKind::Normal => "normal".to_string(),
      PlaceholderImageOutputKind::BlackAndWhite => "black-and-white".to_string(),
      PlaceholderImageOutputKind::DominantColor => "dominant-color".to_string(),
      PlaceholderImageOutputKind::Transparent => "transparent".to_string(),
      PlaceholderImageOutputKind::AverageColor => "average-color".to_string(),
    }
  }

  fn get_preview_options_from_argument(&mut self, arg: &Option<&Argument<'a>>) -> PreviewOptions {
    let mut preview_options = PreviewOptions::from_global_options(&self.options);

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
                  preview_options.output_kind =
                    self.get_placeholder_enum_value_from_string(&string_literal.value.to_string());
                }
              } else if key.name == "replaceFunctionCall" {
                if let Expression::BooleanLiteral(boolean_literal) = &key_value.value {
                  preview_options.replace_function_call = boolean_literal.value;
                }
              } else if key.name == "cache" {
                if let Expression::BooleanLiteral(boolean_literal) = &key_value.value {
                  preview_options.cache = boolean_literal.value;
                }
              }
            }
          }
        });
      }
    }

    preview_options
  }

  fn spawn_image_resize(&self, url: String, options: PreviewOptions) {
    let client = self.http_client.clone();

    let map_clone = Arc::clone(&self.data);
    self.tasks.push(tokio::spawn(async move {
      match download_and_process_image(&client, &url, &options).await {
        Ok(image) => {
          println!("✅ Processed image: {}", image);
          let mut map = map_clone.lock().unwrap();
          map.insert(
            url.clone(),
            Data::new(url.clone(), image, options.output_kind, options.cache),
          );
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
              let _ = self.prepare_image_from_fn_call(call);
            } else {
              let check = self.get_image_result_from_fn_call(call);
              if check.is_ok() {
                let (url, options) = check.unwrap();
                placeholder_image_url = Some(url);
                if options.replace_function_call {
                  replace = true;
                } else {
                  let first_arg = call.arguments.first_mut().unwrap().as_expression_mut();

                  if let Some(Expression::StringLiteral(string_value)) = first_arg {
                    let atom = self.ast_builder.atom(
                      self
                        .allocator
                        .alloc_str(placeholder_image_url.as_ref().unwrap().as_str()),
                    );

                    string_value.value = atom;
                  }
                }
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
