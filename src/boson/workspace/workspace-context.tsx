import * as React from "react";

import { createFakeDomain, type FakeDomain, type TableName } from "@/boson/fake-domain";
import { pgFetchRecord, pgFetchRows, pgIntrospectSchema, pgTestConnection, type PgSchemaIntrospection } from "@/boson/postgres";

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
  ui?: {
    recordViewMode?: "list" | "trail";
    tableRowLimit?: number;
    tableRowFilter?: string;
  };
};

export type Selection =
  | { kind: "none" }
  | { kind: "table"; table: TableName }
  | { kind: "record"; table: TableName; pk: unknown };

export type RecentItem =
  | { kind: "table"; table: TableName; at: number }
  | { kind: "record"; table: TableName; pk: unknown; at: number };

export type ConnectionState =
  | { status: "demo" }
  | { status: "connecting"; connStr: string }
  | { status: "refreshing"; connStr: string; database: string; schema: string; lastError?: string }
  | { status: "connected"; connStr: string; database: string; schema: string; lastError?: string }
  | { status: "error"; message: string };

export type TableRowsLoadState = "idle" | "loading" | "loaded";
export type RecordLoadState = "idle" | "loading" | "loaded" | "error";

export type RecentConnection = {
  connStr: string;
  database?: string;
  schema: string;
  at: number;
};

type RecordKey = string;

function recordKey(table: TableName, pk: unknown): RecordKey {
  return `${table}:${String(pk)}`;
}

