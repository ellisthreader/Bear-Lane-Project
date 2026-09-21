import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Trash2 } from "lucide-react";
import { AdminPage, Button, Card, Input, Notice, PlusMinusButton, SaveBar, Select, adminFetch, inputClass } from "@/Components/Admin/ui";

/*
 * Measurements — one dropdown, one table.
 *
 *   Pick the table you want (Men, Women, Kids, Bags, or one you added), edit it,
 *   save. Product pages pick the right table automatically from its name.
 */

type Column = { key: string; label: string };

type Group = {
  key: string;
  label: string;
  heading: string;
  subtitle: string;
  keywords: string[];
  category_ids: number[];
  columns: Column[];
  rows: Array<Record<string, string>>;
  is_default: boolean;
  _id: string;
};

type Props = {
  sizeGuide: { groups: Array<Omit<Group, "_id" | "category_ids"> & { category_ids?: number[] }> };
};

let counter = 0;
const localId = () => `g-${Date.now()}-${counter++}`;

const slug = (value: string, fallback: string) => {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return key || fallback;
};

const withIds = (groups: Props["sizeGuide"]["groups"]): Group[] =>
  groups.map((group) => ({
    ...group,
    keywords: [...(group.keywords ?? [])],
    category_ids: [...(group.category_ids ?? [])],
    columns: group.columns.map((column) => ({ ...column })),
    rows: group.rows.map((row) => ({ ...row })),
    _id: localId(),
  }));

const serialize = (groups: Group[]) => JSON.stringify(groups.map(({ _id, ...rest }) => rest));

const blankTable = (): Group => ({
  key: "",
  label: "",
  heading: "",
  subtitle: "",
  keywords: [],
  category_ids: [],
  columns: [
    { key: "size", label: "Size" },
    { key: "chest", label: "Chest CM" },
    { key: "length", label: "Length CM" },
  ],
  rows: [
    { size: "S", chest: "", length: "" },
    { size: "M", chest: "", length: "" },
    { size: "L", chest: "", length: "" },
  ],
  is_default: false,
  _id: localId(),
});

