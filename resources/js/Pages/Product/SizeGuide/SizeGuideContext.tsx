import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { SIZE_GUIDE_DATA } from "./sizeGuideData";
import type { GenderKey, GenderSizeGuide, MeasurementGroup } from "./types";

type SizeGuideContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Active measurement group key (men / women / kids / bags / custom). */
  groupKey: string;
  setGroupKey: (key: string) => void;
  /** Legacy alias of groupKey kept for older call sites. */
  gender: string;
  groups: MeasurementGroup[];
};

const SizeGuideContext = createContext<SizeGuideContextValue | undefined>(undefined);

const LEGACY_KEYWORDS: Record<GenderKey, string[]> = {
  men: ["men", "mens", "man"],
  women: ["women", "womens", "ladies"],
  kids: ["kids", "kid", "boys", "girls", "children", "child"],
};

/** Converts the bundled fallback data into the server group shape. */
const fallbackGroups = (): MeasurementGroup[] =>
  (Object.keys(SIZE_GUIDE_DATA) as GenderKey[]).map((key) => {
    const guide = SIZE_GUIDE_DATA[key];
    const table = guide.sections.find((section) => section.kind === "table");
    const columns = table && table.kind === "table" ? table.columns : ["Size"];
    const columnDefs = columns.map((label, index) => ({ key: `col-${index + 1}`, label }));
    const rows =
      table && table.kind === "table"
        ? table.rows.map((row) =>
            columnDefs.reduce<Record<string, string>>((acc, column, index) => {
              acc[column.key] = String(row[index] ?? "");
              return acc;
            }, {})
          )
        : [];
    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      heading: guide.heading,
      subtitle: guide.subtitle,
      keywords: LEGACY_KEYWORDS[key],
      columns: columnDefs,
      rows,
      is_default: true,
    };
  });

const isMeasurementGroup = (value: unknown): value is MeasurementGroup =>
  Boolean(value) &&
  typeof value === "object" &&
  typeof (value as MeasurementGroup).key === "string" &&
  Array.isArray((value as MeasurementGroup).columns);

/** Reads the admin-managed groups from shared props, falling back to bundled data. */
export function useMeasurementGroups(): MeasurementGroup[] {
  const page = usePage<{ storeSettings?: { size_guide?: { groups?: unknown } } }>();
  const raw = page.props.storeSettings?.size_guide?.groups;

  return useMemo(() => {
    const groups = Array.isArray(raw) ? raw.filter(isMeasurementGroup) : [];
    return groups.length > 0 ? groups : fallbackGroups();
  }, [raw]);
}

type ProviderProps = {
  initialGroupKey?: string;
  /** @deprecated use initialGroupKey */
  initialGender?: GenderKey | string;
  children: React.ReactNode;
};

export function SizeGuideProvider({ initialGroupKey, initialGender, children }: ProviderProps) {
  const groups = useMeasurementGroups();
  const requestedKey = initialGroupKey ?? initialGender ?? "men";
  const resolveKey = (key: string) => (groups.some((group) => group.key === key) ? key : groups[0]?.key ?? "men");

  const [isOpen, setIsOpen] = useState(false);
  const [groupKey, setGroupKeyState] = useState<string>(() => resolveKey(requestedKey));

  // Follow the product when it changes (e.g. colour/variant swap re-infers the group).
  useEffect(() => {
    setGroupKeyState(resolveKey(requestedKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedKey, groups]);

  const value = useMemo<SizeGuideContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      groupKey,
      setGroupKey: (key: string) => setGroupKeyState(resolveKey(key)),
      gender: groupKey,
      groups,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupKey, groups, isOpen]
  );

  return <SizeGuideContext.Provider value={value}>{children}</SizeGuideContext.Provider>;
}

export function useSizeGuide() {
  const ctx = useContext(SizeGuideContext);
  if (!ctx) {
    throw new Error("useSizeGuide must be used inside SizeGuideProvider");
  }
  return ctx;
}

export type SizeGuideViewData = GenderSizeGuide & {
  groups: MeasurementGroup[];
  activeKey: string;
  activeLabel: string;
  setActiveKey: (key: string) => void;
};

/** Converts a group into the table shape the modal renders. */
export function groupToGuide(group: MeasurementGroup): GenderSizeGuide {
  return {
    heading: group.heading || `${group.label} Size Guide`,
    subtitle: group.subtitle || "",
    sections: [
      {
        kind: "table",
        id: group.key,
        title: group.heading || group.label,
        columns: group.columns.map((column) => column.label),
        rows: group.rows.map((row) => group.columns.map((column) => String(row[column.key] ?? ""))),
      },
    ],
  };
}

export function useSizeGuideData(): SizeGuideViewData {
  const { groupKey, setGroupKey, groups } = useSizeGuide();
  const active = groups.find((group) => group.key === groupKey) ?? groups[0];

  return useMemo(
    () => ({
      ...groupToGuide(active),
      groups,
      activeKey: active.key,
      activeLabel: active.label,
      setActiveKey: setGroupKey,
    }),
    [active, groups, setGroupKey]
  );
}