type Ctx = {
  domain: FakeDomain;
  tabs: WorkspaceTab[];
  activeTabId: string;
  activeTab: WorkspaceTab | undefined;
  recents: RecentItem[];
  tableRowsState: Record<TableName, TableRowsLoadState>;
  tableRowsError: Record<TableName, string | undefined>;
  recordState: Record<RecordKey, RecordLoadState>;
  recordError: Record<RecordKey, string | undefined>;
  recentConnections: RecentConnection[];
  connection: ConnectionState;
  connectPostgres: (connStr: string, schema?: string) => Promise<boolean>;
  refreshSchema: () => Promise<boolean>;
  switchSchema: (schema: string) => Promise<boolean>;
  disconnect: () => void;
  connectDialogOpen: boolean;
  setConnectDialogOpen: (open: boolean) => void;
  openConnectDialog: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  toggleInspector: () => void;
  selection: Selection;
  setSelection: (s: Selection) => void;
  setTabUi: (tabId: string, ui: WorkspaceTab["ui"]) => void;
  setRowsForTable: (table: TableName, rows: Record<string, unknown>[]) => void;
  fetchRowsForTable: (table: TableName, limit?: number) => Promise<void>;
  fetchRecordByPk: (table: TableName, pk: unknown) => Promise<void>;
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
  const [domain, setDomain] = React.useState<FakeDomain>(() => createFakeDomain());
  const [selection, setSelection] = React.useState<Selection>({ kind: "none" });
  const [inspectorOpen, setInspectorOpen] = React.useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [recents, setRecents] = React.useState<RecentItem[]>([]);
  const [connection, setConnection] = React.useState<ConnectionState>({ status: "demo" });
  const [tableRowsState, setTableRowsState] = React.useState<Record<TableName, TableRowsLoadState>>({});
  const [tableRowsError, setTableRowsError] = React.useState<Record<TableName, string | undefined>>({});
  const [recordState, setRecordState] = React.useState<Record<RecordKey, RecordLoadState>>({});
  const [recordError, setRecordError] = React.useState<Record<RecordKey, string | undefined>>({});
  const [recentConnections, setRecentConnections] = React.useState<RecentConnection[]>([]);
  const [connectDialogOpen, setConnectDialogOpen] = React.useState(false);

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
        const tab: WorkspaceTab = { id, title: titleForSpec(spec), spec, history: [spec], ui: {} };
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
        const tab: WorkspaceTab = { id: makeTabId(spec), title: titleForSpec(spec), spec, history: [spec], ui: {} };
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

  const setTabUi = React.useCallback(
    (tabId: string, ui: WorkspaceTab["ui"]) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          return { ...t, ui: { ...(t.ui ?? {}), ...(ui ?? {}) } };
        }),
      );
    },
    [setTabs],
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

  const resetWorkspaceForNewDomain = React.useCallback(() => {
    const spec: TabSpec = { kind: "schema" };
    const tab: WorkspaceTab = { id: makeTabId(spec), title: titleForSpec(spec), spec, history: [spec], ui: {} };
    setTabs([tab]);
    setActiveTabId(tab.id);
    setSelection({ kind: "none" });
    setRecents([]);
    setTableRowsState({});
    setTableRowsError({});
    setRecordState({});
    setRecordError({});
  }, []);

  const disconnect = React.useCallback(() => {
    setConnection({ status: "demo" });
    setDomain(createFakeDomain());
    resetWorkspaceForNewDomain();
  }, []);

  const connectPostgres = React.useCallback(
    async (connStr: string, schema = "public") => {
      setConnection({ status: "connecting", connStr });
      try {
        const database = await pgTestConnection(connStr);
        const introspection: PgSchemaIntrospection = await pgIntrospectSchema(connStr, schema);
        const nextDomain = pgToDomain(introspection);
        setDomain(nextDomain);
        resetWorkspaceForNewDomain();
        setConnection({ status: "connected", connStr, database, schema, lastError: undefined });
        setRecentConnections((prev) => {
          const next: RecentConnection = { connStr, database, schema, at: Date.now() };
          const key = (c: RecentConnection) => `${c.connStr}::${c.schema}`;
          const seen = new Set<string>();
          const out: RecentConnection[] = [];
          for (const c of [next, ...prev]) {
            const k = key(c);
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(c);
            if (out.length >= 8) break;
          }
          return out;
        });
        return true;
      } catch (e) {
        setConnection({
          status: "error",
          message: e instanceof Error ? e.message : "Connect failed",
        });
        return false;
      }
    },
    [resetWorkspaceForNewDomain],
  );

  const switchSchema = React.useCallback(
    async (schema: string) => {
      if (connection.status !== "connected") return false;
      const nextSchema = schema.trim() || "public";
      const prevSchema = connection.schema;
      setConnection({
        status: "refreshing",
        connStr: connection.connStr,
        database: connection.database,
        schema: nextSchema,
        lastError: connection.lastError,
      });
      try {
        const introspection: PgSchemaIntrospection = await pgIntrospectSchema(connection.connStr, nextSchema);
        const nextDomain = pgToDomain(introspection);
        setDomain(nextDomain);
        resetWorkspaceForNewDomain();
        setConnection({
          status: "connected",
          connStr: connection.connStr,
          database: connection.database,
          schema: nextSchema,
          lastError: undefined,
        });
        setRecentConnections((prev) => {
          const next: RecentConnection = { connStr: connection.connStr, database: connection.database, schema: nextSchema, at: Date.now() };
          const key = (c: RecentConnection) => `${c.connStr}::${c.schema}`;
          const seen = new Set<string>();
          const out: RecentConnection[] = [];
          for (const c of [next, ...prev]) {
            const k = key(c);
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(c);
            if (out.length >= 8) break;
          }
          return out;
        });
        return true;
      } catch (e) {
        setConnection({
          status: "connected",
          connStr: connection.connStr,
          database: connection.database,
          schema: prevSchema,
          lastError: e instanceof Error ? e.message : "Schema refresh failed",
        });
        return false;
      }
    },
    [connection, resetWorkspaceForNewDomain],
  );

  const refreshSchema = React.useCallback(async () => {
    if (connection.status !== "connected") return false;
    return await switchSchema(connection.schema);
  }, [connection, switchSchema]);

  const setRowsForTable = React.useCallback((table: TableName, rowsForTable: Record<string, unknown>[]) => {
    setDomain((prev) => ({
      ...prev,
      rows: {
        ...prev.rows,
        [table]: rowsForTable,
      },
    }));
    setTableRowsState((prev) => ({ ...prev, [table]: "loaded" }));
    setTableRowsError((prev) => ({ ...prev, [table]: undefined }));
  }, []);

  const fetchRowsForTable = React.useCallback(
    async (table: TableName, limit = 50) => {
      if (connection.status !== "connected") return;
      setTableRowsState((prev) => ({ ...prev, [table]: "loading" }));
      setTableRowsError((prev) => ({ ...prev, [table]: undefined }));
      const [schemaName, tableName] = String(table).includes(".")
        ? String(table).split(".", 2)
        : [connection.schema, String(table)];
      try {
        const data = await pgFetchRows({
          conn_str: connection.connStr,
          schema: schemaName,
          table: tableName,
          limit,
        });
        // Best-effort: expect each item to be an object.
        const rowsForTable = data.filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
        setRowsForTable(table, rowsForTable);
      } catch (e) {
        setTableRowsError((prev) => ({
          ...prev,
          [table]: e instanceof Error ? e.message : "Failed to load rows",
        }));
        setTableRowsState((prev) => ({ ...prev, [table]: "loaded" }));
      }
    },
    [connection, setRowsForTable],
  );

  const fetchRecordByPk = React.useCallback(
    async (table: TableName, pk: unknown) => {
      if (connection.status !== "connected") return;
      const k = recordKey(table, pk);
      setRecordState((prev) => ({ ...prev, [k]: "loading" }));
      setRecordError((prev) => ({ ...prev, [k]: undefined }));

      const schema = domain.tables[table];
      if (!schema) {
        setRecordState((prev) => ({ ...prev, [k]: "error" }));
        setRecordError((prev) => ({ ...prev, [k]: `Unknown table: ${table}` }));
        return;
      }
      if (!schema.primaryKey) {
        setRecordState((prev) => ({ ...prev, [k]: "error" }));
        setRecordError((prev) => ({
          ...prev,
          [k]: "This table has no supported single-column primary key yet (v1 limitation).",
        }));
        return;
      }

      const [schemaName, tableName] = String(table).includes(".")
        ? String(table).split(".", 2)
        : [connection.schema, String(table)];

      try {
        const row = await pgFetchRecord({
          conn_str: connection.connStr,
          schema: schemaName,
          table: tableName,
          pk_column: schema.primaryKey,
          pk_value: String(pk),
        });

        if (!row || typeof row !== "object") {
          setRecordState((prev) => ({ ...prev, [k]: "loaded" }));
          return;
        }

        // Merge into domain rows cache.
        setDomain((prev) => {
          const existing = prev.rows[table] ?? [];
          const pkCol = prev.tables[table]?.primaryKey;
          if (!pkCol) return prev;
          const already = existing.some((r) => r && typeof r === "object" && (r as any)[pkCol] === pk);
          if (already) return prev;
          return {
            ...prev,
            rows: {
              ...prev.rows,
              [table]: [row as Record<string, unknown>, ...existing],
            },
          };
        });

        setRecordState((prev) => ({ ...prev, [k]: "loaded" }));
      } catch (e) {
        setRecordState((prev) => ({ ...prev, [k]: "error" }));
        setRecordError((prev) => ({ ...prev, [k]: e instanceof Error ? e.message : "Failed to load record" }));
      }
    },
    [connection, domain.tables],
  );

  // Track global recents from whatever the user is currently viewing.
  React.useEffect(() => {
    const spec = activeTab?.spec;
    if (!spec) return;
    if (spec.kind === "table") {
      const item: RecentItem = { kind: "table", table: spec.table, at: Date.now() };
      setRecents((prev) => dedupeAndCapRecents([item, ...prev]));
    }
    if (spec.kind === "record") {
      const item: RecentItem = { kind: "record", table: spec.table, pk: spec.pk, at: Date.now() };
      setRecents((prev) => dedupeAndCapRecents([item, ...prev]));
    }
  }, [activeTab?.spec]);

  const value: Ctx = {
    domain,
    tabs,
    activeTabId,
    activeTab,
    recents,
    tableRowsState,
    tableRowsError,
    recordState,
    recordError,
    recentConnections,
    connection,
    connectPostgres,
    refreshSchema,
    switchSchema,
    disconnect,
    connectDialogOpen,
    setConnectDialogOpen,
    openConnectDialog: () => setConnectDialogOpen(true),
    commandPaletteOpen,
    setCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    inspectorOpen,
    setInspectorOpen,
    toggleInspector,
    selection,
    setSelection,
    setTabUi,
    setRowsForTable,
    fetchRowsForTable,
    fetchRecordByPk,
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

function pgToDomain(intro: PgSchemaIntrospection): FakeDomain {
  const tables: FakeDomain["tables"] = {};
  const rows: FakeDomain["rows"] = {};

  for (const t of intro.tables) {
    const fullName = `${t.schema}.${t.name}`;
    tables[fullName] = {
      name: fullName,
      label: fullName,
      primaryKey: t.primary_key,
      columns: t.columns.map((c) => ({
        name: c.name,
        type: c.data_type,
        nullable: c.is_nullable,
      })),
    };
    rows[fullName] = [];
  }

  const foreignKeys = intro.foreign_keys.map((fk) => ({
    name: fk.name,
    fromTable: `${fk.from_schema}.${fk.from_table}`,
    fromColumn: fk.from_column,
    toTable: `${fk.to_schema}.${fk.to_table}`,
    toColumn: fk.to_column,
  }));

  return { tables, foreignKeys, rows };
}

function recentKey(r: RecentItem): string {
  if (r.kind === "table") return `table:${r.table}`;
  return `record:${r.table}:${String(r.pk)}`;
}

function dedupeAndCapRecents(list: RecentItem[], cap = 12): RecentItem[] {
  const seen = new Set<string>();
  const out: RecentItem[] = [];
  for (const item of list) {
    const k = recentKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= cap) break;
  }
  return out;
}

