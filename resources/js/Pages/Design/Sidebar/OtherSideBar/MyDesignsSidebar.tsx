"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

type Product = {
  id: number;
  name: string;
  slug: string;
};

type UserType = {
  id?: number;
};

type SavedDesign = {
  id: number;
  name: string;
  previewImage?: string | null;
  product: (Product & { images?: string[] }) | null;
  updatedAt?: string;
  payload?: {
    viewImageStates?: Record<string, Record<string, any>>;
    baseViewImages?: Partial<Record<"front" | "back" | "leftSleeve" | "rightSleeve", string>>;
    previewByView?: Partial<
      Record<
        "front" | "back" | "leftSleeve" | "rightSleeve",
        {
          baseImage: string;
          canvasWidth: number;
          canvasHeight: number;
          restrictedBox: { left: number; top: number; width: number; height: number };
          layers: Array<{
            uid: string;
            type: "image" | "text" | "clipart";
            url?: string;
            text?: string;
            position: { x: number; y: number };
            size: { w: number; h: number };
            rotation: number;
            flip: "none" | "horizontal" | "vertical";
            color?: string;
            borderColor?: string;
            borderWidth?: number;
            fontFamily?: string;
            fontSize?: number;
          }>;
        }
      >
    >;
  };
};

type MyDesignsSidebarProps = {
  closeSidebar: () => void;
  user?: UserType | null;
  designs?: SavedDesign[];
  selectedDesignId?: number | null;
  onCreateDesign?: (name: string) => void;
  onSelectDesign?: (design: SavedDesign) => void;
  onDeleteDesign?: (design: SavedDesign) => void;
};

type ViewKey = "front" | "back" | "leftSleeve" | "rightSleeve";

const ORDERED_VIEWS: ViewKey[] = ["front", "back", "rightSleeve", "leftSleeve"];

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

  return (
    <img
      key={uid}
      src={layer?.url}
      alt=""
      style={layerStyle}
      className="object-contain"
    />
  );
}

function getViewBaseImage(design: SavedDesign, view: ViewKey): string | null {
  const fromPreviewSnapshot = design.payload?.previewByView?.[view]?.baseImage;
  if (fromPreviewSnapshot) return fromPreviewSnapshot;

  const fromPayload = design.payload?.baseViewImages?.[view];
  if (fromPayload) return fromPayload;

  const fromProduct = design.product?.images ?? [];
  const mapByView: Record<ViewKey, string | undefined> = {
    front: fromProduct[0],
    back: fromProduct[1],
    rightSleeve: fromProduct[2],
    leftSleeve: fromProduct[3],
  };
  return mapByView[view] ?? design.previewImage ?? null;
}

