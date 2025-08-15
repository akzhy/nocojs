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
  time::{Duration, Instant},
};
use tokio::task::JoinHandle;
use url::Url;

use crate::{
  log::{self, create_log, set_log_level, style_error, LogLevel},
  placeholder_image::{download_and_process_image, process_image, PlaceholderImageOutputKind},
  store::Store,
};

static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
  Client::builder()
    .timeout(Duration::from_secs(10))
    .build()
    .unwrap()
});

#[derive(PartialEq, Debug, Clone)]
enum Pass {
  First,
  Second,
}

const IMPORT_PATH: &str = "@nocojs/client";

#[napi(object)]
#[derive(Clone, Debug)]
pub struct TransformOptions {
  pub placeholder_type: Option<PlaceholderImageOutputKind>,
  pub replace_function_call: Option<bool>,
  pub cache: Option<bool>,
  pub public_dir: Option<String>,
  pub cache_file_dir: Option<String>,
  pub log_level: Option<LogLevel>,
  pub width: Option<u32>,
  pub height: Option<u32>,
  pub sourcemap_file_path: Option<String>,
  pub wrap_with_svg: Option<bool>,
}

#[napi(object)]
pub struct TransformOutput {
  pub code: String,
  pub sourcemap: Option<String>,
  pub logs: Option<Vec<log::Log>>,
}

#[napi(object)]
#[derive(Clone, Debug)]
pub struct PreviewOptions {
  pub width: Option<u32>,
  pub height: Option<u32>,
  pub output_kind: PlaceholderImageOutputKind,
  pub replace_function_call: bool,
  pub cache: bool,
  pub wrap_with_svg: bool,
}

impl PreviewOptions {
  pub fn from_global_options(options: &TransformOptions) -> Self {
    let result = PreviewOptions {
      width: options.width,
      height: options.height,
      output_kind: options
        .placeholder_type
        .clone()
        .unwrap_or(PlaceholderImageOutputKind::Normal),
      replace_function_call: options.replace_function_call.unwrap_or(true),
      cache: options.cache.unwrap_or(true),
      wrap_with_svg: options.wrap_with_svg.unwrap_or(true),
    };
    result
  }
}

static RUSQLITE_FILE_NAME: &str = "cache.db";

pub async fn transform(
  code: String,
  file_path: String,
  options: TransformOptions,
) -> Result<Option<TransformOutput>, Box<dyn std::error::Error>> {
  if !code.contains(IMPORT_PATH) {
    return Ok(None);
  }

  let instant = Instant::now();

  if options.log_level.is_some() {
    set_log_level(options.log_level.unwrap());
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

  let _ = setup_sqlite(&conn);

  let allocator = Allocator::default();
  let source_type = SourceType::from_path(&file_path)?;

  let sourcemap_file_path = options.sourcemap_file_path.clone();
  let sourcemap_file_path = sourcemap_file_path.unwrap_or_else(|| file_path.clone());

  let ParserReturn { mut program, .. } = Parser::new(&allocator, &code, source_type).parse();

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
    file_path: file_path.clone(),
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
    logs: Some(log::collect_logs()),
  });

  create_log(
    log::style_info(format!(
      "Finished processing file {} in {:?}",
      file_path,
      instant.elapsed()
    )),
    LogLevel::Verbose,
  );

  Ok(transform_result)
}

fn setup_sqlite(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
  let create_images_table = conn.execute(
    "CREATE TABLE IF NOT EXISTS images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url     TEXT NOT NULL,
          placeholder   TEXT NOT NULL,
          preview_type TEXT DEFAULT 'normal',
          cache_key TEXT NOT NULL,
          UNIQUE(url, cache_key)
      )",
    [],
  );

  let create_metadata_table = conn.execute(
    "CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
      )",
    [],
  );

  if create_images_table.is_err() {
    create_log(
      log::style_error("Failed to create sqlite database. Persistend caching won't work"),
      LogLevel::Error,
    );
  }

  if create_metadata_table.is_err() {
    create_log(
      log::style_error("Failed to create metadata table in sqlite database"),
      LogLevel::Error,
    );
  }

  let current_version: String = conn
    .query_row(
      "SELECT value FROM metadata WHERE key = 'version'",
      [],
      |row| row.get(0),
    )
    .unwrap_or("0".to_string());

  if current_version == "0" {
    conn.execute(
      "INSERT OR REPLACE INTO metadata (key, value) VALUES ('version', ?)",
      ["1.0.0"],
    )?;
  }

  Ok(())
}

