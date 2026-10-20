import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import { toast } from "react-toastify";
import {
  Check,
  ChevronRight,
  CornerDownRight,
  FolderTree,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  AdminPage,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Input,
  Notice,
  PlusMinusButton,
  SegmentedTabs,
  Select,
  adminFetch,
} from "@/Components/Admin/ui";
import SortableList, { DragHandle } from "@/Components/Admin/SortableList";

/*
 * Categories & Subcategories manager.
 *
 * One calm tree per storefront section. Every node, at any depth, can be renamed,
 * removed, reordered by dragging, moved under another parent, and given a new
 * subcategory with a single click, so "Women → Accessories → Bags" is as easy to
 * build as "Women → Clothing → T-Shirts".
 */

type Category = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
  products_count: number;
};

type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: number;
  image: string | null;
  category_ids: number[];
  is_premade_design: boolean;
};

type Props = {
  categories: Category[];
  products?: ProductSummary[];
};

type TreeNode = Category & { children: TreeNode[] };

type SectionKey = "women" | "men" | "kids" | "sale";

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "women", label: "Women" },
  { key: "men", label: "Men" },
  { key: "kids", label: "Kids" },
  { key: "sale", label: "Sale" },
];

const SECTION_ROOT_ALIASES: Record<SectionKey, string[]> = {
  men: ["men", "mens", "man"],
  women: ["women", "womens", "woman", "ladies", "female"],
  kids: ["kids", "kid", "children", "child", "youth", "junior"],
  sale: ["sale", "sales", "discount", "offers", "clearance", "outlet"],
};

const normalizeToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

function buildTree(categories: Category[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  categories.forEach((category) => map.set(category.id, { ...category, children: [] }));

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
      return;
    }
    roots.push(node);
  });

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
}

function findRoot(roots: TreeNode[], section: SectionKey): TreeNode | null {
  const aliases = SECTION_ROOT_ALIASES[section];
  const exact = roots.find((node) => normalizeToken(node.slug) === normalizeToken(section));
  if (exact) return exact;
  const slugMatch = roots.find((node) => aliases.some((alias) => normalizeToken(node.slug).includes(normalizeToken(alias))));
  if (slugMatch) return slugMatch;
  const nameMatch = roots.find((node) => aliases.some((alias) => normalizeToken(node.name).includes(normalizeToken(alias))));
  return nameMatch ?? null;
}

const countDescendants = (node: TreeNode): number =>
  node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);

const collectIds = (node: TreeNode): number[] => [node.id, ...node.children.flatMap(collectIds)];

/** Nodes matching the search, plus every ancestor of a match, in tree order. */
function filterTree(nodes: TreeNode[], query: string): { nodes: TreeNode[]; matchedIds: Set<number> } {
  const matched = new Set<number>();
  const q = query.trim().toLowerCase();
  if (!q) return { nodes, matchedIds: matched };

  const walk = (list: TreeNode[]): TreeNode[] =>
    list
      .map((node) => {
        const children = walk(node.children);
        const selfMatch = node.name.toLowerCase().includes(q) || node.slug.toLowerCase().includes(q);
        if (selfMatch || children.length > 0) {
          matched.add(node.id);
          return { ...node, children: selfMatch ? node.children : children };
        }
        return null;
      })
      .filter((node): node is TreeNode => node !== null);

  return { nodes: walk(nodes), matchedIds: matched };
}

