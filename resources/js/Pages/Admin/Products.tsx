import React, { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";
import { CheckCircle2 } from "lucide-react";

type Category = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
};

type Props = {
  categories: Category[];
  products?: unknown[];
};

type CategoryTreeNode = Category & { children: CategoryTreeNode[] };

const SECTION_TABS = [
  { key: "men", label: "MEN", image: "/images/Admin/MenCategory.jpeg" },
  { key: "women", label: "WOMEN", image: "/images/Admin/WomenCategory.jpeg" },
  { key: "kids", label: "KIDS", image: "/images/Admin/KidsCategory.jpeg" },
  { key: "sale", label: "SALE", image: "/images/Admin/SaleCategory.jpeg" },
] as const;

const SECTION_ROOT_ALIASES: Record<string, string[]> = {
  men: ["men", "mens", "man"],
  women: ["women", "womens", "woman", "ladies", "female"],
  kids: ["kids", "kid", "children", "child", "youth", "junior"],
  sale: ["sale", "sales", "discount", "offers", "clearance", "outlet"],
};

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const getCsrfToken = () =>
  document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

function buildTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  categories.forEach((category) => map.set(category.id, { ...category, children: [] }));

  const roots: CategoryTreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
      return;
    }
    roots.push(node);
  });

  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
}

