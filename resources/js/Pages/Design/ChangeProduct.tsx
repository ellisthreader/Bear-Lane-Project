"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Package,
  Search,
  User,
  Users,
  Baby,
  X,
} from "lucide-react";
import ChangeProductCard from "@/Pages/Product/ChangeProductCard";

type RootKey = "women" | "men" | "kids";

type ProductImage = {
  url?: string;
  path?: string;
};

interface Product {
  id: number;
  brand?: string;
  name: string;
  slug: string;
  price?: number | string;
  original_price?: number | string | null;
  images?: Array<string | ProductImage>;
  image?: string;
  colourProducts?: Array<{ images?: Array<string | ProductImage> }>;
}

interface Category {
  id: number | string;
  name: string;
  slug?: string;
  section?: string;
  subsection?: string | null;
  parent_name?: string | null;
  age_group?: string | null;
  products?: Product[];
}

type MenuNode = {
  id: number;
  name: string;
  slug: string;
  children: MenuNode[];
};

type MenuPayload = Record<
  string,
  {
    tree?: MenuNode | null;
  }
>;

interface ChangeProductModalProps {
  onClose: () => void;
  currentCategory?: Category;
  onSelectProduct: (product: Product) => void;
}

type AudienceTab = {
  key: RootKey;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ROOT_TABS: AudienceTab[] = [
  { key: "women", label: "Women", hint: "Womens categories", icon: Users },
  { key: "men", label: "Men", hint: "Mens categories", icon: User },
  { key: "kids", label: "Kids", hint: "Kids categories", icon: Baby },
];

const normalizeText = (value: unknown): string => String(value ?? "").trim().toLowerCase();

const normalizeSlug = (value: unknown): string => {
  const slug = String(value ?? "").trim().toLowerCase();
  return slug.replace(/^\/+/, "").replace(/\/+$/, "");
};

const titleCase = (value: string): string =>
  value
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const buildProductImages = (product: Product): string[] => {
  const images = Array.isArray(product.images)
    ? product.images
        .map((img) => {
          if (!img) return "";
          if (typeof img === "string") return img;
          return img.url ?? img.path ?? "";
        })
        .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
    : [];

  if (images.length > 0) return images;

  if (typeof product.image === "string" && product.image.trim().length > 0) {
    return [product.image];
  }

  const colourImages = product.colourProducts?.[0]?.images;
  if (Array.isArray(colourImages) && colourImages.length > 0) {
    return colourImages
      .map((img) => {
        if (!img) return "";
        if (typeof img === "string") return img;
        return img.url ?? img.path ?? "";
      })
      .filter((img): img is string => typeof img === "string" && img.trim().length > 0);
  }

  return ["/images/no-image.png"];
};

const dedupeProductsById = (products: Product[]): Product[] => {
  const map = new Map<number, Product>();
  products.forEach((product) => {
    map.set(product.id, product);
  });
  return Array.from(map.values());
};

const collectNodes = (node: MenuNode | null): MenuNode[] => {
  if (!node) return [];
  return [node, ...node.children.flatMap((child) => collectNodes(child))];
};

const getRootKeyFromCategory = (category?: Category): RootKey | null => {
  if (!category) return null;

  const slugParts = normalizeSlug(category.slug).split("/").filter(Boolean);
  const first = slugParts[0];
  if (first === "women" || first === "men" || first === "kids") return first;

  const section = normalizeText(category.section);
  if (section === "women" || section === "men" || section === "kids") return section;

  return null;
};

const getRootKeyFromSlug = (slug: string): RootKey | null => {
  const first = normalizeSlug(slug).split("/").filter(Boolean)[0];
  if (first === "women" || first === "men" || first === "kids") return first;
  return null;
};

export default function ChangeProductModal({
  onClose,
  currentCategory,
  onSelectProduct,
}: ChangeProductModalProps) {
  const { props } = usePage<{
    adultCategories?: Category[];
    kidsCategories?: Record<string, Category[]>;
  }>();

  const [menuPayload, setMenuPayload] = useState<MenuPayload | null>(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  const initialRoot = getRootKeyFromCategory(currentCategory) ?? "men";
  const [selectedRoot, setSelectedRoot] = useState<RootKey>(initialRoot);
  const [path, setPath] = useState<MenuNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const adultCategories = Array.isArray(props.adultCategories) ? props.adultCategories : [];
  const kidsCategories =
    props.kidsCategories && typeof props.kidsCategories === "object" ? props.kidsCategories : {};

  const allCategories = useMemo<Category[]>(() => {
    return [
      ...adultCategories,
      ...Object.values(kidsCategories)
        .flat()
        .filter(Boolean),
    ];
  }, [adultCategories, kidsCategories]);

  const categoryProductsBySlug = useMemo(() => {
    const map = new Map<string, Product[]>();

    allCategories.forEach((category) => {
      const key = normalizeSlug(category.slug);
      if (!key) return;

      const normalizedProducts = (category.products ?? []).map((product) => ({
        ...product,
        brand: String(product.brand ?? "Brand"),
        price: product.price ?? 0,
        images: buildProductImages(product),
      }));

      const existing = map.get(key) ?? [];
      map.set(key, dedupeProductsById([...existing, ...normalizedProducts]));
    });

    return map;
  }, [allCategories]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setMenuLoading(true);
        setMenuError(null);
        const response = await fetch("/menu/categories", {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Failed (${response.status})`);
        }

        const payload = (await response.json()) as MenuPayload;
        if (!cancelled) setMenuPayload(payload);
      } catch {
        if (!cancelled) {
          setMenuError("Unable to load category menu.");
          setMenuPayload(null);
        }
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const rootNode = useMemo<MenuNode | null>(
    () => (menuPayload?.[selectedRoot]?.tree as MenuNode | null) ?? null,
    [menuPayload, selectedRoot]
  );

  useEffect(() => {
    setPath([]);
  }, [selectedRoot]);

  useEffect(() => {
    if (!rootNode || !currentCategory) return;

    const targetSlug = normalizeSlug(currentCategory.slug);
    if (!targetSlug || getRootKeyFromSlug(targetSlug) !== selectedRoot) return;

    const findPath = (node: MenuNode, target: string, trail: MenuNode[]): MenuNode[] | null => {
      if (normalizeSlug(node.slug) === target) return trail;

      for (const child of node.children) {
        const found = findPath(child, target, [...trail, child]);
        if (found) return found;
      }

      return null;
    };

    const matchedPath = findPath(rootNode, targetSlug, []);
    if (!matchedPath) return;

    setPath(matchedPath.slice(0, -1));
  }, [currentCategory, rootNode, selectedRoot]);

  const currentNode = path.length > 0 ? path[path.length - 1] : rootNode;
  const navOptions = currentNode?.children ?? [];

  const collectProductsForNode = (node: MenuNode): Product[] => {
    const products = new Map<number, Product>();

    const walk = (candidate: MenuNode) => {
      const key = normalizeSlug(candidate.slug);
      const candidateProducts = categoryProductsBySlug.get(key) ?? [];

      candidateProducts.forEach((product) => {
        products.set(product.id, product);
      });

      candidate.children.forEach((child) => walk(child));
    };

    walk(node);

    return Array.from(products.values());
  };

  const sectionsForDisplay = useMemo(() => {
    if (!currentNode) return [];

    const nodes = currentNode.children.length > 0 ? currentNode.children : [currentNode];
    return nodes.map((node) => ({
      node,
      products: collectProductsForNode(node),
    }));
  }, [currentNode, categoryProductsBySlug]);

  const selectedPathLabel = useMemo(() => {
    const rootLabel = ROOT_TABS.find((tab) => tab.key === selectedRoot)?.label ?? titleCase(selectedRoot);
    const names = path.map((node) => titleCase(node.name));
    return [rootLabel, ...names].join(" / ");
  }, [selectedRoot, path]);

  const allSearchableNodes = useMemo(() => {
    if (!rootNode) return [];
    return collectNodes(rootNode).filter((node) => normalizeSlug(node.slug) !== normalizeSlug(rootNode.slug));
  }, [rootNode]);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const matchingSections = useMemo(() => {
    if (!trimmedQuery) return [];

    return allSearchableNodes
      .filter((node) => {
        const blob = normalizeText(`${node.name} ${node.slug}`);
        return blob.includes(trimmedQuery);
      })
      .slice(0, 14);
  }, [allSearchableNodes, trimmedQuery]);

  const matchingProducts = useMemo(() => {
    if (!trimmedQuery) return [];

    const items = new Map<number, { product: Product; sectionName: string }>();

    allSearchableNodes.forEach((node) => {
      const products = collectProductsForNode(node);
      products.forEach((product) => {
        const productBlob = normalizeText(`${product.name} ${product.brand} ${product.slug}`);
        if (!productBlob.includes(trimmedQuery)) return;

        if (!items.has(product.id)) {
          items.set(product.id, {
            product,
            sectionName: titleCase(node.name),
          });
        }
      });
    });

    return Array.from(items.values()).slice(0, 80);
  }, [allSearchableNodes, trimmedQuery, categoryProductsBySlug]);

  const handleProductPick = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };

  const openNode = (node: MenuNode) => {
    if (node.children.length === 0) {
      setPath((prev) => [...prev, node]);
      return;
    }

    setPath((prev) => [...prev, node]);
  };

  const jumpToSection = (node: MenuNode) => {
    const rootFromNode = getRootKeyFromSlug(node.slug);
    if (!rootFromNode) return;

    if (rootFromNode !== selectedRoot) {
      setSelectedRoot(rootFromNode);
    }

    const rebuildPath = (root: MenuNode | null, targetSlug: string): MenuNode[] => {
      if (!root) return [];
      const dfs = (candidate: MenuNode, trail: MenuNode[]): MenuNode[] | null => {
        if (normalizeSlug(candidate.slug) === targetSlug) return trail;
        for (const child of candidate.children) {
          const found = dfs(child, [...trail, child]);
          if (found) return found;
        }
        return null;
      };
      return dfs(root, []) ?? [];
    };

    const treeToUse =
      rootFromNode === selectedRoot
        ? rootNode
        : ((menuPayload?.[rootFromNode]?.tree as MenuNode | null) ?? null);

    const nextPath = rebuildPath(treeToUse, normalizeSlug(node.slug));
    setPath(nextPath.slice(0, -1));
    setSearchQuery("");
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-[#1A1307]/70 backdrop-blur-md px-0 py-0 sm:px-4 sm:py-6"
      onClick={onClose}
    >
      <div
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-[#E7D6B8] bg-[#FFFCF7] shadow-[0_35px_120px_rgba(26,19,7,0.45)] sm:h-[min(93vh,980px)] sm:w-[min(1540px,99vw)] sm:rounded-[30px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative overflow-hidden border-b border-[#E6D7BC] bg-gradient-to-r from-[#FFF6E8] via-[#FFF9F0] to-[#FAF0DE] px-4 pb-4 pt-4 sm:px-7 sm:pb-6 sm:pt-7">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#E7C57B]/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-24 h-44 w-44 rounded-full bg-[#DAB468]/20 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B6A2E]">Design Editor</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#2F2415] sm:text-3xl">Change Product</h2>
              <p className="mt-2 max-w-3xl text-xs text-[#6F5A35] sm:text-sm">
                Same structure as the main navbar: choose Men, Women or Kids, browse sections, then switch products.
              </p>
            </div>

            <button
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D8C094] bg-white/90 text-[#6B5326] transition hover:-translate-y-0.5 hover:bg-white sm:h-11 sm:w-11"
              aria-label="Close change product modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:mt-5 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8D7141]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search products, categories and sections..."
                className="h-11 w-full rounded-2xl border border-[#DDC9A3] bg-white/90 pl-11 pr-4 text-sm font-medium text-[#2F2415] outline-none ring-[#C6A75E]/35 transition placeholder:text-[#9D8458] focus:border-[#C6A75E] focus:ring-4 sm:h-12"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {ROOT_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedRoot === tab.key;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedRoot(tab.key)}
                    className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                      isActive
                        ? "border-[#B68F43] bg-[#B68F43] text-white shadow-[0_10px_20px_rgba(182,143,67,0.35)]"
                        : "border-[#E5D4B4] bg-white/80 text-[#5A4828] hover:border-[#D3BA8B] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                    <div className={`mt-0.5 text-xs ${isActive ? "text-[#F9ECD4]" : "text-[#8F7547]"}`}>{tab.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(210px,38%)_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-none">
          <aside className="min-h-0 border-b border-[#E6D7BC] bg-[#FFF8EC] p-3 sm:p-4 lg:border-b-0 lg:border-r">
            <div className="h-full overflow-y-auto pr-1">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8C7448]">Sections</p>
                {path.length > 0 && (
                  <button
                    onClick={() => setPath((prev) => prev.slice(0, -1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#DFC8A0] bg-white px-2.5 py-1 text-xs font-semibold text-[#6E5528] hover:border-[#C6A75E]"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-[#E5D4B4] bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#7A6238]">
                {selectedPathLabel}
              </div>

              <div className="mt-3 space-y-2">
                {menuLoading && (
                  <div className="rounded-xl border border-dashed border-[#DCC9A6] bg-white/70 px-3 py-4 text-sm text-[#8B7347]">
                    Loading categories...
                  </div>
                )}

                {!menuLoading && menuError && (
                  <div className="rounded-xl border border-dashed border-[#DCC9A6] bg-white/70 px-3 py-4 text-sm text-[#8B7347]">
                    {menuError}
                  </div>
                )}

                {!menuLoading && !menuError && navOptions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#DCC9A6] bg-white/70 px-3 py-4 text-sm text-[#8B7347]">
                    No deeper sections here.
                  </div>
                )}

                {!menuLoading && !menuError && navOptions.map((node) => {
                  const count = collectProductsForNode(node).length;
                  return (
                    <button
                      key={node.id}
                      onClick={() => openNode(node)}
                      className="w-full rounded-xl border border-[#E8DABF] bg-white px-3 py-3 text-left transition hover:border-[#C6A75E]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[#3D2F1A]">{titleCase(node.name)}</span>
                        <ChevronRight className="h-4 w-4 text-[#8A6D39]" />
                      </div>
                      <div className="mt-1 text-xs text-[#8C7447]">{count} products</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <main className="min-h-0 bg-white p-4 sm:p-6">
            {trimmedQuery ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-4 rounded-2xl border border-[#E8DABC] bg-[#FFF9EE] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8C7447]">Search Results</div>
                  <p className="mt-1 text-sm text-[#5C492B]">
                    {matchingProducts.length} products and {matchingSections.length} sections for "
                    <span className="font-semibold">{searchQuery}</span>"
                  </p>
                </div>

                {matchingSections.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#4A3A1F]">
                      <FolderOpen className="h-4 w-4 text-[#A37D3A]" />
                      Matching Sections
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {matchingSections.map((node) => (
                        <button
                          key={node.id}
                          onClick={() => jumpToSection(node)}
                          className="rounded-full border border-[#DEC9A1] bg-[#FFF5E3] px-3 py-1.5 text-xs font-semibold text-[#6E5529] transition hover:border-[#C6A75E] hover:bg-[#FDEBC9]"
                        >
                          {titleCase(node.name)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {matchingProducts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {matchingProducts.map(({ product, sectionName }) => (
                        <div key={product.id} className="flex flex-col gap-2">
                          <div className="rounded-xl border border-[#ECDCBD] bg-[#FFFAF1] px-3 py-2 text-xs font-medium text-[#7F6639]">
                            {sectionName}
                          </div>
                          <ChangeProductCard
                            product={{
                              ...product,
                              brand: String(product.brand ?? "Brand"),
                              price: product.price ?? 0,
                              images: buildProductImages(product),
                            }}
                            onSelect={() => handleProductPick(product)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[#DEC9A1] bg-[#FFF9EF] p-8 text-center">
                      <div>
                        <Package className="mx-auto h-10 w-10 text-[#B8944F]" />
                        <p className="mt-3 text-base font-semibold text-[#6C5428]">No products matched your search</p>
                        <p className="mt-1 text-sm text-[#8C7447]">Try another product name or section keyword.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-4 rounded-2xl border border-[#E6D7BC] bg-[#FFF9EF] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7347]">
                    <span>{selectedPathLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#5D4A2C]">
                    Showing all sections and products for this navbar level.
                  </p>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                  {sectionsForDisplay.length > 0 ? (
                    sectionsForDisplay.map(({ node, products }) => (
                      <section key={node.id} className="rounded-3xl border border-[#E6D8BD] bg-[#FFFCF6] p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#E8DCC7] pb-3">
                          <div>
                            <h3 className="text-lg font-bold text-[#2F2415]">{titleCase(node.name)}</h3>
                            <p className="text-xs text-[#8A7147]">{products.length} products in this section</p>
                          </div>
                          {node.children.length > 0 && (
                            <button
                              onClick={() => openNode(node)}
                              className="rounded-lg border border-[#D8C094] bg-white px-3 py-1.5 text-xs font-semibold text-[#72592B] hover:border-[#C6A75E]"
                            >
                              Open Section
                            </button>
                          )}
                        </div>

                        {products.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {products.map((product) => (
                              <ChangeProductCard
                                key={product.id}
                                product={{
                                  ...product,
                                  brand: String(product.brand ?? "Brand"),
                                  price: product.price ?? 0,
                                  images: buildProductImages(product),
                                }}
                                onSelect={() => handleProductPick(product)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[#DEC9A1] bg-[#FFF9EF] p-6 text-center text-sm text-[#8C7447]">
                            No products in this section yet.
                          </div>
                        )}
                      </section>
                    ))
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-[#DEC9A1] bg-[#FFF9EF] p-8 text-center">
                      <div>
                        <Package className="mx-auto h-10 w-10 text-[#B8944F]" />
                        <p className="mt-3 text-base font-semibold text-[#6C5428]">No sections available</p>
                        <p className="mt-1 text-sm text-[#8C7447]">Try another top category tab.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
