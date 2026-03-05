import React, { useRef, useState } from "react";
import { Link } from "@inertiajs/react";

type ProductRailItem = {
  id: number | string;
  name: string;
  slug: string;
  brand?: string;
  price?: number;
  image?: string;
};

export default function ProductRailSection({
  title,
  products,
  emptyText,
}: {
  title: string;
  products: ProductRailItem[];
  emptyText: string;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const startDrag = (clientX: number) => {
    const rail = railRef.current;
    if (!rail) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartXRef.current = clientX;
    scrollStartLeftRef.current = rail.scrollLeft;
  };

  const moveDrag = (clientX: number) => {
    const rail = railRef.current;
    if (!rail || !isDragging) return;
    const delta = clientX - dragStartXRef.current;
    if (Math.abs(delta) > 5) hasDraggedRef.current = true;
    rail.scrollLeft = scrollStartLeftRef.current - delta;
  };

  const endDrag = () => setIsDragging(false);

  return (
    <section className="mx-4 mt-10 sm:mx-6 lg:mx-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h3 className="text-2xl font-extrabold text-[#1E1A12]">{title}</h3>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8C8A9] bg-[#FCFAF5] p-6 text-sm text-[#7A6742]">
          {emptyText}
        </div>
      ) : (
        <div
          ref={railRef}
          onMouseDown={(event) => startDrag(event.clientX)}
          onMouseMove={(event) => moveDrag(event.clientX)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          className={`flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory touch-pan-x select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          } [&::-webkit-scrollbar]:hidden`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((item) => (
            <Link
              key={`${title}-${item.id}-${item.slug}`}
              href={`/product/${encodeURIComponent(item.slug)}`}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onClick={(event) => {
                if (hasDraggedRef.current) {
                  event.preventDefault();
                  hasDraggedRef.current = false;
                }
              }}
              className="group min-w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#E7DCC6] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(46,35,14,0.12)] sm:min-w-[330px] lg:min-w-[380px]"
            >
              <div className="h-64 bg-[#E5E7EB] p-3 sm:h-72 lg:h-80">
                <img loading="lazy" decoding="async"
                  src={item.image || "/images/no-image.png"}
                  alt={item.name}
                  draggable={false}
                  className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-1 p-3">
                {item.brand ? <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A7854]">{item.brand}</p> : null}
                <p className="line-clamp-2 text-sm font-semibold text-[#231C12]">{item.name}</p>
                {typeof item.price === "number" ? <p className="text-sm font-bold text-[#17120A]">£{item.price.toFixed(2)}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
