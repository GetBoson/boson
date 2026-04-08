import * as React from "react";

import { createFakeDomain, type FakeDomain, type TableName } from "@/boson/fake-domain";

export type TabKind = "schema" | "table" | "record";

export type SchemaTab = { kind: "schema" };
export type TableTab = { kind: "table"; table: TableName };
export type RecordTab = { kind: "record"; table: TableName; pk: unknown };

export type TabSpec = SchemaTab | TableTab | RecordTab;

export type WorkspaceTab = {
  id: string;
  title: string;
  spec: TabSpec;
  history: TabSpec[];
};

export type Selection =
  | { kind: "none" }
  | { kind: "table"; table: TableName }
  | { kind: "record"; table: TableName; pk: unknown };

type Ctx = {
  domain: FakeDomain;
  tabs: WorkspaceTab[];
  activeTabId: string;
  activeTab: WorkspaceTab | undefined;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  toggleInspector: () => void;
  selection: Selection;
  setSelection: (s: Selection) => void;
  openSchema: (opts?: { newTab?: boolean }) => void;
  openTable: (table: TableName, opts?: { newTab?: boolean }) => void;
  openRecord: (table: TableName, pk: unknown, opts?: { newTab?: boolean }) => void;
  navigateActive: (spec: TabSpec) => void;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;
  goBack: (tabId: string) => void;
};

const WorkspaceContext = React.createContext<Ctx | null>(null);

export function useWorkspace(): Ctx {
  const ctx = React.useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

function titleForSpec(spec: TabSpec): string {
  if (spec.kind === "schema") return "Schema";
  if (spec.kind === "table") return spec.table;
  return `${spec.table} · ${String(spec.pk).slice(0, 8)}…`;
}

function equalSpec(a: TabSpec, b: TabSpec): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "schema") return true;
  if (a.kind === "table" && b.kind === "table") return a.table === b.table;
  if (a.kind === "record" && b.kind === "record") return a.table === b.table && a.pk === b.pk;
  return false;
}

function makeTabId(spec: TabSpec): string {
  const rand = Math.random().toString(16).slice(2);
  if (spec.kind === "schema") return `tab_schema_${rand}`;
  if (spec.kind === "table") return `tab_table_${spec.table}_${rand}`;
  return `tab_record_${spec.table}_${String(spec.pk)}_${rand}`;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [domain] = React.useState(() => createFakeDomain());
  const [selection, setSelection] = React.useState<Selection>({ kind: "none" });
  const [inspectorOpen, setInspectorOpen] = React.useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  const [tabs, setTabs] = React.useState<WorkspaceTab[]>(() => {
    const spec: TabSpec = { kind: "schema" };
    return [
      {
        id: makeTabId(spec),
        title: titleForSpec(spec),
        spec,
        history: [spec],
      },
    ];
  });
  const [activeTabId, setActiveTabId] = React.useState(() => tabs[0]?.id ?? "");

  const open = React.useCallback(
    (spec: TabSpec, opts?: { newTab?: boolean }) => {
      setTabs((prev) => {
        if (!opts?.newTab) {
          const existing = prev.find((t) => equalSpec(t.spec, spec));
          if (existing) {
            setActiveTabId(existing.id);
            return prev.map((t) => {
              if (t.id !== existing.id) return t;
              const last = t.history[t.history.length - 1];
              const nextHistory = last && equalSpec(last, spec) ? t.history : [...t.history, spec];
              return { ...t, spec, title: titleForSpec(spec), history: nextHistory };
            });
          }
        }

        const id = makeTabId(spec);
        const tab: WorkspaceTab = { id, title: titleForSpec(spec), spec, history: [spec] };
        setActiveTabId(id);
        return [...prev, tab];
      });
    },
    [setTabs],
  );

  const closeTab = React.useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        if (idx < 0) return prev;
        const next = prev.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          const fallback = next[idx - 1] ?? next[0];
          if (fallback) setActiveTabId(fallback.id);
        }
        if (next.length) return next;
        const spec: TabSpec = { kind: "schema" };
        const tab: WorkspaceTab = { id: makeTabId(spec), title: titleForSpec(spec), spec, history: [spec] };
        setActiveTabId(tab.id);
        return [tab];
      });
    },
    [activeTabId],
  );

  const openSchema = React.useCallback((opts?: { newTab?: boolean }) => open({ kind: "schema" }, opts), [
    open,
  ]);
  const openTable = React.useCallback(
    (table: TableName, opts?: { newTab?: boolean }) => open({ kind: "table", table }, opts),
    [open],
  );
  const openRecord = React.useCallback(
    (table: TableName, pk: unknown, opts?: { newTab?: boolean }) => open({ kind: "record", table, pk }, opts),
    [open],
  );

  // Opinionated navigation: replace the active tab’s spec (and push into its history).
  // Used for “follow related record” flows to keep users oriented.
  const navigateActive = React.useCallback(
    (spec: TabSpec) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          const last = t.history[t.history.length - 1];
          const nextHistory = last && equalSpec(last, spec) ? t.history : [...t.history, spec];
          return { ...t, spec, title: titleForSpec(spec), history: nextHistory };
        }),
      );
    },
    [activeTabId, setTabs],
  );

  const goBack = React.useCallback(
    (tabId: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (t.history.length <= 1) return t;
          const nextHistory = t.history.slice(0, -1);
          const nextSpec = nextHistory[nextHistory.length - 1]!;
          return { ...t, spec: nextSpec, title: titleForSpec(nextSpec), history: nextHistory };
        }),
      );
    },
    [setTabs],
  );

  const toggleInspector = React.useCallback(() => setInspectorOpen((v) => !v), []);

  const activeTab = React.useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs],
  );

  const openCommandPalette = React.useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = React.useCallback(() => setCommandPaletteOpen(false), []);

  const value: Ctx = {
    domain,
    tabs,
    activeTabId,
    activeTab,
    commandPaletteOpen,
    setCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    inspectorOpen,
    setInspectorOpen,
    toggleInspector,
    selection,
    setSelection,
    openSchema,
    openTable,
    openRecord,
    navigateActive,
    closeTab,
    setActiveTabId,
    goBack,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