fn init_cache_dir(dirname: &str) -> Result<String, Box<dyn std::error::Error>> {
  let path = PathBuf::from(dirname);
  if !path.exists() {
    let create = std::fs::create_dir_all(&path);

    if create.is_err() {
      create_log(
        log::style_error(&format!("Failed to create cache directory: {}", dirname)),
        LogLevel::Error,
      );
      return Err(Box::new(create.unwrap_err()));
    }
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
  file_path: String,
}

impl<'a> TransformVisitor<'a> {
  ///
  /// Begins the transformation. It first initializes the store from the database,
  /// Then attemps a two-pass transformation.
  /// The first pass identifies function calls that need to be replaced with placeholder images.
  /// It then spawns tasks to process images asynchronously.
  ///
  /// If there are changes, it first pushes the new data to the db and begins the second pass,
  /// which replaces the function calls with the processed image URLs.
  ///
  async fn begin(&mut self, program: &mut Program<'a>) {
    let _ = self.set_store_data_from_db();

    self.visit_program(program);

    self.pass = Pass::Second;

    if self.has_changes {
      while let Some(_) = self.tasks.next().await {}

      let _ = self.push_store_data_to_db();

      self.visit_program(program);
    }
  }

  /// Reads the existing data from the database and populates the store.
  /// This is called at the beginning of the transformation to ensure that any existing cached images
  /// are available for the transformation process.
  fn set_store_data_from_db(&mut self) -> Result<(), Box<dyn std::error::Error + '_>> {
    let mut stmt = self
      .rusqlite_conn
      .prepare("SELECT id, url, placeholder, preview_type, cache_key FROM images")?;

    let rows = stmt.query_map([], |row| {
      Ok((
        row.get::<_, i32>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
        row.get::<_, String>(3)?,
        row.get::<_, String>(4)?,
      ))
    })?;

    let mut to_insert = vec![];
    for row in rows {
      let (id, url, placeholder, preview_type_str, cache_key) = row?;
      to_insert.push(self.store.create_item_from_row((
        id,
        url,
        placeholder,
        preview_type_str,
        cache_key,
      ))?);
    }

    if to_insert.len() > 0 {
      create_log(
        log::style_info(format!(
          "Loaded {} cached images from the database",
          to_insert.len()
        )),
        LogLevel::Verbose,
      );
    }

    self.store.bulk_insert(to_insert)?;

    Ok(())
  }

  /// Function used to process "preview" function calls.
  /// This will be called during the first pass of the transformation.
  /// It extracts the image URL and an optional options from the function call arguments.
  /// If the image URL / path is valid, it checks the cache for existing processed images.
  /// If the image is not in the cache, it spawns a task to process the image asynchronously.
  /// If the image is already in the cache, it does nothing.
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
          create_log(
            log::style_info(format!("Cache hit for {}", url)),
            LogLevel::Verbose,
          );
          return Ok(());
        }

        self.spawn_image_resize(url, preview_options);
      }
    } else {
      create_log(
        log::style_error(format!(
          "No image URL provided in the function call. File: {}:{}",
          self.file_path, call.span.start
        )),
        LogLevel::Error,
      );
      return Err("No image URL provided in the function call".into());
    }

    return Ok(());
  }

  /// Pushes the current state of the store to the database.
  /// It prepares the data for insertion and/or update based on the current state of the store.
  /// Function called after both passes of the transformation.
  fn push_store_data_to_db(&mut self) -> Result<(), Box<dyn std::error::Error + '_>> {
    if !self.store.has_changes()? {
      return Ok(());
    }

    let (to_insert, to_update) = self.store.get_prepared_data()?;

    let tx = self.rusqlite_conn.transaction()?;
    {
      let mut insert_query = tx.prepare(
        "INSERT INTO images (url, placeholder, preview_type, cache_key) VALUES (?, ?, ?, ?)",
      )?;

      if !to_insert.is_empty() {
        create_log(
          log::style_info(format!(
            "Inserting {} new images into the database",
            to_insert.len()
          )),
          LogLevel::Verbose,
        );
      }

      for (url, placeholder, preview_type, cache_key) in to_insert {
        insert_query.execute((url, placeholder, preview_type, cache_key))?;
      }

      let mut update_query = tx.prepare(
        "UPDATE images SET placeholder = ?, preview_type = ?, cache_key = ? WHERE id = ?",
      )?;

      if !to_update.is_empty() {
        create_log(
          log::style_info(format!(
            "Updating {} existing images in the database",
            to_update.len()
          )),
          LogLevel::Verbose,
        );
      }

      for (id, _, placeholder, preview_type, cache_key) in to_update {
        update_query.execute((placeholder, preview_type, cache_key, id))?;
      }
    }

    tx.commit()?;
    Ok(())
  }

  /// Function called during the second pass of the transformation.
  /// It retrieves the processed image URL from the store based on the function call.
  fn get_image_result_from_fn_call(
    &mut self,
    call: &mut OxcBox<'a, CallExpression<'a>>,
  ) -> Result<(String, PreviewOptions), Box<dyn std::error::Error + '_>> {
    if let Some(first_arg) = call.arguments.first() {
      if let Expression::StringLiteral(string_value) = first_arg.as_expression().unwrap() {
        let image_url = string_value.value.to_string();
        let options = self.get_preview_options_from_argument(&call.arguments.get(1));
        let placeholder_image_url = self
          .store
          .get_placeholder_from_url_and_options(image_url.clone(), &options)?;

        return Ok((placeholder_image_url.to_string(), options));
      }
    }
    create_log(
      log::style_error(format!(
        "No image URL provided in the function call. File {}:{}",
        self.file_path, call.span.start
      )),
      LogLevel::Error,
    );
    Err("No image URL provided in the function call".into())
  }

  /// Extracts the preview options from the function call arguments.
  fn get_preview_options_from_argument(&self, arg: &Option<&Argument<'a>>) -> PreviewOptions {
    let mut preview_options = PreviewOptions::from_global_options(&self.options);
    if arg.is_none() {
      return preview_options;
    }
    let user_options_arg = arg.unwrap();
    if let Expression::ObjectExpression(object_expr) = user_options_arg.as_expression().unwrap() {
      object_expr.properties.iter().for_each(|prop| {
        if let ObjectPropertyKind::ObjectProperty(key_value) = prop {
          let key_str = match &key_value.key {
            PropertyKey::StringLiteral(key) => key.value.as_str(),
            PropertyKey::StaticIdentifier(key) => key.name.as_str(),
            _ => return,
          };

          match key_str {
            "width" => {
              if let Expression::NumericLiteral(numeric_literal) = &key_value.value {
                preview_options.width = Some(numeric_literal.value as u32);
              }
            }
            "height" => {
              if let Expression::NumericLiteral(numeric_literal) = &key_value.value {
                preview_options.height = Some(numeric_literal.value as u32);
              }
            }
            "placeholderType" => {
              if let Expression::StringLiteral(string_literal) = &key_value.value {
                preview_options.output_kind =
                  PlaceholderImageOutputKind::from_string(&string_literal.value.to_string());
              }
            }
            "replaceFunctionCall" => {
              if let Expression::BooleanLiteral(boolean_literal) = &key_value.value {
                preview_options.replace_function_call = boolean_literal.value;
              }
            }
            "cache" => {
              if let Expression::BooleanLiteral(boolean_literal) = &key_value.value {
                preview_options.cache = boolean_literal.value;
              }
            }
            "wrapWithSvg" => {
              if let Expression::BooleanLiteral(boolean_literal) = &key_value.value {
                preview_options.wrap_with_svg = boolean_literal.value;
              }
            }
            _ => {}
          }
        }
      });
    }

    preview_options
  }

  /// Spawns a task to process the image asynchronously.
  /// This function is called during the first pass of the transformation.
  /// If the URL is an actual URL, it downloads the image and processes it.
  /// If the URL is a relative path, it reads the image from the public directory.
  /// The processed image output is then inserted or updated in the store.
  fn spawn_image_resize(&self, url: String, options: PreviewOptions) {
    let url_parse = Url::parse(&url);

    if url_parse.is_err() {
      // Assumes the URL is a relative path to an image in the public directory

      let public_dir = self.options.public_dir.clone();
      if let Some(public_dir) = public_dir {
        let relative_url = url.strip_prefix("/").unwrap_or(&url);
        let image_path = PathBuf::from(public_dir.clone()).join(relative_url);

        if image_path.exists() {
          let file_read = std::fs::read(&image_path.as_path());
          if file_read.is_err() {
            create_log(
              style_error(format!(
                "Failed to read image from public directory: {:?} {:?}. File {}",
                image_path, public_dir, self.file_path
              )),
              LogLevel::Error,
            );
            return;
          }
          let bytes = Bytes::from(file_read.unwrap());
          let url_clone = url.clone();
          let store = Arc::clone(&self.store);
          let file_path_clone = self.file_path.clone();

          self.tasks.push(tokio::spawn(async move {
            match process_image(&bytes, &url_clone, &options).await {
              Ok(out) => {
                let _ = store.insert_or_update(url_clone, out.base64_str, &options);
              }
              Err(e) => create_log(
                format!(
                  "Failed to process image {} in {}. Error: {}",
                  url_clone, file_path_clone, e
                ),
                LogLevel::Error,
              ),
            }
          }));
        } else {
          create_log(
            format!(
              "Image not found in public directory: {:?}. Image used in file: {}",
              image_path, self.file_path
            ),
            LogLevel::Error,
          );
        }
      } else {
        create_log(
          format!("Invalid public dir. Processing image at {}", self.file_path),
          LogLevel::Error,
        );
      }
    } else {
      let client = &*HTTP_CLIENT;
      let url_clone = url.clone();
      let store = Arc::clone(&self.store);
      let file_path_clone = self.file_path.clone();

      self.tasks.push(tokio::spawn(async move {
        match download_and_process_image(&client, &url, &options).await {
          Ok(image) => {
            let _ = store.insert_or_update(url_clone, image.base64_str, &options);
          }
          Err(e) => create_log(
            format!(
              "Failed to process image {} in {}. Error: {}",
              url_clone, file_path_clone, e
            ),
            LogLevel::Error,
          ),
        }
      }));
    }
  }
}

