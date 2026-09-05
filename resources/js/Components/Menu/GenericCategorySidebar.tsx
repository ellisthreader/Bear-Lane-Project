"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AddCategoryControl, DeleteCategoryControl } from "@/Components/Menu/CategoryAdminControls";

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

let cachedMenu: MenuPayload | null = null;
let pendingMenuRequest: Promise<MenuPayload> | null = null;

const remapPath = (root: MenuNode | null, previous: MenuNode[]): MenuNode[] => {
  if (!root) return [];
  const next: MenuNode[] = [];
  let current: MenuNode = root;
  for (const node of previous) {
    const match = (Array.isArray(current.children) ? current.children : []).find(
      (child) => child.id === node.id,
    );
    if (!match) break;
    next.push(match);
    current = match;
  }
  return next;
};

const requestCategoryMenu = async (force = false): Promise<MenuPayload> => {
  if (!force && cachedMenu) return cachedMenu;
  if (!force && pendingMenuRequest) return pendingMenuRequest;

  const request = fetch("/menu/categories", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Failed (${response.status})`);
    return (await response.json()) as MenuPayload;
  });

  pendingMenuRequest = request;
  try {
    const payload = await request;
    if (force || pendingMenuRequest === request) cachedMenu = payload;
    return payload;
  } finally {
    if (pendingMenuRequest === request) pendingMenuRequest = null;
  }
};

export const prefetchCategoryMenu = async (): Promise<void> => {
  try {
    await requestCategoryMenu();
  } catch {
    // The visible sidebar retains its existing retry and error handling.
  }
};

type Props = {
  rootKey: "women" | "men" | "kids";
  title: string;
  closeSidebar: () => void;
  variant?: "drilldown" | "accordion";
  showHeading?: boolean;
  quickLinks?: Array<{ label: string; href: string }>;
  hideRootCategoriesWhenQuickLinks?: boolean;
};

export default function GenericCategorySidebar({
  rootKey,
  title,
  closeSidebar,
  variant = "drilldown",
  showHeading = true,
  quickLinks = [],
  hideRootCategoriesWhenQuickLinks = false,
}: Props) {
  const [menu, setMenu] = useState<MenuPayload | null>(() => cachedMenu);
  const [loading, setLoading] = useState(() => cachedMenu === null);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<MenuNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const pointerClickGuardRef = useRef<null | string>(null);
  const page = usePage<{ auth?: { user?: { is_admin?: boolean } } }>();
  const isAdmin = Boolean(page.props.auth?.user?.is_admin);

  const applyMenu = useCallback((payload: MenuPayload) => {
    setMenu(payload);
    setPath((prev) => remapPath(payload?.[rootKey]?.tree ?? null, prev));
  }, [rootKey]);

  const refreshMenu = useCallback(async () => {
    try {
      setError(null);
      applyMenu(await requestCategoryMenu(true));
    } catch {
      setError("Unable to load categories.");
    }
  }, [applyMenu]);

  useEffect(() => {
    let cancelled = false;

    if (cachedMenu) {
      applyMenu(cachedMenu);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    void requestCategoryMenu()
      .then((payload) => {
        if (!cancelled) applyMenu(payload);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load categories.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyMenu]);

  useEffect(() => {
    setPath([]);
    setExpandedIds([]);
  }, [rootKey]);

  const rootNode = useMemo(() => menu?.[rootKey]?.tree ?? null, [menu, rootKey]);
  const getChildren = (node?: MenuNode | null) =>
    Array.isArray(node?.children) ? node!.children : [];
  const currentNode = path.length > 0 ? path[path.length - 1] : null;
  const options = currentNode ? getChildren(currentNode) : getChildren(rootNode);
  const shouldHideRootCategories = path.length === 0 && quickLinks.length > 0 && hideRootCategoriesWhenQuickLinks;
  // Category that a "+" in the current view would add a child to.
  const addParent = currentNode ?? rootNode;

  const goBack = () => {
    setPath((prev) => prev.slice(0, -1));
  };

  const openCategory = (slug: string) => {
    router.get(`/category/${slug}`);
    closeSidebar();
  };

  const openHref = (href: string) => {
    router.get(href);
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

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleAccordionSelect = (node: MenuNode) => {
    const children = getChildren(node);
    if (children.length > 0) {
      toggleExpanded(node.id);
      return;
    }
    openCategory(node.slug);
  };

  const handlePointerUp = (handler: () => void) => (event: React.PointerEvent<HTMLButtonElement>) => {
    pointerClickGuardRef.current = event.pointerType;
    if (event.pointerType === "touch") {
      event.preventDefault();
      event.stopPropagation();
      handler();
    }
  };

  const handleClick = (handler: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    if (pointerClickGuardRef.current === "touch") {
      pointerClickGuardRef.current = null;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    handler();
  };

  const pressHandlers = (handler: () => void) => ({
    onPointerUp: handlePointerUp(handler),
    onClick: handleClick(handler),
  });

  const textClass =
    "text-black dark:text-gray-200 font-sans uppercase tracking-wide text-[14px] block text-left transition-colors hover:text-gray-400 dark:hover:text-gray-300";

  const headingClass =
    "text-black dark:text-gray-100 font-sans font-bold uppercase tracking-wide text-[20px] block text-left";

  const accordionLabelClass =
    "w-full rounded-xl px-3 py-3 text-left text-base font-semibold text-[#2B2417] transition-colors hover:bg-[#FFF6DF]";
  const accordionSubLabelClass =
    "w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#4B3C21] transition-colors hover:bg-[#FFF6DF]";
  const accordionToggleClass =
    "mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8A6D2B] transition hover:bg-[#FFF6DF]";
  const getDepthPaddingClass = (depth: number) => {
    if (depth <= 0) return "";
    if (depth === 1) return "pl-6";
    if (depth === 2) return "pl-9";
    if (depth === 3) return "pl-12";
    return "pl-14";
  };

  const renderAccordionNodes = (nodes: MenuNode[], depth = 0) => {
    if (nodes.length === 0) return null;
    return (
      <div className={depth === 0 ? "space-y-2" : "space-y-1"}>
        {nodes.map((node) => {
          const children = getChildren(node);
          const hasChildren = children.length > 0;
          const isOpen = expandedIds.includes(node.id);
          const labelClass = depth === 0 ? accordionLabelClass : accordionSubLabelClass;
          return (
            <div key={node.id} className={depth === 0 ? "rounded-2xl border border-[#EFE2C4] bg-white" : ""}>
              {hasChildren ? (
                <div className="flex items-center">
                  <button
                    type="button"
                    {...pressHandlers(() => openCategory(node.slug))}
                  className={`${labelClass} ${getDepthPaddingClass(depth)} flex-1 touch-manipulation`}
                >
                  {node.name}
                </button>
                  <button
                    type="button"
                    {...pressHandlers(() => toggleExpanded(node.id))}
                    className={`${accordionToggleClass} touch-manipulation`}
                    aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                  >
                    <ChevronRight
                      size={18}
                      strokeWidth={1.6}
                      className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {isAdmin ? (
                    <DeleteCategoryControl categoryId={node.id} name={node.name} onDeleted={refreshMenu} />
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    type="button"
                    {...pressHandlers(() => handleAccordionSelect(node))}
                    className={`${labelClass} ${getDepthPaddingClass(depth)} flex-1 touch-manipulation`}
                  >
                    {node.name}
                  </button>
                  {isAdmin ? (
                    <DeleteCategoryControl categoryId={node.id} name={node.name} onDeleted={refreshMenu} />
                  ) : null}
                </div>
              )}
              {hasChildren && isOpen ? (
                <div className="pb-2 pt-1">
                  {renderAccordionNodes(children, depth + 1)}
                  {isAdmin ? (
                    <div className={getDepthPaddingClass(depth + 1)}>
                      <AddCategoryControl parentId={node.id} parentName={node.name} onSaved={refreshMenu} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {variant === "drilldown" && showHeading ? (
        path.length > 0 ? (
          <>
            <button
              type="button"
              {...pressHandlers(goBack)}
              className="mb-4 flex items-center gap-2 hover:opacity-70 transition w-fit touch-manipulation"
              aria-label="Go back"
            >
              <ArrowLeft size={32} strokeWidth={1.5} />
            </button>
            <h3 className={headingClass + " mb-4"}>{currentNode?.name}</h3>
          </>
        ) : (
          <h2 className={headingClass + " mb-6"}>{title}</h2>
        )
      ) : showHeading ? (
        <h2 className={headingClass + " mb-6"}>{title}</h2>
      ) : null}

      {variant === "drilldown" && !showHeading && path.length > 0 ? (
        <>
          <button
            type="button"
            {...pressHandlers(goBack)}
            className="mb-4 flex items-center gap-2 hover:opacity-70 transition w-fit touch-manipulation"
            aria-label="Go back"
          >
            <ArrowLeft size={32} strokeWidth={1.5} />
          </button>
          <h3 className={headingClass + " mb-4"}>{currentNode?.name}</h3>
        </>
      ) : null}

      {loading ? <p className={textClass}>Loading...</p> : null}
      {error ? <p className={textClass}>{error}</p> : null}

      {!loading && !error && variant === "drilldown" ? (
        <div className="space-y-2">
          {path.length === 0 && quickLinks.length > 0 ? (
            <div className="mb-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A6D2B]">Shop By Age</p>
              <div className="space-y-1">
                {quickLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    {...pressHandlers(() => openHref(item.href))}
                    className="block w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-[#3E311C] transition hover:bg-[#F8F4EA]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {shouldHideRootCategories ? null : options.length === 0 ? (
            <p className={textClass}>No categories yet.</p>
          ) : (
            options.map((node) => (
              <div key={node.id} className="flex items-center gap-2">
                <button type="button" {...pressHandlers(() => handleSelect(node))} className={`${textClass} flex-1 touch-manipulation`}>
                  {node.name}
                </button>
                {isAdmin ? (
                  <DeleteCategoryControl categoryId={node.id} name={node.name} onDeleted={refreshMenu} />
                ) : null}
              </div>
            ))
          )}
          {isAdmin && addParent ? (
            <AddCategoryControl parentId={addParent.id} parentName={addParent.name} onSaved={refreshMenu} />
          ) : null}
        </div>
      ) : null}

      {!loading && !error && variant === "accordion" ? (
        <div className="space-y-2">
          {path.length === 0 && quickLinks.length > 0 ? (
            <div className="mb-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A6D2B]">Shop By Age</p>
              <div className="space-y-1">
                {quickLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    {...pressHandlers(() => openHref(item.href))}
                    className="block w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-[#3E311C] transition hover:bg-[#F8F4EA]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {shouldHideRootCategories ? null : renderAccordionNodes(options)}
          {isAdmin && addParent ? (
            <AddCategoryControl parentId={addParent.id} parentName={addParent.name} onSaved={refreshMenu} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
