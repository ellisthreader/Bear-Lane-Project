/*
 * Live catalogue for the "Get Quote Instantly" widget.
 *
 * Everything offered in the product dropdown comes from GET /quote/catalog, which
 * mirrors the categories the admin manages in the dashboard. Nothing is hard-coded
 * here: add, rename or remove a category in admin and the quote form follows.
 */

export type QuoteCatalogItem = {
  key: string;
  label: string;
  group: string;
  path: string;
  slugs: string[];
  category_ids: number[];
  base_price: number | null;
  has_products: boolean;
};

export type QuoteCatalogGroup = {
  key: string;
  label: string;
  items: QuoteCatalogItem[];
};

export type QuoteCatalog = {
  groups: QuoteCatalogGroup[];
  generated_at?: string;
};

export const FALLBACK_BASE_PRICE = 10;

export async function fetchQuoteCatalog(signal?: AbortSignal): Promise<QuoteCatalog> {
  const response = await fetch("/quote/catalog", {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Unable to load product categories (${response.status}).`);
  }

  const data = (await response.json()) as Partial<QuoteCatalog>;
  const groups = Array.isArray(data?.groups) ? data.groups : [];

  return {
    groups: groups
      .map((group) => ({
        key: String(group?.key ?? ""),
        label: String(group?.label ?? ""),
        items: (Array.isArray(group?.items) ? group.items : []).map((item) => ({
          key: String(item?.key ?? ""),
          label: String(item?.label ?? ""),
          group: String(item?.group ?? group?.label ?? ""),
          path: String(item?.path ?? `${group?.label ?? ""} → ${item?.label ?? ""}`),
          slugs: Array.isArray(item?.slugs) ? item.slugs.map(String) : [],
          category_ids: Array.isArray(item?.category_ids) ? item.category_ids.map(Number) : [],
          base_price:
            item?.base_price === null || item?.base_price === undefined || !Number.isFinite(Number(item.base_price))
              ? null
              : Number(item.base_price),
          has_products: Boolean(item?.has_products),
        })),
      }))
      .filter((group) => group.items.length > 0),
    generated_at: typeof data?.generated_at === "string" ? data.generated_at : undefined,
  };
}

/** Composite key so the same item label under different groups never collides. */
export const catalogItemId = (item: Pick<QuoteCatalogItem, "group" | "key">) =>
  `${item.group.toLowerCase()}::${item.key}`;

export function findCatalogItem(catalog: QuoteCatalog | null, id: string): QuoteCatalogItem | null {
  if (!catalog || !id) return null;
  for (const group of catalog.groups) {
    for (const item of group.items) {
      if (catalogItemId(item) === id) return item;
    }
  }
  return null;
}

type EstimateInput = {
  basePrice: number | null | undefined;
  quantity: number;
  designType: string;
  size: string;
};

/**
 * Price estimate for one line. The multipliers are the ones the widget has always
 * used; only the base price now comes from the real catalogue.
 */
export function estimateLinePrice({ basePrice, quantity, designType, size }: EstimateInput): number {
  let price =
    basePrice !== null && basePrice !== undefined && Number.isFinite(basePrice) && basePrice > 0
      ? basePrice
      : FALLBACK_BASE_PRICE;

  if (designType === "Custom Design") price *= 1.2;
  if (designType === "Complex Pattern") price *= 1.5;
  if (designType === "Text") price *= 0.8;
  if (designType === "Image") price *= 1.3;

  const upperSize = size.toUpperCase();
  if (upperSize.includes("XS") || upperSize.includes("2-3") || upperSize.includes("BABY")) price *= 1;
  else if (upperSize.includes("S")) price *= 1.05;
  else if (upperSize.includes("M")) price *= 1.1;
  else if (upperSize.includes("L") || upperSize.includes("XL")) price *= 1.2;
  else if (upperSize.includes("XXL") || upperSize.includes("12-18M")) price *= 1.3;

  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

  return Math.round(price * safeQuantity * 100) / 100;
}
