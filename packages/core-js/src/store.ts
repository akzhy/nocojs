import { PlaceholderImageType, PreviewOptions } from "./placeholder-image";

type DbAction = "none" | "insert" | "update" | "delete";

export interface StoreDataItem {
  id: number;
  url: string;
  placeholder: string;
  cache: boolean;
  previewType: PlaceholderImageType;
  cacheKey: string;
  dbAction: DbAction;
  originalWidth: number;
  originalHeight: number;
}

class Store {
  data: Map<string, StoreDataItem>;
  idCounter: number;

  constructor() {
    this.data = new Map();
    this.idCounter = 0;
  }

  initStore(items: StoreDataItem[]): void {
    items.forEach((item) => {
      this.data.set(item.cacheKey, item);
    });
  }

  static getCacheKey(url: string, previewOptions: PreviewOptions): string {
    return `${url}_${previewOptions.outputKind}_${previewOptions.width || 0}_${
      previewOptions.height || 0
    }`;
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
    previewOptions: PreviewOptions
  ): StoreDataItem {
    const cacheKey = Store.getCacheKey(url, previewOptions);

    const item: StoreDataItem = {
      id: ++this.idCounter,
      url,
      placeholder,
      cache: previewOptions.cache,
      previewType: previewOptions.outputKind,
      cacheKey,
      dbAction: "insert",
      originalWidth,
      originalHeight,
    };

    this.data.set(cacheKey, item);

    return item;
  }
}
