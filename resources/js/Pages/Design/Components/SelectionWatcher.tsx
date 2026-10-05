import { useEffect, useRef } from "react";

type Layer =
  | { type: "text" }
  | { type: "image"; isClipart?: boolean };

type Props = {
  selected: string[];
  imageState: Record<string, Layer>;
  onSelectImage?: (uid: string | null) => void;
  onSelectText?: (uid: string | null) => void;
  onSwitchTab?: (tab: string | null) => void;
  onSelectionChange?: (selected: string[]) => void;
};

export default function SelectionWatcher({
  selected,
  imageState,
  onSelectionChange,
}: Props) {
  const prevSelectedRef = useRef<string[]>([]);

  useEffect(() => {
    const prev = prevSelectedRef.current;
    const isSame =
      prev.length === selected.length &&
      prev.every((v, i) => v === selected[i]);
    if (isSame) return;

    prevSelectedRef.current = selected;

    // ✅ Only report selection, DO NOT change uploaded image or text state
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);

  return null;
}
