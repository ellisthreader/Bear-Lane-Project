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