impl<'a> VisitMut<'a> for TransformVisitor<'a> {
  /// Find all import declarations that import the "preview" function from "@nocojs/client".
  /// It identifies the import specifiers and stores their symbol IDs tp compare against preview function calls.
  fn visit_import_declaration(&mut self, it: &mut ImportDeclaration<'a>) {
    if it.source.value == IMPORT_PATH {
      it.specifiers
        .as_ref()
        .unwrap()
        .iter()
        .for_each(|specifier| {
          if let ImportDeclarationSpecifier::ImportSpecifier(import_specifier) = specifier {
            // Handle renamed imports
            // Eg: import { preview as previewFn } from '@nocojs/client';
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

  /// Handle function calls.
  /// Though visit_call_expression can be used, I don't think its possible to remove the function call
  /// and replace it with a string literal from within that function.
  /// So we use visit_expression to handle the function calls.
  fn visit_expression(&mut self, expr: &mut Expression<'a>) {
    let Expression::CallExpression(call) = expr else {
      return walk_mut::walk_expression(self, expr);
    };

    let Expression::Identifier(identifier_calle) = &call.callee else {
      return walk_mut::walk_expression(self, expr);
    };

    let callee_ref = self.scoping.get_reference(identifier_calle.reference_id());
    let Some(callee_symbol_id) = callee_ref.symbol_id() else {
      return walk_mut::walk_expression(self, expr);
    };

    // Check if the function was imported from "@nocojs/client"
    if !self.util_import_symbols.contains(&callee_symbol_id) {
      return walk_mut::walk_expression(self, expr);
    }

    if self.pass == Pass::First {
      let _ = self.prepare_image_from_fn_call(call);
      return walk_mut::walk_expression(self, expr);
    }

    // ----
    // Second pass logic
    // ----

    // If the image was valid, it should have been processed in the first pass and stored in the store.
    let Ok((url, options)) = self.get_image_result_from_fn_call(call) else {
      create_log(
        format!(
          "Failed to get image result from function call for {}",
          self.file_path
        ),
        LogLevel::Error,
      );
      return walk_mut::walk_expression(self, expr);
    };

    if options.replace_function_call {
      // Replace entire function call with string literal
      let atom = self.ast_builder.atom(self.allocator.alloc_str(&url));
      let lit = StringLiteral {
        value: atom,
        raw: None,
        span: call.span,
        lone_surrogates: false,
      };
      *expr = Expression::StringLiteral(OxcBox::new_in(lit, self.allocator));
    } else {
      // Replace only the first argument
      let Some(first_arg) = call.arguments.first_mut().unwrap().as_expression_mut() else {
        return walk_mut::walk_expression(self, expr);
      };

      if let Expression::StringLiteral(string_value) = first_arg {
        let atom = self.ast_builder.atom(self.allocator.alloc_str(&url));
        string_value.value = atom;
      }
    }

    walk_mut::walk_expression(self, expr);
  }
}
