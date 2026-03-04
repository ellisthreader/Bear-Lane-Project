import { ClipartCategoryType } from "./types";

const allClipartModules = import.meta.glob(
  "../../../../../assets/clipart/**/*.{svg,png}",
  { eager: true, import: "default" }
) as Record<string, string>;

const normalizeClipartSrc = (value: string): string => {
  if (!value) return "";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return encodeURI(withLeadingSlash);
};

/**
 * Load a single category
 */
function loadCategory(
  id: string,
  name: string,
  folder: string
): ClipartCategoryType {
  const items = Object.entries(allClipartModules)
    .filter(([filePath]) => filePath.includes(`/clipart/${folder}/`))
    .map(([filePath, url]) => {
      const fileName = filePath.split("/").pop() ?? "clipart";

      const label = fileName
        .replace(/\.(svg|png)$/i, "")
        .replace(/[-_]/g, " ");

      return {
        id: filePath,
        src: normalizeClipartSrc(url),
        label, // always a string ✅
      };
    })
    .filter((item) => Boolean(item.src));


  return {
    id,
    name,
    items,
  };
}

/**
 * Build all categories
 */
const clipartCategories: ClipartCategoryType[] = [
  loadCategory("arrows", "Arrows", "arrows"),
  loadCategory("banners", "Banners", "banners"),
  loadCategory("city", "City", "city"),
  loadCategory("emojis", "Emojis", "emojis"),
  loadCategory("flowers", "Flowers", "flowers"),
  loadCategory("frames", "Frames", "frames"),
  loadCategory("hearts", "Hearts", "hearts"),
  loadCategory("humans", "Humans", "humans"),
  loadCategory("information", "Information", "information"),
  loadCategory("internet", "Internet", "internet"),
  loadCategory("letters", "Letters", "letters"),
  loadCategory("music", "Music", "music"),
  loadCategory("sport", "Sport", "sport"),
  loadCategory("universal", "Universal", "universal"),
  loadCategory("summer", "Summer", "summer"),
  loadCategory("vegetables", "Vegetables", "vegetables"),
];

export default clipartCategories;