export default function Products({ categories: initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [activeSection, setActiveSection] = useState<SectionKey>("women");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [addingUnder, setAddingUnder] = useState<number | "root" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [creatingRoot, setCreatingRoot] = useState(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const root = useMemo(() => findRoot(tree, activeSection), [tree, activeSection]);
  const sectionLabel = SECTIONS.find((section) => section.key === activeSection)?.label ?? "Section";

  const { nodes: visibleNodes, matchedIds } = useMemo(
    () => filterTree(root?.children ?? [], search),
    [root, search]
  );
  const isSearching = search.trim() !== "";

  const sectionCounts = useMemo(() => {
    const counts: Partial<Record<SectionKey, number>> = {};
    SECTIONS.forEach((section) => {
      const node = findRoot(tree, section.key);
      counts[section.key] = node ? countDescendants(node) : 0;
    });
    return counts;
  }, [tree]);

  const setBusy = (id: number, busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  const refreshTree = useCallback(async () => {
    try {
      const data = await adminFetch<{ categories: Category[] }>("/admin/categories/tree");
      if (Array.isArray(data?.categories)) setCategories(data.categories);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh categories.");
    }
  }, []);

  const toggleExpanded = (id: number) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expand = (id: number) =>
    setExpandedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  /* ---------------- mutations ---------------- */

  const addCategory = async (name: string, parentId: number | null) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    try {
      const data = await adminFetch<{ category?: Category }>("/admin/categories", {
        method: "POST",
        body: { name: trimmed, parent_id: parentId },
      });
      if (data?.category) {
        setCategories((prev) => [...prev, data.category as Category]);
      } else {
        await refreshTree();
      }
      if (parentId) expand(parentId);
      toast.success(`Added "${trimmed}".`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add category.");
      return false;
    }
  };

  const renameCategory = async (id: number, name: string) => {
    const trimmed = name.trim();
    const current = categories.find((category) => category.id === id);
    if (!trimmed || !current) return false;
    if (trimmed === current.name) return true;

    setBusy(id, true);
    const previous = categories;
    setCategories((prev) => prev.map((category) => (category.id === id ? { ...category, name: trimmed } : category)));
    try {
      await adminFetch(`/admin/categories/${id}`, { method: "PATCH", body: { name: trimmed } });
      toast.success("Renamed.");
      await refreshTree(); // slugs of descendants change with the name
      return true;
    } catch (error) {
      setCategories(previous);
      toast.error(error instanceof Error ? error.message : "Unable to rename category.");
      return false;
    } finally {
      setBusy(id, false);
    }
  };

  const removeCategory = async (node: TreeNode) => {
    setBusy(node.id, true);
    const previous = categories;
    const ids = new Set(collectIds(node));
    setCategories((prev) => prev.filter((category) => !ids.has(category.id)));
    try {
      await adminFetch(`/admin/categories/${node.id}`, { method: "DELETE" });
      toast.success(`Removed "${node.name}".`);
    } catch (error) {
      setCategories(previous);
      toast.error(error instanceof Error ? error.message : "Unable to remove category.");
    } finally {
      setBusy(node.id, false);
      setConfirmingId(null);
    }
  };

  const reorderSiblings = async (siblings: TreeNode[]) => {
    const previous = categories;
    const orderById = new Map(siblings.map((node, index) => [node.id, index + 1]));
    setCategories((prev) =>
      prev.map((category) =>
        orderById.has(category.id) ? { ...category, sort_order: orderById.get(category.id)! } : category
      )
    );
    try {
      const data = await adminFetch<{ categories?: Category[] }>("/admin/categories/reorder", {
        method: "PATCH",
        body: { items: siblings.map((node, index) => ({ id: node.id, sort_order: index + 1 })) },
      });
      if (Array.isArray(data?.categories)) setCategories(data.categories);
    } catch (error) {
      setCategories(previous);
      toast.error(error instanceof Error ? error.message : "Unable to save the new order.");
    }
  };

  const moveCategory = async (node: TreeNode, newParentId: number) => {
    if (newParentId === node.parent_id) return;
    setBusy(node.id, true);
    const previous = categories;
    const siblingCount = categories.filter((category) => category.parent_id === newParentId).length;
    setCategories((prev) =>
      prev.map((category) =>
        category.id === node.id ? { ...category, parent_id: newParentId, sort_order: siblingCount + 1 } : category
      )
    );
    try {
      const data = await adminFetch<{ categories?: Category[] }>("/admin/categories/reorder", {
        method: "PATCH",
        body: { items: [{ id: node.id, sort_order: siblingCount + 1, parent_id: newParentId }] },
      });
      if (Array.isArray(data?.categories)) setCategories(data.categories);
      expand(newParentId);
      toast.success(`Moved "${node.name}".`);
    } catch (error) {
      setCategories(previous);
      toast.error(error instanceof Error ? error.message : "Unable to move category.");
    } finally {
      setBusy(node.id, false);
    }
  };

  const createSectionRoot = async () => {
    setCreatingRoot(true);
    try {
      await adminFetch("/admin/categories", { method: "POST", body: { name: sectionLabel, parent_id: null } });
      await refreshTree();
      toast.success(`Created the ${sectionLabel} section.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create section.");
    } finally {
      setCreatingRoot(false);
    }
  };

  /* ---------------- move targets ---------------- */

  const moveTargetsFor = (node: TreeNode): Array<{ id: number; label: string }> => {
    if (!root) return [];
    const excluded = new Set(collectIds(node));
    const targets: Array<{ id: number; label: string }> = [{ id: root.id, label: `${sectionLabel} (top level)` }];
    const walk = (list: TreeNode[], depth: number) => {
      list.forEach((child) => {
        if (excluded.has(child.id)) return;
        targets.push({ id: child.id, label: `${"— ".repeat(depth)}${child.name}` });
        walk(child.children, depth + 1);
      });
    };
    walk(root.children, 1);
    return targets;
  };

  /* ---------------- rendering ---------------- */

  const renderNodes = (nodes: TreeNode[], depth: number, parentId: number) => (
    <SortableList
      items={nodes}
      getKey={(node) => node.id}
      onReorder={(next) => reorderSiblings(next)}
      disabled={isSearching}
      className={depth === 0 ? "space-y-2" : "space-y-1.5"}
      renderItem={(node, meta) => (
        <CategoryRow
          node={node}
          depth={depth}
          parentId={parentId}
          dragHandle={<DragHandle handleProps={meta.dragHandleProps} />}
          isExpanded={isSearching ? matchedIds.has(node.id) || expandedIds.has(node.id) : expandedIds.has(node.id)}
          isEditing={editingId === node.id}
          isConfirming={confirmingId === node.id}
          isAdding={addingUnder === node.id}
          isBusy={busyIds.has(node.id)}
          moveTargets={moveTargetsFor(node)}
          onToggle={() => toggleExpanded(node.id)}
          onStartEdit={() => {
            setConfirmingId(null);
            setAddingUnder(null);
            setEditingId(node.id);
          }}
          onCancelEdit={() => setEditingId(null)}
          onRename={async (name) => {
            const ok = await renameCategory(node.id, name);
            if (ok) setEditingId(null);
          }}
          onStartAdd={() => {
            setEditingId(null);
            setConfirmingId(null);
            setAddingUnder((prev) => (prev === node.id ? null : node.id));
            expand(node.id);
          }}
          onCancelAdd={() => setAddingUnder(null)}
          onAdd={async (name) => {
            const ok = await addCategory(name, node.id);
            if (ok) setAddingUnder(null);
          }}
          onAskRemove={() => {
            setEditingId(null);
            setAddingUnder(null);
            setConfirmingId((prev) => (prev === node.id ? null : node.id));
          }}
          onCancelRemove={() => setConfirmingId(null)}
          onRemove={() => removeCategory(node)}
          onMove={(targetId) => moveCategory(node, targetId)}
          renderChildren={() => renderNodes(node.children, depth + 1, node.id)}
        />
      )}
    />
  );

  return (
    <AdminPage
      eyebrow="Catalogue"
      title="Categories & Subcategories"
      description="Build the storefront navigation. Drag to reorder, add subcategories under any category, rename or remove in place. Changes go live immediately."
      width="default"
      actions={
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A38A4F]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories…"
            className="pl-9"
            aria-label="Search categories"
          />
        </div>
      }
    >
      <SegmentedTabs
        tabs={SECTIONS.map((section) => ({ key: section.key, label: section.label, count: sectionCounts[section.key] ?? 0 }))}
        value={activeSection}
        onChange={(next) => {
          setActiveSection(next);
          setAddingUnder(null);
          setEditingId(null);
          setConfirmingId(null);
        }}
      />

      {!root ? (
        <Card>
          <EmptyState
            icon={<FolderTree className="h-5 w-5" />}
            title={`The ${sectionLabel} section does not exist yet`}
            description="Create it to start adding categories that appear in the navigation bar."
            action={
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={createSectionRoot} loading={creatingRoot}>
                Create {sectionLabel} section
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6D2B]">{sectionLabel}</p>
              <p className="text-sm text-[#6B5A34]">
                {root.children.length} {root.children.length === 1 ? "category" : "categories"} · {countDescendants(root)} total
                {isSearching ? " · drag ordering paused while searching" : ""}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingId(null);
                setConfirmingId(null);
                setAddingUnder((prev) => (prev === "root" ? null : "root"));
              }}
            >
              Add category to {sectionLabel}
            </Button>
          </div>

          {addingUnder === "root" ? (
            <InlineAddForm
              placeholder={`New category in ${sectionLabel}`}
              onCancel={() => setAddingUnder(null)}
              onSubmit={async (name) => {
                const ok = await addCategory(name, root.id);
                if (ok) setAddingUnder(null);
              }}
              className="mb-3"
            />
          ) : null}

          {visibleNodes.length === 0 ? (
            isSearching ? (
              <EmptyState compact title="No categories match your search" description="Try a different name." />
            ) : (
              <EmptyState
                compact
                icon={<FolderTree className="h-5 w-5" />}
                title={`No categories in ${sectionLabel} yet`}
                description="Add the first one, for example Clothing or Accessories, then add subcategories underneath."
              />
            )
          ) : (
            renderNodes(visibleNodes, 0, root.id)
          )}
        </Card>
      )}

      <Notice tone="info">
        Products are managed inside each category: use <strong>Products</strong> to link existing products or{" "}
        <strong>New product</strong> to build one with pictures, colours, sizes and parcel options.
      </Notice>
    </AdminPage>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

type CategoryRowProps = {
  node: TreeNode;
  depth: number;
  parentId: number;
  dragHandle: React.ReactNode;
  isExpanded: boolean;
  isEditing: boolean;
  isConfirming: boolean;
  isAdding: boolean;
  isBusy: boolean;
  moveTargets: Array<{ id: number; label: string }>;
  onToggle: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRename: (name: string) => Promise<void>;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onAdd: (name: string) => Promise<void>;
  onAskRemove: () => void;
  onCancelRemove: () => void;
  onRemove: () => void;
  onMove: (targetId: number) => void;
  renderChildren: () => React.ReactNode;
};

function CategoryRow({
  node,
  depth,
  parentId,
  dragHandle,
  isExpanded,
  isEditing,
  isConfirming,
  isAdding,
  isBusy,
  moveTargets,
  onToggle,
  onStartEdit,
  onCancelEdit,
  onRename,
  onStartAdd,
  onCancelAdd,
  onAdd,
  onAskRemove,
  onCancelRemove,
  onRemove,
  onMove,
  renderChildren,
}: CategoryRowProps) {
  const hasChildren = node.children.length > 0;
  const descendants = countDescendants(node);
  const showChildren = isExpanded && (hasChildren || isAdding);

  return (
    <div className={depth > 0 ? "relative pl-6" : ""}>
      {depth > 0 ? (
        <span aria-hidden="true" className="absolute left-2 top-0 h-full w-px bg-[#EBE2CF]" />
      ) : null}
      {depth > 0 ? (
        <span aria-hidden="true" className="absolute left-2 top-5 h-px w-4 bg-[#EBE2CF]" />
      ) : null}

      <div
        className={`rounded-2xl border bg-white transition ${
          isConfirming ? "border-[#E5C6C0] bg-[#FFF8F6]" : isAdding || isEditing ? "border-[#E2CC94]" : "border-[#EBE2CF] hover:border-[#D9CBA9]"
        } ${isBusy ? "opacity-60" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-2 px-2 py-2 sm:flex-nowrap sm:px-3">
          {dragHandle}

          <button
            type="button"
            onClick={onToggle}
            disabled={!hasChildren && !isAdding}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
              hasChildren || isAdding ? "text-[#6B5A34] hover:bg-[#F6EFDF]" : "text-[#DDD3BF]"
            }`}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showChildren ? "rotate-90" : ""}`} />
          </button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <InlineRenameForm initial={node.name} onCancel={onCancelEdit} onSubmit={onRename} />
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`truncate font-semibold text-[#1F1A13] ${depth === 0 ? "text-[15px]" : "text-sm"}`}>{node.name}</span>
                <Chip tone={node.products_count > 0 ? "gold" : "neutral"}>
                  <ShoppingBag className="h-3 w-3" />
                  {node.products_count} {node.products_count === 1 ? "product" : "products"}
                </Chip>
                {hasChildren ? <Chip>{descendants} sub</Chip> : null}
                <span className="hidden truncate text-[11px] text-[#A38A4F] lg:inline">/category/{node.slug}</span>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto">
              <Button size="xs" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onStartAdd} title="Add a subcategory inside this category">
                Add subcategory
              </Button>
              <Link
                href={`/category/${node.slug}?product_mode=1`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DCCFB4] bg-white px-2.5 text-xs font-semibold text-[#4E3F1F] transition hover:border-[#C6A75E] hover:bg-[#FFFCF4]"
              >
                <Package className="h-3.5 w-3.5" />
                Products
              </Link>
              <Link
                href={`/admin/products/create-layout?category_id=${node.id}&category_slug=${encodeURIComponent(node.slug)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent bg-[#FFF5DC] px-2.5 text-xs font-semibold text-[#7A5C1E] transition hover:bg-[#FFEEC5]"
              >
                <Plus className="h-3.5 w-3.5" />
                New product
              </Link>
              <MoveSelect targets={moveTargets} currentParentId={parentId} onMove={onMove} disabled={isBusy} />
              <IconButton label={`Rename ${node.name}`} size="sm" onClick={onStartEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <PlusMinusButton mode="remove" size="sm" label={`Remove ${node.name}`} onClick={onAskRemove} disabled={isBusy} />
            </div>
          ) : null}
        </div>

        {isConfirming ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0DCD7] px-3 py-2.5">
            <p className="text-sm text-[#A63D2F]">
              Remove <strong>“{node.name}”</strong>
              {descendants > 0 ? ` and its ${descendants} ${descendants === 1 ? "subcategory" : "subcategories"}` : ""}? Products stay in the
              catalogue.
            </p>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="ghost" onClick={onCancelRemove}>
                Keep
              </Button>
              <Button size="xs" variant="danger" icon={<Minus className="h-3.5 w-3.5" />} onClick={onRemove} loading={isBusy}>
                Remove
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {showChildren ? (
        <div className="mt-1.5 space-y-1.5">
          {isAdding ? (
            <div className="relative pl-6">
              <span aria-hidden="true" className="absolute left-2 top-0 h-5 w-px bg-[#EBE2CF]" />
              <span aria-hidden="true" className="absolute left-2 top-5 h-px w-4 bg-[#EBE2CF]" />
              <InlineAddForm placeholder={`New subcategory in ${node.name}`} onCancel={onCancelAdd} onSubmit={onAdd} />
            </div>
          ) : null}
          {hasChildren ? renderChildren() : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small inline forms                                                  */
/* ------------------------------------------------------------------ */

function InlineAddForm({
  placeholder,
  onSubmit,
  onCancel,
  className = "",
}: {
  placeholder: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
  className?: string;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit(name);
      setName("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={`flex items-center gap-2 rounded-2xl border border-dashed border-[#DFC98F] bg-[#FFFBF0] px-3 py-2 ${className}`}
    >
      <CornerDownRight className="h-4 w-4 shrink-0 text-[#A38A4F]" />
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder={placeholder}
        className="h-9 py-1.5"
        aria-label={placeholder}
      />
      <Button type="submit" size="sm" variant="primary" icon={<Plus className="h-4 w-4" />} loading={saving} disabled={!name.trim()}>
        Add
      </Button>
      <IconButton label="Cancel" size="sm" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
      </IconButton>
    </form>
  );
}

function InlineRenameForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSubmit(name);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        className="h-9 py-1.5"
        aria-label="Category name"
      />
      <Button type="submit" size="sm" variant="primary" icon={<Check className="h-4 w-4" />} loading={saving} disabled={!name.trim()}>
        Save
      </Button>
      <IconButton label="Cancel rename" size="sm" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
      </IconButton>
    </form>
  );
}

function MoveSelect({
  targets,
  currentParentId,
  onMove,
  disabled,
}: {
  targets: Array<{ id: number; label: string }>;
  currentParentId: number;
  onMove: (targetId: number) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value=""
      disabled={disabled}
      onChange={(event) => {
        const value = Number(event.target.value);
        if (Number.isFinite(value) && value > 0 && value !== currentParentId) onMove(value);
        event.target.value = "";
      }}
      aria-label="Move to another category"
      title="Move to another category"
      className="h-8 w-[150px] py-1 pr-8 text-xs"
    >
      <option value="">Move to…</option>
      {targets
        .filter((target) => target.id !== currentParentId)
        .map((target) => (
          <option key={target.id} value={target.id}>
            {target.label}
          </option>
        ))}
    </Select>
  );
}
