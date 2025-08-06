use std::{
  collections::HashMap,
  sync::{Arc, Mutex},
};

use crate::{placeholder_image::PlaceholderImageOutputKind, transform::PreviewOptions};

#[derive(Clone, Debug, PartialEq)]
enum DbAction {
  Insert,
  Update,
  Skip,
}

#[derive(Clone, Debug)]
pub struct StoreDataItem {
  id: i32,
  url: String,
  placeholder: String,
  cache: bool,
  preview_type: PlaceholderImageOutputKind,
  cache_key: String,
  db_action: DbAction,
}

pub struct Store {
  pub data: Arc<Mutex<HashMap<String, StoreDataItem>>>,
}

impl Store {
  pub fn new() -> Self {
    Store {
      data: Arc::new(Mutex::new(HashMap::new())),
    }
  }

  /// Used to initialize the store with existing data.
  pub fn bulk_insert(
    &self,
    items: Vec<StoreDataItem>,
  ) -> Result<(), Box<dyn std::error::Error + '_>> {
    let mut map = self.data.lock()?;
    for item in items {
      map.insert(
        format!("{}-{}", item.url.clone(), item.cache_key.clone()),
        item,
      );
    }
    Ok(())
  }

  pub fn has_changes(&self) -> Result<bool, Box<dyn std::error::Error + '_>> {
    let map = self.data.lock()?;
    Ok(
      map
        .iter()
        .any(|(_, item)| item.db_action == DbAction::Insert || item.db_action == DbAction::Update),
    )
  }

  pub fn create_item_from_row(
    &self,
    row: (i32, String, String, String, String),
  ) -> Result<StoreDataItem, Box<dyn std::error::Error + '_>> {
    let (id, url, placeholder, preview_type_str, cache_key) = row;
    let preview_type = PlaceholderImageOutputKind::from_string(&preview_type_str);
    Ok(StoreDataItem {
      id,
      url,
      placeholder,
      cache: true,
      preview_type,
      cache_key,
      db_action: DbAction::Skip,
    })
  }

  pub fn insert_or_update(
    &self,
    url: String,
    placeholder: String,
    options: &PreviewOptions,
  ) -> Result<(), Box<dyn std::error::Error + '_>> {
    let mut map = self.data.lock()?;
    let cache_key = Store::create_cache_key(&options);
    let map_key = format!("{}-{}", url.clone(), cache_key.clone());
    let existing_item = map.get(map_key.as_str());

    let item = StoreDataItem {
      id: existing_item.map_or(0, |item| item.id),
      url: url.clone(),
      placeholder,
      cache: options.cache,
      preview_type: options.output_kind.clone(),
      cache_key: Store::create_cache_key(&options),
      db_action: if existing_item.is_none() {
        DbAction::Insert
      } else {
        DbAction::Update
      },
    };
    map.insert(map_key, item);
    Ok(())
  }

  pub fn get_prepared_data(
    &self,
  ) -> Result<
    (
      Vec<(String, String, String, String)>,
      Vec<(i32, String, String, String, String)>,
    ),
    Box<dyn std::error::Error + '_>,
  > {
    let data_vecc: Vec<(String, StoreDataItem)> = {
      let map = self.data.lock()?;
      map.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
    };

    let mut to_insert: Vec<(String, String, String, String)> = vec![];
    let mut to_update: Vec<(i32, String, String, String, String)> = vec![];

    data_vecc.iter().for_each(|(url, data)| {
      if !data.cache {
        return;
      }
      if data.db_action == DbAction::Insert {
        to_insert.push((
          url.clone(),
          data.placeholder.clone(),
          PlaceholderImageOutputKind::to_string(&data.preview_type.clone()),
          data.cache_key.clone(),
        ));
      } else if data.db_action == DbAction::Update {
        to_update.push((
          data.id,
          url.clone(),
          data.placeholder.clone(),
          PlaceholderImageOutputKind::to_string(&data.preview_type.clone()),
          data.cache_key.clone(),
        ));
      }
    });

    Ok((to_insert, to_update))
  }

  pub fn has_cached_image(
    &self,
    url: String,
    options: &PreviewOptions,
  ) -> Result<bool, Box<dyn std::error::Error + '_>> {
    let map = self.data.lock().unwrap();
    let cache_key = Store::create_cache_key(&options);
    let item = map.get(format!("{}-{}", url, cache_key).as_str());

    Ok(item.is_some())
  }

  pub fn get_placeholder_from_url_and_options(
    &self,
    url: String,
    options: &PreviewOptions,
  ) -> Result<String, Box<dyn std::error::Error + '_>> {
    let map = self.data.lock()?;
    let cache_key = Store::create_cache_key(&options);
    if let Some(item) = map.get(format!("{}-{}", url, cache_key).as_str()) {
      return Ok(item.placeholder.clone());
    }
    Err(Box::new(std::io::Error::new(
      std::io::ErrorKind::NotFound,
      "Placeholder not found for the given URL",
    )))
  }

  fn create_cache_key(options: &PreviewOptions) -> String {
    format!(
      "{}_{}_{}",
      options.output_kind.to_string(),
      options.width.unwrap_or(0).to_string(),
      options.height.unwrap_or(0).to_string()
    )
  }
}
