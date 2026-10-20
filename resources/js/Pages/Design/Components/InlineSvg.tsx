"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  color?: string;
};

const cleanedSvgCache = new Map<string, string>();
const svgFetchPromiseCache = new Map<string, Promise<string>>();

const cleanSvg = (text: string) =>
  text
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/fill="[^"]*"/gi, "")
    .replace(/stroke="[^"]*"/gi, "")
    .replace(/<svg([^>]*)>/i, `<svg$1 width="100%" height="100%">`);

const getCleanedSvg = (src: string): Promise<string> => {
  const cached = cleanedSvgCache.get(src);
  if (cached) return Promise.resolve(cached);

  const inFlight = svgFetchPromiseCache.get(src);
  if (inFlight) return inFlight;

  const request = fetch(src)
    .then(res => res.text())
    .then(text => {
      const cleaned = cleanSvg(text);
      cleanedSvgCache.set(src, cleaned);
      svgFetchPromiseCache.delete(src);
      return cleaned;
    })
    .catch(error => {
      svgFetchPromiseCache.delete(src);
      throw error;
    });

  svgFetchPromiseCache.set(src, request);
  return request;
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

    getCleanedSvg(src)
      .then((cleaned) => {
        if (cancelled) return;

        baseSvgRef.current = cleaned;
        const colored = cleaned.replace(
          /<svg([^>]*)>/i,
          `<svg$1 style="color:${color}; fill:currentColor; stroke:currentColor;">`
        );
        setSvg(colored);
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
