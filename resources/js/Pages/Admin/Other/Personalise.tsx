import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import { ExternalLink, Layers, Search, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import {
  AdminPage,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  Notice,
  PlusMinusButton,
  SaveBar,
  SectionLabel,
  adminFetch,
  formatMoney,
} from "@/Components/Admin/ui";
import SortableList, { DragHandle } from "@/Components/Admin/SortableList";

type LibraryProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: number;
  image_url: string;
  is_premade_design: boolean;
};

type CatalogueGroup = {
  key: string;
  label: string;
  description: string;
  product_ids: number[];
};

type Props = {
  catalogue: { groups: Array<CatalogueGroup & { products?: unknown[] }> };
  products: LibraryProduct[];
};

type DraftGroup = CatalogueGroup & { uid: string };

const MAX_GROUPS = 12;

const makeUid = () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const toDraft = (groups: CatalogueGroup[]): DraftGroup[] =>
  groups.map((group) => ({
    uid: makeUid(),
    key: group.key,
    label: group.label,
    description: group.description ?? "",
    product_ids: Array.isArray(group.product_ids) ? group.product_ids.map(Number) : [],
  }));

const serialise = (groups: DraftGroup[]) =>
  JSON.stringify(
    groups.map((group) => ({
      key: group.key,
      label: group.label,
      description: group.description,
      product_ids: group.product_ids,
    }))
  );