export default function Products({ categories }: Props) {
  const [activeSection, setActiveSection] = useState<string>("men");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubByCategory, setNewSubByCategory] = useState<Record<number, { name: string }>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const activeRoot = useMemo(() => {
    const sectionKey = activeSection.toLowerCase();
    const aliases = SECTION_ROOT_ALIASES[sectionKey] ?? [sectionKey];
    const aliasSet = new Set(aliases.map(normalizeToken));

    const exactSlug = tree.find((node) => normalizeToken(node.slug) === normalizeToken(sectionKey));
    if (exactSlug) return exactSlug;

    const slugMatch = tree.find((node) => {
      const slugToken = normalizeToken(node.slug);
      return aliases.some((alias) => slugToken.includes(normalizeToken(alias)));
    });
    if (slugMatch) return slugMatch;

    const nameMatch = tree.find((node) => {
      const nameToken = normalizeToken(node.name);
      if (aliasSet.has(nameToken)) return true;
      return aliases.some((alias) => nameToken.includes(normalizeToken(alias)));
    });
    if (nameMatch) return nameMatch;

    return null;
  }, [activeSection, tree]);
  const sectionCategories = activeRoot?.children ?? [];

  const reload = () => router.reload({ only: ["categories"] });

  const resetFeedback = () => {
    setError(null);
    setMessage(null);
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    );
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    resetFeedback();
    try {
      const response = await fetch(`/admin/categories/${editingId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ name: editName }),
      });
      if (!response.ok) throw new Error("Unable to update category.");
      setEditingId(null);
      setMessage("Saved changes.");
      reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update category.");
    } finally {
      setLoading(false);
    }
  };

  const removeCategory = async (categoryId: number) => {
    if (!confirm("Delete this category?")) return;
    setLoading(true);
    resetFeedback();
    try {
      const response = await fetch(`/admin/categories/${categoryId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!response.ok) throw new Error("Unable to delete category.");
      setExpandedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
      setMessage("Category deleted.");
      reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete category.");
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeRoot) {
      setError(`Section root "${activeSection}" does not exist in DB.`);
      return;
    }
    setLoading(true);
    resetFeedback();
    try {
      const response = await fetch("/admin/categories", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          name: newCategoryName,
          parent_id: activeRoot.id,
        }),
      });
      if (!response.ok) throw new Error("Unable to add category.");
      setNewCategoryName("");
      setMessage("Category added.");
      reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add category.");
    } finally {
      setLoading(false);
    }
  };

  const createSubcategory = async (parentCategoryId: number) => {
    const payload = newSubByCategory[parentCategoryId];
    if (!payload?.name?.trim()) return;
    setLoading(true);
    resetFeedback();
    try {
      const response = await fetch("/admin/categories", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          name: payload.name,
          parent_id: parentCategoryId,
        }),
      });
      if (!response.ok) throw new Error("Unable to add subcategory.");
      setNewSubByCategory((prev) => ({
        ...prev,
        [parentCategoryId]: { name: "" },
      }));
      setExpandedCategoryIds((prev) => (prev.includes(parentCategoryId) ? prev : [...prev, parentCategoryId]));
      setMessage("Subcategory added.");
      reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add subcategory.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <div className="min-h-screen bg-[#FAF8F2] px-6 py-10 text-[#2D2515] sm:px-10">
        <div className="mx-auto w-full max-w-6xl rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Product Navbar Categories</h1>
          <p className="mt-1 text-sm text-[#6B5A34]">
            Slugs are generated automatically in path format, for example: `men/accessories/bears`.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SECTION_TABS.map((tab) => (
              (() => {
                const isActive = activeSection === tab.key;
                return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key)}
                aria-pressed={isActive}
                className={`group relative h-28 overflow-hidden rounded-2xl border text-center transition-all duration-200 sm:h-32 ${
                  isActive
                    ? "border-[#B38A2D] ring-2 ring-[#E0BF68] shadow-[0_0_0_3px_rgba(224,191,104,0.22),0_10px_24px_rgba(123,90,25,0.22)] scale-[1.01]"
                    : "border-[#E5D4AF] opacity-90 hover:border-[#D7BE84] hover:opacity-100"
                }`}
              >
                <img loading="lazy" decoding="async" src={tab.image} alt={tab.label} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <div className={`absolute inset-0 transition duration-300 ${isActive ? "bg-black/35" : "bg-black/45 group-hover:bg-black/38"}`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-base font-extrabold tracking-[0.18em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] ${isActive ? "text-[#FFE9B0]" : "text-white"}`}>
                    {tab.label}
                  </span>
                </div>
                {isActive ? (
                  <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[#F2DC9E] bg-[#3B2C10]/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#FFE8AA]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Selected
                  </div>
                ) : null}
              </button>
                );
              })()
            ))}
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#DCC48F] bg-[#FFF8E8] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#7B6530]">
            <CheckCircle2 className="h-4 w-4 text-[#B38A2D]" />
            Active Section: {activeSection}
          </div>

          <form onSubmit={createCategory} className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-[#E5D4AF] bg-[#FFFDF7] p-4 md:grid-cols-2">
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder={`Add category to ${activeSection.toUpperCase()} (e.g. Accessories)`}
              className="rounded-xl border border-[#DCC99D] bg-white px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              disabled={loading || newCategoryName.trim() === ""}
              className="rounded-xl border border-[#D7BE84] bg-[#FFFCF4] px-4 py-2 text-sm font-semibold text-[#7B6530] disabled:opacity-60"
            >
              Add Category
            </button>
          </form>

          {message ? <p className="mt-3 text-sm text-[#3E6A1B]">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-[#8C3232]">{error}</p> : null}

          <div className="mt-6 space-y-3">
            {sectionCategories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#DCC99D] bg-[#FFFEFA] p-4 text-sm text-[#7B6530]">
                No categories yet in {activeSection.toUpperCase()}.
              </div>
            ) : (
              sectionCategories.map((category) => {
                const isExpanded = expandedCategoryIds.includes(category.id);
                const subForm = newSubByCategory[category.id] || { name: "" };

                return (
                  <div key={category.id} className="rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA] p-4">
                    <div
                      className="flex cursor-pointer flex-wrap items-center justify-between gap-3"
                      onClick={() => toggleCategory(category.id)}
                    >
                      <div>
                        <p className="text-base font-semibold text-[#3B2F16]">{category.name}</p>
                        <p className="text-xs text-[#7A6640]">/category/{category.slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1 text-xs font-semibold text-[#7B6530]">
                          {isExpanded ? "Hide Subcategories" : "Show Subcategories"}
                        </span>
                        {editingId === category.id ? (
                          <>
                            <input
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              onClick={(event) => event.stopPropagation()}
                              className="w-40 rounded-lg border border-[#DCC99D] px-2 py-1 text-xs"
                              placeholder="Name"
                            />
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                saveEdit();
                              }}
                              disabled={loading}
                              className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-1 text-xs font-semibold text-[#7B6530]"
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              startEdit(category);
                            }}
                            className="rounded-lg border border-[#D7BE84] bg-white px-3 py-1 text-xs font-semibold text-[#7B6530]"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeCategory(category.id);
                          }}
                          className="rounded-lg border border-[#E3B9B9] bg-[#FFF3F3] px-3 py-1 text-xs font-semibold text-[#8C3232]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-[#EFE4CC] pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6D2B]">Subcategories</p>

                        {category.children.length === 0 ? (
                          <p className="text-sm text-[#7B6530]">No subcategories yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {category.children.map((sub) => (
                              <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EBDDBF] bg-[#FFFDF7] px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-[#3B2F16]">{sub.name}</p>
                                  <p className="text-xs text-[#7A6640]">/category/{sub.slug}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={`/category/${sub.slug}?product_mode=1`}
                                    className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-2 py-1 text-xs font-semibold text-[#7B6530]"
                                  >
                                    Edit Products
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(sub)}
                                    className="rounded-lg border border-[#D7BE84] bg-white px-2 py-1 text-xs font-semibold text-[#7B6530]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeCategory(sub.id)}
                                    className="rounded-lg border border-[#E3B9B9] bg-[#FFF3F3] px-2 py-1 text-xs font-semibold text-[#8C3232]"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#E5D4AF] bg-white p-3 sm:grid-cols-2">
                          <input
                            value={subForm.name}
                            onChange={(event) =>
                              setNewSubByCategory((prev) => ({
                                ...prev,
                                [category.id]: { name: event.target.value },
                              }))
                            }
                            placeholder="Add subcategory (e.g. Bears)"
                            className="rounded-lg border border-[#DCC99D] px-2 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => createSubcategory(category.id)}
                            disabled={loading || !subForm.name?.trim()}
                            className="rounded-lg border border-[#D7BE84] bg-[#FFFCF4] px-3 py-2 text-sm font-semibold text-[#7B6530] disabled:opacity-60"
                          >
                            Add Subcategory
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