function getFallbackLayersFromState(design: SavedDesign, view: ViewKey) {
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
        position: {
          x: Number(saved.x ?? 0),
          y: Number(saved.y ?? 0),
        },
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

export default function MyDesignsSidebar({
  closeSidebar: _closeSidebar,
  user,
  designs = [],
  selectedDesignId = null,
  onCreateDesign,
  onSelectDesign,
  onDeleteDesign,
}: MyDesignsSidebarProps) {
  const [confirmDelete, setConfirmDelete] = React.useState<SavedDesign | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newDesignName, setNewDesignName] = React.useState("Untitled Design");
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [activeViewByDesign, setActiveViewByDesign] = React.useState<Record<number, number>>({});
  const loginUrl = "http://localhost/login";

  // 🔹 Not signed in
  if (!user) {
    return (
      <div className="flex flex-col h-full p-6 bg-white">
        <div className="flex items-center justify-center h-full text-gray-400 text-center text-lg">
          <span>
            <a
              href={loginUrl}
              className="text-[#8A6D2B] hover:underline"
            >
              Sign in
            </a>{" "}
            to access your saved designs
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full p-6 bg-white">
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            setNewDesignName("Untitled Design");
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="relative isolate flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-[#C6A75E] bg-[#FFF9EB] transition duration-300 hover:shadow-md hover:bg-[#FFF4D8]"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#C6A75E] text-white">
            <Plus size={24} />
          </div>
          <span className="text-gray-900 font-semibold text-center">New Design</span>
          <span className="text-xs text-gray-600 mt-1 text-center">Add name and start designing</span>
        </button>

        {designs.map((design) => {
          const viewIndex = activeViewByDesign[design.id] ?? 0;
          const viewKey = ORDERED_VIEWS[viewIndex] ?? "front";
          const snapshot = design.payload?.previewByView?.[viewKey];
          const fallbackLayers = getFallbackLayersFromState(design, viewKey);
          const layers = snapshot?.layers?.length ? snapshot.layers : fallbackLayers;
          const fallbackWidth = Math.max(
            1000,
            ...layers.map(layer => layer.position.x + layer.size.w)
          );
          const fallbackHeight = Math.max(
            1000,
            ...layers.map(layer => layer.position.y + layer.size.h)
          );
          const canvasWidth = snapshot?.canvasWidth && snapshot.canvasWidth > 0 ? snapshot.canvasWidth : fallbackWidth;
          const canvasHeight = snapshot?.canvasHeight && snapshot.canvasHeight > 0 ? snapshot.canvasHeight : fallbackHeight;
          const scale = Math.min(128 / canvasWidth, 128 / canvasHeight);
          const baseImage = getViewBaseImage(design, viewKey);

          return (
            <div
              key={design.id}
              onClick={() => onSelectDesign?.(design)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDesign?.(design);
                }
              }}
              role="button"
              tabIndex={0}
              className={`relative isolate flex flex-col items-center justify-center p-4 rounded-2xl border transition duration-300 cursor-pointer group overflow-hidden ${
                selectedDesignId === design.id
                  ? "bg-[#F8F3E4] border-[#C6A75E] shadow-md ring-2 ring-[#C6A75E]/25"
                  : "bg-[#FBF8F1] border-gray-200 shadow-sm hover:shadow-md hover:border-[#D9C18A]"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDelete(design);
                }}
                className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 border border-gray-300 text-gray-700 shadow-sm transition hover:scale-105 hover:text-red-600 hover:border-red-300"
                title="Delete design"
              >
                ×
              </button>

              <div className="relative z-0 mb-3 w-full h-32 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {baseImage ? (
                  <img
                    src={baseImage}
                    alt={design.name}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                    No Preview
                  </div>
                )}

                {layers.map(layer =>
                  renderLayerPreview(layer, layer.uid, scale, canvasWidth, canvasHeight)
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveViewByDesign(prev => ({
                      ...prev,
                      [design.id]: (viewIndex + ORDERED_VIEWS.length - 1) % ORDERED_VIEWS.length,
                    }));
                  }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-gray-700 shadow hover:bg-white"
                  aria-label="Previous design image"
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveViewByDesign(prev => ({
                      ...prev,
                      [design.id]: (viewIndex + 1) % ORDERED_VIEWS.length,
                    }));
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1 text-gray-700 shadow hover:bg-white"
                  aria-label="Next design image"
                >
                  <ArrowRight size={14} />
                </button>
              </div>

              <span className="relative z-10 text-gray-800 font-medium text-center">
                {design.name}
              </span>
              <span className="relative z-10 text-gray-500 text-xs mt-1 text-center">
                {design.product?.name ?? "Unknown Product"}
              </span>
              <span className="relative z-10 text-gray-500 text-[11px] mt-1 text-center uppercase tracking-wide">
                Picture {viewIndex + 1} of 4
              </span>
            </div>
          );
        })}
      </div>

      {designs.length === 0 && (
        <div className="flex items-center justify-center py-6 text-gray-400 text-center text-lg">
          You have no saved designs yet. Create your first one.
        </div>
      )}

      {isCreateOpen && (
        <div className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">New Design</h3>
            <p className="mt-2 text-sm text-gray-600">
              Enter a design name to start.
            </p>

            <input
              type="text"
              value={newDesignName}
              onChange={(e) => {
                setNewDesignName(e.target.value);
                if (createError) setCreateError(null);
              }}
              className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#C6A75E] focus:outline-none"
              placeholder="My design name"
            />

            {createError && (
              <p className="mt-2 text-sm text-red-600">{createError}</p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmed = newDesignName.trim();
                  if (!trimmed) {
                    setCreateError("Please enter a design name.");
                    return;
                  }
                  onCreateDesign?.(trimmed);
                  setIsCreateOpen(false);
                }}
                className="rounded-xl bg-[#C6A75E] px-4 py-2 text-white hover:bg-[#B8994E]"
              >
                Start Designing
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Design</h3>
            <p className="mt-2 text-sm text-gray-600">
              Delete <span className="font-medium">{confirmDelete.name}</span>? This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDesign?.(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