/** Words in the table name that product pages use to pick it ("Men's shirts" → men, mens, shirt, shirts). */
const keywordsFromName = (label: string) => {
  const words = label
    .toLowerCase()
    .replace(/'/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  const out = new Set<string>();
  words.forEach((word) => {
    out.add(word);
    if (word.endsWith("s")) out.add(word.slice(0, -1));
    else out.add(`${word}s`);
  });
  return Array.from(out);
};

export default function SizeGuide({ sizeGuide }: Props) {
  const [groups, setGroups] = useState<Group[]>(() => withIds(sizeGuide.groups));
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(withIds(sizeGuide.groups)));
  const [activeId, setActiveId] = useState<string>(() => groups[0]?._id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const active = groups.find((group) => group._id === activeId) ?? groups[0] ?? null;
  const dirty = useMemo(() => serialize(groups) !== savedSnapshot, [groups, savedSnapshot]);

  const update = (updater: (group: Group) => Group) => {
    if (!active) return;
    setGroups((prev) => prev.map((group) => (group._id === active._id ? updater(group) : group)));
  };

  const addTable = () => {
    const table = blankTable();
    setGroups((prev) => [...prev, table]);
    setActiveId(table._id);
    setConfirmDelete(false);
  };

  const deleteTable = () => {
    if (!active || active.is_default) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    setGroups((prev) => {
      const next = prev.filter((group) => group._id !== active._id);
      setActiveId(next[0]?._id ?? "");
      return next;
    });
  };

  const setHeading = (index: number, label: string) =>
    update((group) => ({ ...group, columns: group.columns.map((column, i) => (i === index ? { ...column, label } : column)) }));

  const addColumn = () =>
    update((group) => {
      const key = `col-${Date.now().toString(36)}`;
      return { ...group, columns: [...group.columns, { key, label: "New column" }], rows: group.rows.map((row) => ({ ...row, [key]: "" })) };
    });

  const removeColumn = (index: number) =>
    update((group) => {
      if (group.columns.length <= 1) return group;
      const removed = group.columns[index];
      return {
        ...group,
        columns: group.columns.filter((_, i) => i !== index),
        rows: group.rows.map((row) => {
          const next = { ...row };
          delete next[removed.key];
          return next;
        }),
      };
    });

  const setCell = (rowIndex: number, key: string, value: string) =>
    update((group) => ({ ...group, rows: group.rows.map((row, i) => (i === rowIndex ? { ...row, [key]: value } : row)) }));

  const addRow = () => update((group) => ({ ...group, rows: [...group.rows, Object.fromEntries(group.columns.map((column) => [column.key, ""]))] }));

  const removeRow = (rowIndex: number) => update((group) => ({ ...group, rows: group.rows.filter((_, i) => i !== rowIndex) }));

  const save = async () => {
    if (groups.some((group) => !group.label.trim())) {
      toast.error("Give every table a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        groups: groups.map(({ _id, ...group }, index) => ({
          ...group,
          key: group.key || slug(group.label, `table-${index + 1}`),
          heading: group.heading.trim() || `${group.label.trim()} size guide`,
          keywords: group.keywords.length ? group.keywords : keywordsFromName(group.label),
          columns: group.columns.map((column, i) => ({ key: column.key || slug(column.label, `col-${i + 1}`), label: column.label })),
        })),
      };
      const data = await adminFetch<{ size_guide: Props["sizeGuide"]; message?: string }>("/admin/other/size-guide", { method: "PUT", body: payload });
      const next = withIds(data.size_guide.groups);
      setGroups(next);
      setSavedSnapshot(serialize(next));
      setActiveId((next.find((group) => group.label === active?.label) ?? next[0])?._id ?? "");
      toast.success(data.message || "Measurements saved.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save measurements.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    const reset = withIds(sizeGuide.groups);
    setGroups(reset);
    setSavedSnapshot(serialize(reset));
    setActiveId(reset[0]?._id ?? "");
    setError(null);
  };

  return (
    <AdminPage
      eyebrow="Other / Measurements"
      title="Measurements"
      description="Choose a table, edit it, save. Products use the table that matches their type."
      backHref="/admin/other"
      backLabel="Back to Other"
    >
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        {/* Which table --------------------------------------------------- */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[240px] flex-1">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B5A34]">Which table?</span>
            <Select
              value={active?._id ?? ""}
              onChange={(event) => {
                setActiveId(event.target.value);
                setConfirmDelete(false);
              }}
              className="h-12 text-base font-bold"
            >
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.label || "New table (unnamed)"}
                </option>
              ))}
            </Select>
          </label>
          <Button variant="primary" size="md" icon={<Plus className="h-4 w-4" />} onClick={addTable}>
            New table
          </Button>
          {active && !active.is_default ? (
            <Button variant={confirmDelete ? "danger" : "dangerGhost"} size="md" icon={<Trash2 className="h-4 w-4" />} onClick={deleteTable} onBlur={() => setConfirmDelete(false)}>
              {confirmDelete ? "Delete this table?" : "Delete table"}
            </Button>
          ) : null}
        </div>

        {active ? (
          <>
            {/* Name -------------------------------------------------------- */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B5A34]">Table name</span>
                <Input
                  value={active.label}
                  onChange={(event) => update((group) => ({ ...group, label: event.target.value }))}
                  placeholder="e.g. Men's shirts"
                  autoFocus={!active.label}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B5A34]">Title customers see (optional)</span>
                <Input value={active.heading} onChange={(event) => update((group) => ({ ...group, heading: event.target.value }))} placeholder={`${active.label || "Men's shirts"} size guide`} />
              </label>
            </div>

            {/* The table --------------------------------------------------- */}
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#EBE2CF] bg-[#FFFDF8] p-3">
              <table className="w-full min-w-[520px] border-separate border-spacing-1.5">
                <thead>
                  <tr>
                    {active.columns.map((column, index) => (
                      <th key={index} className="text-left">
                        <div className="flex items-center gap-1">
                          <input
                            value={column.label}
                            onChange={(event) => setHeading(index, event.target.value)}
                            className={`${inputClass} h-10 bg-[#F6EFDF] py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B5A34]`}
                            aria-label={`Column ${index + 1} heading`}
                          />
                          {active.columns.length > 1 ? <PlusMinusButton mode="remove" size="sm" label="Remove column" onClick={() => removeColumn(index)} /> : null}
                        </div>
                      </th>
                    ))}
                    <th className="w-12 text-left">
                      <PlusMinusButton mode="add" size="sm" label="Add column" onClick={addColumn} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {active.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {active.columns.map((column, colIndex) => (
                        <td key={colIndex}>
                          <input
                            value={row[column.key] ?? ""}
                            onChange={(event) => setCell(rowIndex, column.key, event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && rowIndex === active.rows.length - 1 && colIndex === active.columns.length - 1) {
                                event.preventDefault();
                                addRow();
                              }
                            }}
                            className={`${inputClass} h-11 py-1.5 ${colIndex === 0 ? "font-semibold" : ""}`}
                            aria-label={`${column.label} row ${rowIndex + 1}`}
                          />
                        </td>
                      ))}
                      <td>
                        <PlusMinusButton mode="remove" size="sm" label={`Remove row ${rowIndex + 1}`} onClick={() => removeRow(rowIndex)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={addRow} className="mt-2">
                Add row
              </Button>
            </div>
            <p className="mt-3 text-xs text-[#8F8060]">Tip: press Enter in the last cell to start a new row. Use + and − to add or remove columns and rows.</p>
          </>
        ) : (
          <Notice className="mt-4">No tables yet. Press "New table" to add one.</Notice>
        )}
      </Card>

      <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={discard} label="Save measurements" note="Applies to product pages as soon as you save." />
    </AdminPage>
  );
}
