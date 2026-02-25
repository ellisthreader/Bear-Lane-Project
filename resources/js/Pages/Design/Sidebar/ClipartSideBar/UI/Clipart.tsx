import { useEffect, useState } from "react";
import clipartCategories from "./clipartCategories";
import ClipartSectionsPage from "./ClipartSectionsPage";
import ClipartItemsPage from "./ClipartItemsPage";

interface ClipartProps {
  onAddClipart: (src: string) => void;
  forceSections?: boolean;
  setSidebarTitle?: (title: string | null) => void;
  setSidebarBackOverride?: (value: boolean) => void;
  onBack: () => void; // goBackSidebar
}

export default function Clipart({
  onAddClipart,
  forceSections,
  setSidebarTitle,
  setSidebarBackOverride,
  onBack,
}: ClipartProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // 🔍 DEBUG
  useEffect(() => {
    console.log("[Clipart] activeCategoryId =", activeCategoryId);
  }, [activeCategoryId]);

  // 🔁 Force reset when "Change Art" is clicked
  useEffect(() => {
    if (forceSections && activeCategoryId !== null) {
      console.log("[Clipart] forceSections → resetting to sections");

      setActiveCategoryId(null);
      setSidebarTitle?.(null);
      setSidebarBackOverride?.(false);
    }
  }, [forceSections, activeCategoryId, setSidebarTitle, setSidebarBackOverride]);

  const activeCategory = clipartCategories.find(
    (c) => c.id === activeCategoryId
  );

  return (
    <div className="p-4">

      {/* ---------------- SECTIONS ---------------- */}
      {!activeCategory && (
        <ClipartSectionsPage
          categories={clipartCategories}
          onSelectCategory={(id) => {
            const category = clipartCategories.find((c) => c.id === id);
            if (!category) return;

            console.log("[Clipart] Category selected:", category.name);

            setActiveCategoryId(id);

            // UI updates
            setSidebarTitle?.(`Clipart – ${category.name}`);
            setSidebarBackOverride?.(true);
          }}
        />
      )}

      {/* ---------------- ITEMS ---------------- */}
      {activeCategory && (
        <ClipartItemsPage
          category={activeCategory}
          onBack={() => {
            console.log("[Clipart] Item page back clicked");

            // Local UI cleanup
            setActiveCategoryId(null);
            setSidebarTitle?.(null);
            setSidebarBackOverride?.(false);

            // ⬅️ REAL navigation (pop sidebar stack)
            console.log("[Clipart] Calling onBack()");
            onBack();
          }}
          onAddClipart={onAddClipart}
          setSidebarTitle={setSidebarTitle}
          setSidebarBackOverride={setSidebarBackOverride}
        />
      )}
    </div>
  );
}
