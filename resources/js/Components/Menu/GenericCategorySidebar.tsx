"use client";

import React, { useEffect, useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";

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

type Props = {
  rootKey: "women" | "men" | "kids";
  title: string;
  closeSidebar: () => void;
};

export default function GenericCategorySidebar({ rootKey, title, closeSidebar }: Props) {
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<MenuNode[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/menu/categories", {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Failed (${response.status})`);
        const payload = (await response.json()) as MenuPayload;
        if (!cancelled) setMenu(payload);
      } catch {
        if (!cancelled) setError("Unable to load categories.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPath([]);
  }, [rootKey]);

  const rootNode = useMemo(() => menu?.[rootKey]?.tree ?? null, [menu, rootKey]);
  const getChildren = (node?: MenuNode | null) =>
    Array.isArray(node?.children) ? node!.children : [];
  const currentNode = path.length > 0 ? path[path.length - 1] : null;
  const options = currentNode ? getChildren(currentNode) : getChildren(rootNode);

  const goBack = () => {
    setPath((prev) => prev.slice(0, -1));
  };

  const openCategory = (slug: string) => {
    router.get(`/category/${slug}`);
    closeSidebar();
  };

  const handleSelect = (node: MenuNode) => {
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length > 0) {
      setPath((prev) => [...prev, node]);
      return;
    }
    openCategory(node.slug);
  };

  const textClass =
    "text-black dark:text-gray-200 font-sans uppercase tracking-wide text-[14px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  const headingClass =
    "text-black dark:text-gray-100 font-sans font-bold uppercase tracking-wide text-[20px] block text-left";

  return (
    <div className="flex flex-col h-full">
      {path.length > 0 ? (
        <>
          <button
            type="button"
            onClick={goBack}
            onPointerUp={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goBack();
            }}
            className="mb-4 flex items-center gap-2 hover:opacity-70 transition w-fit"
            aria-label="Go back"
          >
            <ArrowLeft size={32} strokeWidth={1.5} />
          </button>
          <h3 className={headingClass + " mb-4"}>{currentNode?.name}</h3>
        </>
      ) : (
        <h2 className={headingClass + " mb-6"}>{title}</h2>
      )}

      {loading ? <p className={textClass}>Loading...</p> : null}
      {error ? <p className={textClass}>{error}</p> : null}

      {!loading && !error && (
        <div className="space-y-2">
          {options.length === 0 ? (
            <p className={textClass}>No categories yet.</p>
          ) : (
            options.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => handleSelect(node)}
                onPointerUp={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSelect(node);
                }}
                className={textClass}
              >
                {node.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
