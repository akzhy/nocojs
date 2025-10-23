import type {
  PlaceholderImageType,
  PlaceholderOptions,
} from "./placeholder-image";

type DbAction = "none" | "insert" | "update" | "delete";

export interface StoreDataItem {
  url: string;
  placeholder: string;
  cache: boolean;
  previewType: PlaceholderImageType;
  cacheKey: string;
  dbAction: DbAction;
  originalWidth: number;
  originalHeight: number;
}

export class Store {
  private data: Map<string, StoreDataItem>;

  constructor() {
    this.data = new Map();
  }

  initStore(items: StoreDataItem[]): void {
    items.forEach((item) => {
      this.data.set(item.cacheKey, item);
    });
  }

  static getCacheKey(url: string, previewOptions: PlaceholderOptions): string {
    return `${url}_${previewOptions.placeholderType}_${
      previewOptions.width || 0
    }_${previewOptions.height || 0}`;
  }

  hasChanges(): boolean {
    for (const item of this.data.values()) {
      if (item.dbAction !== "none") {
        return true;
      }
    }
    return false;
  }

  insertItem(
    url: string,
    placeholder: string,
    originalWidth: number,
    originalHeight: number,
    previewOptions: PlaceholderOptions,
  ): StoreDataItem {
    const cacheKey = Store.getCacheKey(url, previewOptions);

    const item: StoreDataItem = {
      url,
      placeholder,
      cache: previewOptions.cache ?? true,
      previewType: previewOptions.placeholderType ?? "blurred",
      cacheKey,
      dbAction: "insert",
      originalWidth,
      originalHeight,
    };

    this.data.set(cacheKey, item);

    return item;
  }

  getCachedPlaceholder(
    url: string,
    previewOptions: PlaceholderOptions,
  ): StoreDataItem | undefined {
    const cacheKey = Store.getCacheKey(url, previewOptions);
    return this.data.get(cacheKey);
  }

  getItemsToSync(): StoreDataItem[] {
    const itemsToSync: StoreDataItem[] = [];
    for (const item of this.data.values()) {
      if (item.dbAction !== "none") {
        itemsToSync.push(item);
      }
    }
    return itemsToSync;
  }

  clearItemsToSync(): void {
    for (const item of this.data.values()) {
      item.dbAction = "none";
    }
  }

  getData(): Map<string, StoreDataItem> {
    return this.data;
  }
}
