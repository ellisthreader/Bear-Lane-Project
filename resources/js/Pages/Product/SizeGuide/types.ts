export type GenderKey = "men" | "women" | "kids";

export type SizeGuideTableSection = {
  kind: "table";
  id: string;
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  note?: string;
};

export type SizeGuideNoteSection = {
  kind: "note";
  id: string;
  title: string;
  text: string;
};

export type SizeGuideSection = SizeGuideTableSection | SizeGuideNoteSection;

export type GenderSizeGuide = {
  heading: string;
  subtitle: string;
  sections: SizeGuideSection[];
};

/** Column definition inside a measurement group (matches the server shape). */
export type MeasurementColumn = {
  key: string;
  label: string;
};

/**
 * A measurement group as stored in `storeSettings.size_guide.groups`.
 * Built-in groups (men / women / kids / bags) carry `is_default: true`.
 */
export type MeasurementGroup = {
  key: string;
  label: string;
  heading: string;
  subtitle: string;
  keywords: string[];
  category_ids?: number[];
  columns: MeasurementColumn[];
  rows: Array<Record<string, string>>;
  is_default: boolean;
};

export const CLOTHING_GROUP_KEYS: readonly string[] = ["men", "women", "kids"];
