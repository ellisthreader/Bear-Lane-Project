import { ClipartCategoryType } from "./types";

/**
 * 🔹 VITE GLOB PATH MUST MATCH EXACT FOLDER STRUCTURE + CASE
 * Your folder: resources/js/assets/clipart
 * Current file: resources/js/Pages/Design/Sidebar/ClipartSideBar/clipartCategories.ts
 * So we go up 3 levels: ../../../assets/clipart/**
 */

const allClipartModules = import.meta.glob(
  "/resources/js/assets/clipart/**/*.{svg,png}",
  { eager: true }
) as Record<string, { default: string }>;

console.log("🧠 ALL CLIPART MODULES:", allClipartModules);

if (Object.keys(allClipartModules).length === 0) {
  console.error("❌ VITE CANNOT SEE CLIPART FILES. Check path & casing.");
}


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
    .map(([filePath, mod]) => {
      const fileName = filePath.split("/").pop() ?? "clipart";

      const label = fileName
        .replace(/\.(svg|png)$/i, "")
        .replace(/[-_]/g, " ");

      console.log(`📂 CATEGORY: ${id} | FILE: ${filePath} | LABEL: ${label}`);

      return {
        id: filePath,
        src: mod.default,
        label, // always a string ✅
      };
    });

  console.log(`🔢 CATEGORY "${name}" ITEMS COUNT:`, items.length);

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

console.log("✅ FINAL CLIPART CATEGORIES LOADED:", clipartCategories.map(c => ({ id: c.id, items: c.items.length })));

export default clipartCategories;
