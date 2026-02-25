"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  color?: string;
};

export default function InlineSvg({ src, color = "#000000" }: Props) {
  const [svg, setSvg] = useState<string>("");

  // Store the cleaned SVG without color
  const baseSvgRef = useRef<string>("");

  /* --------------------------------------------------
   * 1️⃣ Fetch + clean SVG ONLY when src changes
   * -------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    fetch(src)
      .then((res) => res.text())
      .then((text) => {
        if (cancelled) return;

        const cleaned = text
          // remove embedded styles
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          // remove explicit fills/strokes
          .replace(/fill="[^"]*"/gi, "")
          .replace(/stroke="[^"]*"/gi, "")
          // normalize svg tag
          .replace(
            /<svg([^>]*)>/i,
            `<svg$1 width="100%" height="100%">`
          );

        baseSvgRef.current = cleaned;
        baseSvgRef.current = cleaned;
        setSvg(cleaned);

        // 🔑 FORCE color re-application after SVG loads
        queueMicrotask(() => {
          setSvg((prev) =>
            prev.replace(
              /<svg([^>]*)>/i,
              `<svg$1 style="color:${color}; fill:currentColor; stroke:currentColor;">`
            )
          );
        });
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  /* --------------------------------------------------
   * 2️⃣ Apply color WITHOUT re-fetching SVG
   * -------------------------------------------------- */
  useEffect(() => {
    if (!baseSvgRef.current) return;

    const colored = baseSvgRef.current.replace(
      /<svg([^>]*)>/i,
      `<svg$1 style="color:${color}; fill:currentColor; stroke:currentColor;">`
    );

    // ✅ Prevent redundant updates
    setSvg((prev) => (prev === colored ? prev : colored));
  }, [color]);

  return (
    <div
      className="w-full h-full pointer-events-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