export default function Personalise({ catalogue, products }: Props) {
  const [groups, setGroups] = useState<DraftGroup[]>(() => toDraft(catalogue.groups ?? []));
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialise(toDraft(catalogue.groups ?? [])));
  const [activeUid, setActiveUid] = useState<string | null>(() => groups[0]?.uid ?? null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Snapshot for "dirty" detection: compare on content, not on the transient uids.
  const dirty = serialise(groups) !== savedSnapshot;

  useEffect(() => {
    if (activeUid && groups.some((group) => group.uid === activeUid)) return;
    setActiveUid(groups[0]?.uid ?? null);
  }, [groups, activeUid]);

  const productMap = useMemo(() => {
    const map = new Map<number, LibraryProduct>();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, [products]);

  const activeGroup = groups.find((group) => group.uid === activeUid) ?? null;
  const activeProducts = useMemo(
    () => (activeGroup ? activeGroup.product_ids.map((id) => productMap.get(id)).filter(Boolean) as LibraryProduct[] : []),
    [activeGroup, productMap]
  );

  const library = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter((product) => `${product.name} ${product.brand} ${product.slug}`.toLowerCase().includes(normalized));
  }, [products, query]);

  const updateGroup = (uid: string, updater: (group: DraftGroup) => DraftGroup) => {
    setGroups((prev) => prev.map((group) => (group.uid === uid ? updater(group) : group)));
  };

  const addGroup = () => {
    if (groups.length >= MAX_GROUPS) {
      toast.info(`You can have up to ${MAX_GROUPS} groups.`);
      return;
    }
    const next: DraftGroup = { uid: makeUid(), key: "", label: "New group", description: "", product_ids: [] };
    setGroups((prev) => [...prev, next]);
    setActiveUid(next.uid);
  };

  const removeGroup = (uid: string) => {
    setGroups((prev) => prev.filter((group) => group.uid !== uid));
  };

  const addProduct = (productId: number) => {
    if (!activeGroup) return;
    updateGroup(activeGroup.uid, (group) =>
      group.product_ids.includes(productId) ? group : { ...group, product_ids: [...group.product_ids, productId] }
    );
  };

  const removeProduct = (productId: number) => {
    if (!activeGroup) return;
    updateGroup(activeGroup.uid, (group) => ({ ...group, product_ids: group.product_ids.filter((id) => id !== productId) }));
  };

  const discard = () => {
    const restored = toDraft(JSON.parse(savedSnapshot) as CatalogueGroup[]);
    setGroups(restored);
    setActiveUid(restored[0]?.uid ?? null);
    setError(null);
  };

  const save = async () => {
    const missingLabel = groups.find((group) => !group.label.trim());
    if (missingLabel) {
      setError("Every group needs a name.");
      setActiveUid(missingLabel.uid);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = await adminFetch<{ catalogue: { groups: CatalogueGroup[] }; message?: string }>("/admin/other/personalise", {
        method: "PUT",
        body: { groups: JSON.parse(serialise(groups)) },
      });
      const nextGroups = toDraft(data.catalogue?.groups ?? []);
      // Keep the current tab selected by matching on position, since keys may be normalised.
      const activeIndex = groups.findIndex((group) => group.uid === activeUid);
      setGroups(nextGroups);
      setSavedSnapshot(serialise(nextGroups));
      setActiveUid(nextGroups[Math.max(0, Math.min(activeIndex, nextGroups.length - 1))]?.uid ?? null);
      toast.success(data.message || "Personalise products updated.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unable to save.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      eyebrow="Other / Personalise"
      title="Pick Your Product"
      description="Choose which products customers can personalise from the homepage, grouped the way you want them shown. Drag to reorder, use + and − to add or remove."
      backHref="/admin/other"
      backLabel="Back to Other"
      actions={
        <Link
          href="/personalise"
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCCFB4] bg-white px-3 text-sm font-semibold text-[#4E3F1F] transition hover:border-[#C6A75E]"
        >
          <ExternalLink className="h-4 w-4" />
          View page
        </Link>
      }
      width="wide"
    >
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Groups */}
        <Card
          title="Groups"
          description="Shown as tabs on the page."
          actions={<PlusMinusButton mode="add" label="Add group" onClick={addGroup} disabled={groups.length >= MAX_GROUPS} />}
          padding="sm"
        >
          {groups.length === 0 ? (
            <EmptyState
              compact
              icon={<Layers className="h-5 w-5" />}
              title="No groups yet"
              description="Add a group such as Baby, Adults or Bags."
              action={<Button variant="primary" onClick={addGroup}>Add group</Button>}
            />
          ) : (
            <SortableList
              items={groups}
              getKey={(group) => group.uid}
              onReorder={setGroups}
              renderItem={(group, { dragHandleProps }) => {
                const active = group.uid === activeUid;
                return (
                  <div
                    className={`flex items-center gap-1.5 rounded-xl border px-1.5 py-1.5 transition ${
                      active ? "border-[#C6A75E] bg-[#FFF8E7]" : "border-[#EBE2CF] bg-white hover:border-[#D7C9A8]"
                    }`}
                  >
                    <DragHandle handleProps={dragHandleProps} />
                    <button
                      type="button"
                      onClick={() => setActiveUid(group.uid)}
                      className="min-w-0 flex-1 rounded-lg px-1.5 py-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-[#1F1A13]">{group.label || "Untitled group"}</span>
                      <span className="block text-[11px] text-[#8F8060]">
                        {group.product_ids.length} product{group.product_ids.length === 1 ? "" : "s"}
                      </span>
                    </button>
                    <PlusMinusButton mode="remove" size="sm" label={`Remove ${group.label || "group"}`} onClick={() => removeGroup(group.uid)} />
                  </div>
                );
              }}
            />
          )}
        </Card>

        {/* Selected group */}
        <div className="space-y-5">
          {activeGroup ? (
            <>
              <Card title="Group details">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Name">
                    <Input
                      value={activeGroup.label}
                      maxLength={60}
                      onChange={(event) => updateGroup(activeGroup.uid, (group) => ({ ...group, label: event.target.value }))}
                      placeholder="e.g. Baby"
                    />
                  </Field>
                  <Field label="Short description" hint="Optional, shown under the tabs.">
                    <Input
                      value={activeGroup.description}
                      maxLength={200}
                      onChange={(event) => updateGroup(activeGroup.uid, (group) => ({ ...group, description: event.target.value }))}
                      placeholder="e.g. Bodysuits in soft cotton with a choice of colours."
                    />
                  </Field>
                </div>
              </Card>

              <Card
                title={`Products in ${activeGroup.label || "this group"}`}
                description="Drag to change the order customers see. Use − to remove."
                actions={<Chip tone="gold">{activeProducts.length} selected</Chip>}
              >
                {activeProducts.length === 0 ? (
                  <EmptyState
                    compact
                    icon={<Sparkles className="h-5 w-5" />}
                    title="Nothing in this group yet"
                    description="Add products from the library below with the + button."
                  />
                ) : (
                  <SortableList
                    items={activeProducts}
                    getKey={(product) => product.id}
                    onReorder={(next) => updateGroup(activeGroup.uid, (group) => ({ ...group, product_ids: next.map((product) => product.id) }))}
                    layout="grid"
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
                    renderItem={(product, { dragHandleProps }) => (
                      <div className="flex h-full items-center gap-2 rounded-xl border border-[#EBE2CF] bg-white p-2">
                        <DragHandle handleProps={dragHandleProps} />
                        <img src={product.image_url} alt="" className="h-14 w-12 shrink-0 rounded-lg bg-[#FAF7F0] object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1F1A13]">{product.name}</p>
                          <p className="text-xs text-[#8F8060]">{formatMoney(product.price)}</p>
                        </div>
                        <PlusMinusButton mode="remove" size="sm" label={`Remove ${product.name}`} onClick={() => removeProduct(product.id)} />
                      </div>
                    )}
                  />
                )}
              </Card>

              <Card
                title="Product library"
                description="Every product in the store. Press + to add one to the selected group."
                actions={
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A6D2B]" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" className="pl-9" />
                  </div>
                }
              >
                {library.length === 0 ? (
                  <EmptyState compact title="No products found" description="Try a different search." />
                ) : (
                  <div className="grid max-h-[520px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                    {library.map((product) => {
                      const added = activeGroup.product_ids.includes(product.id);
                      return (
                        <div
                          key={product.id}
                          className={`flex items-center gap-2.5 rounded-xl border p-2 transition ${
                            added ? "border-[#E2CC94] bg-[#FFF8E7]" : "border-[#EBE2CF] bg-white"
                          }`}
                        >
                          <img src={product.image_url} alt="" className="h-14 w-12 shrink-0 rounded-lg bg-[#FAF7F0] object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#1F1A13]">{product.name}</p>
                            <p className="truncate text-xs text-[#8F8060]">
                              {product.brand || "Bear Lane"} · {formatMoney(product.price)}
                            </p>
                            {product.is_premade_design ? <Chip className="mt-1">Pre-made</Chip> : null}
                          </div>
                          <PlusMinusButton
                            mode={added ? "remove" : "add"}
                            size="sm"
                            label={added ? `Remove ${product.name}` : `Add ${product.name}`}
                            onClick={() => (added ? removeProduct(product.id) : addProduct(product.id))}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState
                icon={<Layers className="h-5 w-5" />}
                title="Select or add a group"
                description="Groups organise the products customers can personalise."
                action={<Button variant="primary" onClick={addGroup}>Add group</Button>}
              />
            </Card>
          )}
        </div>
      </div>

      <SectionLabel className="sr-only">Save</SectionLabel>
      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} label="Save products" note="Changes go live on the Pick Your Product page immediately." />
    </AdminPage>
  );
}
