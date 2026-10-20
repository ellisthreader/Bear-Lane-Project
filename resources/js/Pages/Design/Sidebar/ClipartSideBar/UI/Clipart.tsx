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
    if (forceSections && activeCategoryId !== null) {
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
            setActiveCategoryId(null);
            setSidebarTitle?.(null);
            setSidebarBackOverride?.(false);
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
