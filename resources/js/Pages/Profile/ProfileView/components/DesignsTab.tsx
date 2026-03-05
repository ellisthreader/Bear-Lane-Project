import React from "react";
import { router } from "@inertiajs/react";
import { ArrowLeft, ArrowRight, Check, Pencil, Play, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/Context/CartContext";
import { calculateDesignPricingFromPreviews } from "@/Pages/Design/utils/designPricing";
import { useProfileViewContext } from "../ProfileViewContext";
import type { SavedDesignItem } from "../types";
import { showCheckoutError, showCheckoutSuccess } from "@/Pages/CheckoutPage/checkoutToasts";
import { normalizeDesignType } from "@/Utils/designType";

type ViewKey = "front" | "back" | "leftSleeve" | "rightSleeve";

const ORDERED_VIEWS: ViewKey[] = ["front", "back", "leftSleeve", "rightSleeve"];

function renderLayerPreview(layer: any, uid: string, scale: number, canvasWidth: number, canvasHeight: number) {
  const type = layer?.type ?? "image";
  const scaleX = layer?.flip === "horizontal" ? -1 : 1;
  const scaleY = layer?.flip === "vertical" ? -1 : 1;
  const position = layer?.position ?? { x: 0, y: 0 };
  const size = layer?.size ?? { w: 0, h: 0 };
  const offsetX = (128 - canvasWidth * scale) / 2;
  const offsetY = (128 - canvasHeight * scale) / 2;

  const layerStyle: React.CSSProperties = {
    position: "absolute",
    left: offsetX + position.x * scale,
    top: offsetY + position.y * scale,
    width: size.w * scale,
    height: size.h * scale,
    transform: `rotate(${layer?.rotation ?? 0}deg) scale(${scaleX}, ${scaleY})`,
    transformOrigin: "center center",
  };

  if (type === "text") {
    return (
      <div key={uid} style={layerStyle}>
        <span
          style={{
            fontFamily: layer?.fontFamily ?? "Arial",
            fontSize: `${(layer?.fontSize ?? 24) * scale}px`,
            whiteSpace: "pre-wrap",
            color: layer?.color ?? "#000000",
            WebkitTextStrokeColor: layer?.borderColor ?? "#000000",
            WebkitTextStrokeWidth: `${(layer?.borderWidth ?? 0) * scale}px`,
            WebkitTextFillColor: layer?.color ?? "#000000",
            lineHeight: 1,
          }}
        >
          {layer?.text ?? ""}
        </span>
      </div>
    );
  }

  const isSvgClipart =
    type === "clipart" &&
    typeof layer?.url === "string" &&
    /\.svg(?:[?#].*)?$/i.test(layer.url);

  if (isSvgClipart) {
    return (
      <div
        key={uid}
        style={{
          ...layerStyle,
          backgroundColor: layer?.color ?? "#000000",
          WebkitMaskImage: `url("${layer.url}")`,
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          WebkitMaskSize: "contain",
          maskImage: `url("${layer.url}")`,
          maskRepeat: "no-repeat",
          maskPosition: "center",
          maskSize: "contain",
        }}
      />
    );
  }

  return <img loading="lazy" decoding="async" key={uid} src={layer?.url} alt="" style={layerStyle} className="object-contain" />;
}

function getViewBaseImage(design: SavedDesignItem, view: ViewKey): string | null {
  const fromCompositePng = design.payload?.compositePngByView?.[view];
  if (fromCompositePng) return fromCompositePng;

  if (view === "front" && design.preview_image) return design.preview_image;

  const fromPreviewSnapshot = design.payload?.previewByView?.[view]?.baseImage;
  if (fromPreviewSnapshot) return fromPreviewSnapshot;

  const fromPayload = design.payload?.baseViewImages?.[view];
  if (fromPayload) return fromPayload;

  const images = design.product_images ?? [];
  const mapByView: Record<ViewKey, string | undefined> = {
    front: images[0],
    back: images[1],
    leftSleeve: images[2],
    rightSleeve: images[3],
  };
  return mapByView[view] ?? null;
}

function getFallbackLayersFromState(design: SavedDesignItem, view: ViewKey) {
  const state = design.payload?.viewImageStates?.[view] ?? {};
  return Object.entries(state)
    .map(([uid, layer]) => {
      const fromView = (layer as any)?.canvasPositions?.[view];
      const fromLegacy = (layer as any)?.canvasPositions?.[uid];
      const saved = fromView ?? fromLegacy;
      if (!saved) return null;

      return {
        uid,
        type: (layer as any)?.type === "text" ? "text" : (layer as any)?.isClipart ? "clipart" : "image",
        url: (layer as any)?.url,
        text: (layer as any)?.text,
        position: { x: Number(saved.x ?? 0), y: Number(saved.y ?? 0) },
        size: {
          w: Number(saved.width ?? (layer as any)?.size?.w ?? 0),
          h: Number(saved.height ?? (layer as any)?.size?.h ?? 0),
        },
        rotation: Number((layer as any)?.rotation ?? 0),
        flip: ((layer as any)?.flip ?? "none") as "none" | "horizontal" | "vertical",
        color: (layer as any)?.color,
        borderColor: (layer as any)?.borderColor,
        borderWidth: Number((layer as any)?.borderWidth ?? 0),
        fontFamily: (layer as any)?.fontFamily,
        fontSize: Number((layer as any)?.fontSize ?? 24),
      };
    })
    .filter((layer): layer is NonNullable<typeof layer> => layer !== null);
}

export default function DesignsTab() {
  const { savedDesigns } = useProfileViewContext();
  const { addToCart } = useCart();

  const [designList, setDesignList] = React.useState(savedDesigns);
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest" | "modified">("newest");
  const [selectedDesignIds, setSelectedDesignIds] = React.useState<number[]>([]);
  const [activeViewByDesign, setActiveViewByDesign] = React.useState<Record<number, number>>({});
  const [renamingDesign, setRenamingDesign] = React.useState<SavedDesignItem | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renamingBusy, setRenamingBusy] = React.useState(false);
  const [expandedPreview, setExpandedPreview] = React.useState<{ src: string; name: string } | null>(null);

  React.useEffect(() => {
    setDesignList(savedDesigns);
  }, [savedDesigns]);

  React.useEffect(() => {
    setSelectedDesignIds((prev) => prev.filter((id) => designList.some((design) => design.id === id)));
  }, [designList]);

  const sortedDesignList = React.useMemo(() => {
    const next = [...designList];
    const updatedTime = (design: SavedDesignItem) => {
      if (!design.updated_at) return 0;
      const parsed = Date.parse(design.updated_at);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    if (sortBy === "oldest") {
      next.sort((a, b) => a.id - b.id);
      return next;
    }

    if (sortBy === "modified") {
      next.sort((a, b) => updatedTime(b) - updatedTime(a));
      return next;
    }

    next.sort((a, b) => b.id - a.id);
    return next;
  }, [designList, sortBy]);

  const startWorking = (design: SavedDesignItem) => {
    if (!design.product_slug) {
      showCheckoutError("Unable to open this design right now.");
      return;
    }
    router.get(`/design/${encodeURIComponent(design.product_slug)}`, { savedDesign: design.id });
  };

  const deleteDesign = async (designId: number, options?: { silent?: boolean }) => {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    const res = await fetch(`/design/saved/${designId}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) {
      if (!options?.silent) showCheckoutError("Unable to delete design right now.");
      return false;
    }

    setDesignList((prev) => prev.filter((design) => design.id !== designId));
    if (!options?.silent) showCheckoutSuccess("Design deleted.");
    return true;
  };

  const addDesignToCart = (design: SavedDesignItem, options?: { silent?: boolean }) => {
    if (!design.product_slug) {
      if (!options?.silent) showCheckoutError("Unable to add this design to cart right now.");
      return false;
    }

    const previewByView = design.payload?.previewByView;
    const previews = [
      previewByView?.front,
      previewByView?.back,
      previewByView?.leftSleeve,
      previewByView?.rightSleeve,
    ];
    const designType = normalizeDesignType(design.payload?.selectedDesignType);
    const pricing = calculateDesignPricingFromPreviews(previews, design.product_price ?? 0, designType);
    const fallbackSize = design.product_sizes?.[0] ?? "One Size";
    const selectedSize = design.payload?.selectedSize || fallbackSize;
    const selectedColour = design.payload?.selectedColour || "Default";
    const currentViewKey = design.payload?.currentViewKey ?? "front";
    const previewSnapshot =
      previewByView?.[currentViewKey] ??
      previewByView?.front ??
      previewByView?.back ??
      previewByView?.leftSleeve ??
      previewByView?.rightSleeve;

    addToCart({
      slug: design.product_slug,
      title: design.product_name || "Custom product",
      price: pricing.unitPrice,
      colour: selectedColour,
      size: selectedSize,
      image: getViewBaseImage(design, currentViewKey) ?? design.preview_image ?? undefined,
      availableSizes: design.product_sizes?.length ? design.product_sizes : [selectedSize],
      quantity: 1,
      designType,
      previewSnapshot,
    });

    return true;
  };

  const toggleDesignSelection = (designId: number) => {
    setSelectedDesignIds((prev) =>
      prev.includes(designId) ? prev.filter((id) => id !== designId) : [...prev, designId]
    );
  };

  const addSelectedToCart = () => {
    const selected = sortedDesignList.filter((design) => selectedDesignIds.includes(design.id));
    let addedCount = 0;
    selected.forEach((design) => {
      if (addDesignToCart(design, { silent: true })) addedCount += 1;
    });

    if (addedCount > 0) return;

    showCheckoutError("No selected designs could be added to cart.");
  };

  const deleteSelectedDesigns = async () => {
    if (!selectedDesignIds.length) return;

    const confirmDelete = window.confirm(`Delete ${selectedDesignIds.length} selected design(s)?`);
    if (!confirmDelete) return;

    let deletedCount = 0;
    for (const designId of selectedDesignIds) {
      const ok = await deleteDesign(designId, { silent: true });
      if (ok) deletedCount += 1;
    }

    if (deletedCount > 0) {
      setSelectedDesignIds((prev) => prev.filter((id) => !selectedDesignIds.includes(id)));
      showCheckoutSuccess(`${deletedCount} design${deletedCount === 1 ? "" : "s"} deleted.`);
      return;
    }

    showCheckoutError("Unable to delete selected designs right now.");
  };

  const saveRename = async () => {
    if (!renamingDesign) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      showCheckoutError("Please enter a design name.");
      return;
    }

    setRenamingBusy(true);
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
    const res = await fetch(`/design/saved/${renamingDesign.id}/rename`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ name: trimmed }),
    });

    setRenamingBusy(false);

    if (!res.ok) {
      showCheckoutError("Unable to rename design right now.");
      return;
    }

    setDesignList((prev) => prev.map((design) => (design.id === renamingDesign.id ? { ...design, name: trimmed } : design)));
    setRenamingDesign(null);
    setRenameValue("");
    showCheckoutSuccess("Design renamed.");
  };

  return (
    <section className="rounded-3xl border border-[#E2D2A8] bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 rounded-2xl border border-[#E9DDBE] bg-[#FFFCF4] p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-[#251E11]">My Designs</h2>
            <p className="mt-1 text-sm text-[#7A6C4D]">Pick up where you left off, rename, remove, or checkout selected designs faster.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-[#7B6530]">
              <span className="font-semibold">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "modified")}
                className="h-10 min-w-[168px] rounded-xl border border-[#D8C392] bg-white px-3 text-sm text-[#5D4C28] outline-none transition focus:border-[#C6A75E]"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="modified">Date modified</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => router.get("/design/white-tee")}
              className="h-10 min-w-[168px] rounded-xl bg-[#C6A75E] px-3 text-sm font-semibold text-white transition hover:bg-[#B3934C]"
            >
              Create new design
            </button>
          </div>
        </div>
      </div>

      {designList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E6D7B0] bg-[#FFFDF8] px-6 py-12 text-center">
          <img loading="lazy" decoding="async" src="/images/Icons/NoDesign.png" alt="No designs" className="mx-auto mb-6 w-full max-w-[260px]" />
          <h3 className="text-2xl font-bold text-[#251E11]">No designs yet</h3>
          <p className="mt-2 text-sm text-[#7A6C4D]">Bring your first idea to life.</p>
          <button
            onClick={() => {
              router.get("/design/white-tee");
            }}
            className="mt-6 inline-flex rounded-xl bg-[#C6A75E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B3934C]"
            type="button"
          >
            Start designing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedDesignList.map((design) => {
            const isSelected = selectedDesignIds.includes(design.id);
            const viewIndex = activeViewByDesign[design.id] ?? 0;
            const viewKey = ORDERED_VIEWS[viewIndex] ?? "front";
            const hasCompositePreview = Boolean(design.payload?.compositePngByView?.[viewKey]);
            const snapshot = design.payload?.previewByView?.[viewKey];
            const fallbackLayers = getFallbackLayersFromState(design, viewKey);
            const layers = hasCompositePreview ? [] : snapshot?.layers?.length ? snapshot.layers : fallbackLayers;
            const fallbackWidth = Math.max(1000, ...layers.map((layer) => layer.position.x + layer.size.w));
            const fallbackHeight = Math.max(1000, ...layers.map((layer) => layer.position.y + layer.size.h));
            const canvasWidth = snapshot?.canvasWidth && snapshot.canvasWidth > 0 ? snapshot.canvasWidth : fallbackWidth;
            const canvasHeight = snapshot?.canvasHeight && snapshot.canvasHeight > 0 ? snapshot.canvasHeight : fallbackHeight;
            const scale = Math.min(128 / canvasWidth, 128 / canvasHeight);
            const baseImage = getViewBaseImage(design, viewKey);

            return (
              <article
                key={design.id}
                className={`mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border bg-gradient-to-br from-white to-[#FFF7E8] shadow-md transition hover:shadow-xl ${
                  isSelected ? "border-[#C6A75E] ring-2 ring-[#C6A75E]/60" : "border-[#E7D8B4]"
                }`}
              >
                <div className="relative h-[320px] border-b border-[#EBDCBD] bg-[#F9F4E8]">
                  <button
                    type="button"
                    onClick={() => toggleDesignSelection(design.id)}
                    className={`absolute left-4 top-4 z-20 h-8 w-8 rounded-md border-2 shadow-sm transition ${
                      isSelected
                        ? "border-[#C6A75E] bg-[#C6A75E] text-white"
                        : "border-[#D8C392] bg-white text-transparent hover:border-[#C6A75E]"
                    }`}
                    aria-label={isSelected ? "Deselect design" : "Select design"}
                  >
                    <Check className="mx-auto h-4 w-4" />
                  </button>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative h-56 w-56 overflow-hidden rounded-xl">
                      {baseImage ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setExpandedPreview({ src: baseImage, name: design.name });
                          }}
                          className="absolute inset-0"
                          aria-label="Expand design preview"
                        >
                          <img loading="lazy" decoding="async" src={baseImage} alt={design.name} className="absolute inset-0 h-full w-full object-contain p-1" />
                        </button>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-[#8B7E61]">No preview</div>
                      )}

                      {!hasCompositePreview &&
                        layers.map((layer) => renderLayerPreview(layer, layer.uid, scale, canvasWidth, canvasHeight))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveViewByDesign((prev) => ({
                        ...prev,
                        [design.id]: (viewIndex + ORDERED_VIEWS.length - 1) % ORDERED_VIEWS.length,
                      }))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-1.5 text-[#6A5830] shadow transition hover:bg-white"
                    aria-label="Previous preview"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveViewByDesign((prev) => ({
                        ...prev,
                        [design.id]: (viewIndex + 1) % ORDERED_VIEWS.length,
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-1.5 text-[#6A5830] shadow transition hover:bg-white"
                    aria-label="Next preview"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 md:p-6">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#9B8862]">{design.product_name || "Custom product"}</p>
                      <p className="mt-1 line-clamp-2 text-lg font-semibold text-[#322A18]">{design.name}</p>
                      {design.updated_at && <p className="mt-2 text-sm text-[#8B7E61]">Updated {new Date(design.updated_at).toLocaleDateString()}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteDesign(design.id)}
                      className="rounded-full border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                      aria-label="Delete design"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => startWorking(design)}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C]"
                    >
                      <Play className="h-4 w-4" />
                      Start Working
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingDesign(design);
                        setRenameValue(design.name);
                      }}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-[#D7BE84] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF8E8]"
                    >
                      <Pencil className="h-4 w-4" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => addDesignToCart(design)}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#8A6D2B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#755A22]"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedDesignIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 z-[10090] w-[92vw] max-w-lg -translate-x-1/2 rounded-2xl border border-[#DCC89B] bg-white/95 p-4 shadow-[0_24px_55px_rgba(52,38,8,0.26)] backdrop-blur">
          <p className="text-sm font-semibold text-[#3A2E16]">
            {selectedDesignIds.length} design{selectedDesignIds.length === 1 ? "" : "s"} selected
          </p>
          <p className="mt-1 text-xs text-[#7A6C4D]">Use quick actions for selected designs.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addSelectedToCart}
              className="rounded-xl bg-[#8A6D2B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#755A22]"
            >
              Add selected to cart
            </button>
            <button
              type="button"
              onClick={deleteSelectedDesigns}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Delete selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedDesignIds([])}
              className="rounded-xl border border-[#D8C392] bg-white px-4 py-2 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF8E8]"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {expandedPreview && (
        <div
          className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          onClick={() => setExpandedPreview(null)}
        >
          <div className="relative max-h-[95vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setExpandedPreview(null)}
              className="absolute -right-3 -top-3 h-9 w-9 rounded-full bg-white text-gray-800 shadow-md"
              aria-label="Close image preview"
            >
              ×
            </button>
            <img loading="lazy" decoding="async"
              src={expandedPreview.src}
              alt={expandedPreview.name}
              className="max-h-[95vh] max-w-[95vw] rounded-lg bg-white object-contain"
            />
          </div>
        </div>
      )}

      {renamingDesign && (
        <div className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E7D8B4] bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#2A2418]">Rename Design</h3>
            <p className="mt-1 text-sm text-[#7B6D50]">Choose a new name for your saved design.</p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mt-4 w-full rounded-xl border border-[#DECDA4] px-4 py-2.5 text-[#2A2418] outline-none transition focus:border-[#C6A75E]"
              placeholder="Design name"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRenamingDesign(null);
                  setRenameValue("");
                }}
                className="rounded-xl border border-[#D7BE84] px-4 py-2 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF8E8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRename}
                disabled={renamingBusy}
                className="rounded-xl bg-[#C6A75E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B3934C] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {renamingBusy ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
