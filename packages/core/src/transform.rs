use bytes::Bytes;
use futures::{stream::FuturesUnordered, StreamExt};
use napi_derive::napi;
use once_cell::sync::Lazy;
use oxc::{
  allocator::{Allocator, Box as OxcBox},
  ast::{
    ast::{
      Argument, CallExpression, Expression, ImportDeclaration, ImportDeclarationSpecifier,
      ModuleExportName, ObjectPropertyKind, Program, PropertyKey, SourceType, StringLiteral,
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
use url::Url;

use crate::{
  placeholder_image::{download_and_process_image, process_image, PlaceholderImageOutputKind},
  store::Store,
};

static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| Client::new());

#[derive(PartialEq, Debug, Clone)]
enum Pass {
  First,
  Second,
}

const IMPORT_PATH: &str = "nocojs";

#[napi(object)]
#[derive(Clone)]
pub struct TransformOptions {
  pub code: String,
  pub file_path: String,
  pub placeholder_image_kind: Option<PlaceholderImageOutputKind>,
  pub replace_function_call: Option<bool>,
  pub cache: Option<bool>,
  pub public_dir: Option<String>,
  pub cache_file_dir: Option<String>,
}

#[napi(object)]
pub struct TransformOutput {
  pub code: String,
  pub sourcemap: Option<String>,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct PreviewOptions {
  pub width: Option<u32>,
  pub height: Option<u32>,
  pub output_kind: PlaceholderImageOutputKind,
  pub replace_function_call: bool,
  pub cache: bool,
}

impl PreviewOptions {
  pub fn from_global_options(options: &TransformOptions) -> Self {
    let result = PreviewOptions {
      width: None,
      height: None,
      output_kind: options
        .placeholder_image_kind
        .clone()
        .unwrap_or(PlaceholderImageOutputKind::Normal),
      replace_function_call: options.replace_function_call.unwrap_or(true),
      cache: options.cache.unwrap_or(true),
    };
    result
  }
}

static RUSQLITE_FILE_NAME: &str = "cache.db";

pub async fn transform(options: TransformOptions) -> Option<TransformOutput> {
  if !options.code.contains(IMPORT_PATH) {
    return None;
  }

  if !options.file_path.ends_with(".tsx") {
    return None;
  }

  let cache_dir = init_cache_dir(
    &options
      .cache_file_dir
      .clone()
      .unwrap_or(".nocojs".to_string()),
  )
  .unwrap_or("".to_string());

  let db_filepath = PathBuf::from(&cache_dir).join(RUSQLITE_FILE_NAME);
  let conn = Connection::open(&db_filepath).unwrap();
  // Create a table
  conn
    .execute(
      "CREATE TABLE IF NOT EXISTS images (
          url     TEXT PRIMARY KEY,
          placeholder   TEXT NOT NULL,
          preview_type TEXT DEFAULT 'normal',
          cache_key TEXT NOT NULL
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

  let tasks = FuturesUnordered::new();

  let store_data = Arc::new(Mutex::new(HashMap::new()));
  let store = Arc::new(Store { data: store_data });

  let has_changes = false;
  // Traverse the AST
  let mut visitor = TransformVisitor {
    allocator: &allocator,
    ast_builder,
    scoping: &scoping,
    pass: Pass::First,
    util_import_symbols,
    rusqlite_conn: conn,
    tasks,
    options: options.clone(),
    store: Arc::clone(&store),
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

  let transform_result = Some(TransformOutput {
    code: result_code,
    sourcemap: sourcemap,
  });

  transform_result
}

fn init_cache_dir(dirname: &str) -> Result<String, Box<dyn std::error::Error>> {
  let path = PathBuf::from(dirname);
  if !path.exists() {
    std::fs::create_dir_all(&path)?;
  }

  Ok(dirname.to_string())
}

struct TransformVisitor<'a> {
  allocator: &'a Allocator,
  ast_builder: AstBuilder<'a>,
  scoping: &'a Scoping,
  util_import_symbols: Vec<SymbolId>,
  pass: Pass,
  rusqlite_conn: Connection,
  tasks: FuturesUnordered<JoinHandle<()>>,
  options: TransformOptions,
  has_changes: bool,
  store: Arc<Store>,
}

impl<'a> TransformVisitor<'a> {
  async fn begin(&mut self, program: &mut Program<'a>) {
    let _ = self.init_shared_data_from_db();

    self.visit_program(program);

    self.pass = Pass::Second;
    if self.has_changes {
      while let Some(_) = self.tasks.next().await {}

      let _ = self.push_hashmap_to_db();

      self.visit_program(program);
    }
  }

  fn init_shared_data_from_db(&mut self) -> Result<(), Box<dyn std::error::Error + '_>> {
    let mut stmt = self
      .rusqlite_conn
      .prepare("SELECT url, placeholder, preview_type, cache_key FROM images")?;

    let rows = stmt.query_map([], |row| {
      Ok((
        row.get::<_, String>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
        row.get::<_, String>(3)?,
      ))
    })?;

    let mut to_insert = vec![];
    for row in rows {
      let (url, placeholder, preview_type_str, cache_key) = row?;
      to_insert.push(self.store.create_item_from_row((
        url,
        placeholder,
        preview_type_str,
        cache_key,
      ))?);
    }

    self.store.bulk_insert(to_insert)?;

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

        let exists_in_cache = { self.store.has_cached_image(url.clone(), &preview_options)? };

        if exists_in_cache {
          return Ok(());
        }

        self.spawn_image_resize(url, preview_options);
      }
    } else {
      return Err("No image URL provided in the function call".into());
    }

    return Ok(());
  }

  fn push_hashmap_to_db(&mut self) -> Result<(), Box<dyn std::error::Error + '_>> {
    if !self.store.has_changes()? {
      return Ok(());
    }

    let (to_insert, to_update) = self.store.get_prepared_data()?;

    let tx = self.rusqlite_conn.transaction()?; // BEGIN TRANSACTION

    {
      let mut insert_query = tx.prepare(
        "INSERT INTO images (url, placeholder, preview_type, cache_key) VALUES (?, ?, ?, ?)",
      )?;

      for (url, placeholder, preview_type, cache_key) in to_insert {
        insert_query.execute((url, placeholder, preview_type, cache_key))?;
      }

      let mut update_query = tx.prepare(
        "UPDATE images SET placeholder = ?, preview_type = ?, cache_key = ? WHERE url = ?",
      )?;

      for (url, placeholder, preview_type, cache_key) in to_update {
        update_query.execute((placeholder, preview_type, cache_key, url))?;
      }
    }

    tx.commit()?;
    Ok(())
  }

  fn get_image_result_from_fn_call(
    &mut self,
    call: &mut OxcBox<'a, CallExpression<'a>>,
  ) -> Result<(String, PreviewOptions), Box<dyn std::error::Error + '_>> {
    if let Some(first_arg) = call.arguments.first() {
      if let Expression::StringLiteral(string_value) = first_arg.as_expression().unwrap() {
        let image_url = string_value.value.to_string();
        let placeholder_image_url = self.store.get_placeholder_from_url(image_url.clone())?;

        let options = self.get_preview_options_from_argument(&call.arguments.get(1));
        return Ok((placeholder_image_url.to_string(), options));
      }
    }
    Err("No image URL provided in the function call".into())
  }

  fn get_preview_options_from_argument(&self, arg: &Option<&Argument<'a>>) -> PreviewOptions {
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
              } else if key.name == "placeholderImageKind" {
                if let Expression::StringLiteral(string_literal) = &key_value.value {
                  preview_options.output_kind =
                    PlaceholderImageOutputKind::from_string(&string_literal.value.to_string());
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
    let url_parse = Url::parse(&url);

    if url_parse.is_err() {
      let public_dir = self.options.public_dir.clone();
      if let Some(public_dir) = public_dir {
        let relative_url = url.strip_prefix("/").unwrap_or(&url);
        let image_path = PathBuf::from(public_dir.clone()).join(relative_url);

        if image_path.exists() {
          let file_read = std::fs::read(&image_path.as_path());
          if file_read.is_err() {
            eprintln!(
              "❌ Failed to read image from public directory: {:?} {:?}",
              image_path, public_dir
            );
            return;
          }
          let bytes = Bytes::from(file_read.unwrap());
          let url_clone = url.clone();
          let store = Arc::clone(&self.store);
          self.tasks.push(tokio::spawn(async move {
            match process_image(&bytes, &url_clone, &options).await {
              Ok(out) => {
                let _ = store.insert_or_update(url_clone, out.base64_str, &options);
              }
              Err(e) => eprintln!("❌ Failed to process {}: {}", url_clone, e),
            }
          }));
        } else {
          eprintln!("❌ Image not found in public directory: {:?}", image_path);
        }
      } else {
        eprintln!("❌ Invalid URL: {}", url);
      }
    } else {
      let client = &*HTTP_CLIENT;
      let url_clone = url.clone();
      let store = Arc::clone(&self.store);

      self.tasks.push(tokio::spawn(async move {
        match download_and_process_image(&client, &url, &options).await {
          Ok(image) => {
            let _ = store.insert_or_update(url_clone, image.base64_str, &options);
          }
          Err(e) => eprintln!("❌ Failed to process {}: {}", url, e),
        }
      }));
    }
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
            if let ModuleExportName::IdentifierName(identifier_name) = &import_specifier.imported {
              if identifier_name.name == "preview" {
                if self.pass == Pass::First {
                  self
                    .util_import_symbols
                    .push(import_specifier.local.symbol_id());
                }
              }
            } else if import_specifier.local.name == "preview" {
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
              } else {
                eprintln!("Image not found in cache or database");
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
