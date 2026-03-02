import React, { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

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
  const rootBySlug = useMemo(() => {
    const map = new Map<string, CategoryTreeNode>();
    tree.forEach((node) => map.set(node.slug.toLowerCase(), node));
    return map;
  }, [tree]);

  const activeRoot = rootBySlug.get(activeSection.toLowerCase()) ?? null;
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
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key)}
                className={`group relative h-28 overflow-hidden rounded-2xl border text-center transition sm:h-32 ${
                  activeSection === tab.key
                    ? "border-[#D1B46F] ring-2 ring-[#E8D39B]"
                    : "border-[#E5D4AF] hover:border-[#D7BE84]"
                }`}
              >
                <img src={tab.image} alt={tab.label} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/45 transition duration-300 group-hover:bg-black/38" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base font-extrabold tracking-[0.18em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                    {tab.label}
                  </span>
                </div>
              </button>
            ))}
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
