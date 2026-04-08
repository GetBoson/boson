import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusCallout } from "@/boson/status-callout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function previewCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v.length > 40 ? `${v.slice(0, 37)}…` : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 40 ? `${s.slice(0, 37)}…` : s;
  } catch {
    return String(v);
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  const sa = typeof a === "string" ? a : JSON.stringify(a);
  const sb = typeof b === "string" ? b : JSON.stringify(b);
  return sa.localeCompare(sb);
}

export function TableTabView({ table }: { table: TableName }) {
  const {
    domain,
    openRecord,
    navigateActive,
    setSelection,
    connection,
    fetchRowsForTable,
    tableRowsState,
    tableRowsError,
    activeTabId,
    activeTab,
    setTabUi,
  } =
    useWorkspace();
  const schema = domain.tables[table];
  const rows = domain.rows[table];
  if (!schema) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Table not found</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            This tab references <span className="font-mono">{table}</span>, but it doesn’t exist in the current schema.
          </CardContent>
        </Card>
      </div>
    );
  }

  const cols = schema.columns.map((c) => c.name);

  const outgoingFks = domain.foreignKeys.filter((f) => f.fromTable === table);
  const incomingFks = domain.foreignKeys.filter((f) => f.toTable === table);
  const fkColumns = new Set(outgoingFks.map((f) => f.fromColumn));
  const fkByColumn = React.useMemo(() => {
    const m = new Map<string, (typeof outgoingFks)[number]>();
    for (const fk of outgoingFks) {
      // v1: if multiple FKs share a column, keep the first.
      if (!m.has(fk.fromColumn)) m.set(fk.fromColumn, fk);
    }
    return m;
  }, [outgoingFks]);
  const pkCol = schema.primaryKey;
  const tableUiMap = activeTab?.ui?.tableUi ?? {};
  const currentTableUi = tableUiMap[table] ?? {};
  const rowLimit = String(currentTableUi.rowLimit ?? 50);
  const rowFilter = currentTableUi.rowFilter ?? "";
  const sort = currentTableUi.sort ?? null;
  const columnFilters = currentTableUi.columnFilters ?? [];

  const setCurrentTableUi = React.useCallback(
    (next: Partial<NonNullable<typeof currentTableUi>>) => {
      const nextForTable = { ...(tableUiMap[table] ?? {}), ...next };
      setTabUi(activeTabId, {
        tableUi: {
          ...tableUiMap,
          [table]: nextForTable,
        },
      });
    },
    [activeTabId, setTabUi, table, tableUiMap],
  );

  const setTableUiFor = React.useCallback(
    (
      t: TableName,
      next: Partial<NonNullable<NonNullable<typeof tableUiMap>[TableName]>>,
    ) => {
      const prev = (tableUiMap as Record<TableName, any>)[t] ?? {};
      setTabUi(activeTabId, {
        tableUi: {
          ...tableUiMap,
          [t]: { ...prev, ...next },
        },
      });
    },
    [activeTabId, setTabUi, tableUiMap],
  );

  const [draftFilterCol, setDraftFilterCol] = React.useState<string>(() => cols[0] ?? "");
  const [draftFilterOp, setDraftFilterOp] = React.useState<"contains" | "equals" | "gt" | "lt" | "is_null" | "not_null">(
    "contains",
  );
  const [draftFilterValue, setDraftFilterValue] = React.useState("");

  // If the table/columns change, ensure the draft column remains valid.
  React.useEffect(() => {
    if (!cols.length) {
      if (draftFilterCol) setDraftFilterCol("");
      return;
    }
    if (!draftFilterCol || !cols.includes(draftFilterCol)) {
      setDraftFilterCol(cols[0]!);
      setDraftFilterValue("");
      setDraftFilterOp("contains");
    }
  }, [cols, draftFilterCol, table]);

  const filteredRows = React.useMemo(() => {
    let out = rows;

    // Column-aware filters first.
    if (columnFilters.length) {
      out = out.filter((r) => {
        return columnFilters.every((f) => {
          const v = r[f.column];
          if (f.op === "is_null") return v == null;
          if (f.op === "not_null") return v != null;
          const needle = (f.value ?? "").toLowerCase();
          if (f.op === "contains") return String(v ?? "").toLowerCase().includes(needle);
          if (f.op === "equals") return String(v ?? "") === (f.value ?? "");
          if (f.op === "gt") return Number(v) > Number(f.value);
          if (f.op === "lt") return Number(v) < Number(f.value);
          return true;
        });
      });
    }

    // Global text filter over loaded rows (fallback / quick scan).
    const q = rowFilter.trim().toLowerCase();
    if (q) {
      out = out.filter((r) => {
        try {
          return JSON.stringify(r).toLowerCase().includes(q);
        } catch {
          return false;
        }
      });
    }

    // Sorting (client-side on loaded rows).
    if (sort?.column) {
      const dir = sort.direction === "desc" ? -1 : 1;
      out = [...out].sort((ra, rb) => dir * compareValues(ra[sort.column], rb[sort.column]));
    }

    return out;
  }, [columnFilters, rowFilter, rows, sort]);

  function isNewTabIntent(e: React.MouseEvent): boolean {
    return Boolean(e.metaKey || e.ctrlKey);
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (connection.status !== "connected") return;
      if ((tableRowsState[table] ?? "idle") !== "idle") return;
      await fetchRowsForTable(table, Number(rowLimit));
      if (cancelled) return;
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [connection.status, fetchRowsForTable, rowLimit, table, tableRowsState]);

  return (
    <div className="p-4">
      <Card className="overflow-hidden bg-data/30">
        <CardHeader className="space-y-2 pb-3">
          <CardTitle className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Table</div>
              <div className="truncate text-base font-semibold tracking-tight">
                <span className="font-mono">{table}</span>
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <div className="font-mono">{rows.length}</div>
              <div>rows</div>
            </div>
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            <span className="font-mono">pk</span>{" "}
            <span className="font-mono text-foreground/80">{pkCol ?? "—"}</span>
            <span className="px-2 text-muted-foreground">·</span>
            <span className="font-mono">out</span>{" "}
            <span className="font-mono text-foreground/80">{outgoingFks.length}</span>
            <span className="px-2 text-muted-foreground">·</span>
            <span className="font-mono">in</span>{" "}
            <span className="font-mono text-foreground/80">{incomingFks.length}</span>
            {fkColumns.size > 0 ? (
              <>
                <span className="px-2 text-muted-foreground">·</span>
                <span className="font-mono">fk_cols</span>{" "}
                <span className="font-mono text-foreground/80">{fkColumns.size}</span>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Rows</span>
              <Select
                value={rowLimit}
                onValueChange={async (v) => {
                  if (!v) return;
                  setCurrentTableUi({ rowLimit: Number(v) });
                  if (connection.status !== "connected") return;
                  await fetchRowsForTable(table, Number(v));
                }}
              >
                <SelectTrigger size="sm" className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">max</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2"
                disabled={connection.status !== "connected" || (tableRowsState[table] ?? "idle") === "loading"}
                onClick={async () => {
                  if (connection.status !== "connected") return;
                  await fetchRowsForTable(table, Number(rowLimit));
                }}
                title="Reload rows"
              >
                Reload
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {pkCol ? (
                <>
                  Click a row to open. <span className="font-mono">⌘/Ctrl</span> opens a new tab.
                </>
              ) : (
                <>Record navigation requires a single-column primary key (v1).</>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto p-0">
          <div className="border-b bg-data/40">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <Input
                  value={rowFilter}
                  onChange={(e) => setCurrentTableUi({ rowFilter: e.currentTarget.value })}
                  placeholder="Search loaded rows…"
                  className="h-8 max-w-xs"
                />
                {rowFilter.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setCurrentTableUi({ rowFilter: "" })}
                  >
                    Clear
                  </Button>
                ) : null}

                <span className="mx-1 h-4 w-px bg-border" />

                <Select value={draftFilterCol} onValueChange={(v) => setDraftFilterCol(v ?? "")}>
                  <SelectTrigger size="sm" className="h-8 font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cols.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draftFilterOp} onValueChange={(v) => setDraftFilterOp((v as any) ?? "contains")}>
                  <SelectTrigger size="sm" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="gt">{">"}</SelectItem>
                    <SelectItem value="lt">{"<"}</SelectItem>
                    <SelectItem value="is_null">is null</SelectItem>
                    <SelectItem value="not_null">not null</SelectItem>
                  </SelectContent>
                </Select>

                {draftFilterOp === "is_null" || draftFilterOp === "not_null" ? null : (
                  <Input
                    value={draftFilterValue}
                    onChange={(e) => setDraftFilterValue(e.currentTarget.value)}
                    placeholder="value"
                    className="h-8 w-[160px] font-mono text-xs"
                  />
                )}

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (!draftFilterCol) return;
                    const next = [
                      ...columnFilters,
                      {
                        column: draftFilterCol,
                        op: draftFilterOp,
                        value:
                          draftFilterOp === "is_null" || draftFilterOp === "not_null"
                            ? undefined
                            : draftFilterValue,
                      },
                    ];
                    setCurrentTableUi({ columnFilters: next });
                    if (draftFilterOp !== "is_null" && draftFilterOp !== "not_null") setDraftFilterValue("");
                  }}
                >
                  Add filter
                </Button>

                {columnFilters.length ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => setCurrentTableUi({ columnFilters: [] })}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>

              <div className="text-xs text-muted-foreground">
                Showing <span className="font-mono">{filteredRows.length}</span> of{" "}
                <span className="font-mono">{rows.length}</span>
              </div>
          </div>

            {columnFilters.length ? (
              <div className="flex flex-wrap items-center gap-2 px-3 pb-2 text-xs text-muted-foreground">
                {columnFilters.map((f, idx) => (
                  <button
                    key={`${f.column}:${f.op}:${String(f.value)}:${idx}`}
                    type="button"
                    className="rounded-md border bg-background/20 px-2 py-1 hover:bg-muted/40"
                    onClick={() => {
                      const next = columnFilters.filter((_, i) => i !== idx);
                      setCurrentTableUi({ columnFilters: next });
                    }}
                    title="Remove filter"
                  >
                    <span className="font-mono">{f.column}</span> {f.op}
                    {f.value != null ? <span className="font-mono"> {f.value}</span> : null}
                    <span className="ml-2 text-muted-foreground">×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {rows.length > 0 && filteredRows.length === 0 && (rowFilter.trim() || columnFilters.length > 0) ? (
            <StatusCallout tone="empty" title="No matches" className="mx-3 mb-2">
              {rowFilter.trim() ? (
                <>
                  No matches for <span className="font-mono">{rowFilter.trim()}</span>.
                </>
              ) : (
                <>No rows match the current column filters.</>
              )}
            </StatusCallout>
          ) : null}
          {(tableRowsState[table] ?? "idle") === "loading" ? (
            <StatusCallout tone="loading" title="Loading rows…" className="mx-3 mb-2" />
          ) : null}
          {tableRowsError[table] ? (
            <StatusCallout tone="error" title="Load failed" className="mx-3 mb-2">
              {tableRowsError[table]}
            </StatusCallout>
          ) : null}
          {(tableRowsState[table] ?? "idle") === "loaded" && rows.length === 0 ? (
            <StatusCallout tone="empty" title="No rows" className="mx-3 mb-2">
              This table returned zero rows for the current limit.
            </StatusCallout>
          ) : null}
          <div className="mx-3 mb-3 overflow-hidden rounded-md border bg-data/40">
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map((c) => (
                    <TableHead
                      key={c}
                      className={cn(
                        "font-mono text-[0.7rem]",
                        c === pkCol ? "bg-muted/30" : "",
                        fkColumns.has(c) ? "bg-muted/20" : "",
                      )}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 text-left hover:text-foreground"
                        onClick={() => {
                          const current = sort?.column === c ? sort.direction : null;
                          const nextDir = current === "asc" ? "desc" : current === "desc" ? null : "asc";
                          setCurrentTableUi({ sort: nextDir ? { column: c, direction: nextDir } : null });
                        }}
                        title="Sort"
                      >
                        <span>{c}</span>
                        {sort?.column === c ? (
                          <span className="text-muted-foreground">{sort.direction === "asc" ? "▲" : "▼"}</span>
                        ) : null}
                        {c === pkCol ? (
                          <span className="rounded bg-foreground/5 px-1 py-0.5 text-[0.6rem] text-muted-foreground">
                            PK
                          </span>
                        ) : null}
                        {fkColumns.has(c) ? (
                          <span className="rounded bg-foreground/5 px-1 py-0.5 text-[0.6rem] text-muted-foreground">
                            FK
                          </span>
                        ) : null}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((r) => {
                  const pk = pkCol ? r[pkCol] : undefined;
                  return (
                    <TableRow
                      key={pkCol ? String(pk) : JSON.stringify(r)}
                      className={cn(pkCol ? "cursor-pointer hover:bg-muted/40" : "opacity-80")}
                      onClick={(e) => {
                        if (!pkCol) return;
                        setSelection({ kind: "record", table, pk });
                        if (isNewTabIntent(e)) openRecord(table, pk, { newTab: true });
                        else navigateActive({ kind: "record", table, pk });
                      }}
                      onDoubleClick={() => {
                        if (!pkCol) return;
                        openRecord(table, pk, { newTab: true });
                      }}
                    >
                      {cols.map((c) => (
                        <TableCell
                          key={c}
                          className={cn(
                            "max-w-[280px] truncate font-mono text-xs",
                            c === pkCol ? "bg-muted/30" : "",
                            fkColumns.has(c) ? "bg-muted/20" : "",
                          )}
                        >
                          {fkColumns.has(c) && r[c] != null ? (
                            <button
                              type="button"
                              className="w-full truncate text-left font-mono text-xs text-foreground underline decoration-border/60 underline-offset-2 hover:decoration-foreground/40"
                              title={
                                fkByColumn.get(c)
                                  ? `Open related: ${fkByColumn.get(c)!.toTable}.${fkByColumn.get(c)!.toColumn}`
                                  : "Open related"
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const fk = fkByColumn.get(c);
                                if (!fk) return;
                                const v = r[c];
                                const targetSchema = domain.tables[fk.toTable];
                                const canOpenRecord =
                                  !!targetSchema?.primaryKey &&
                                  targetSchema.primaryKey === fk.toColumn &&
                                  v != null;

                                if (canOpenRecord) {
                                  setSelection({ kind: "record", table: fk.toTable, pk: v });
                                  if (isNewTabIntent(e)) openRecord(fk.toTable, v, { newTab: true });
                                  else navigateActive({ kind: "record", table: fk.toTable, pk: v });
                                  return;
                                }

                                // Fallback: open the target table and pre-apply an equals filter on the FK target column.
                                setSelection({ kind: "table", table: fk.toTable });
                                navigateActive({ kind: "table", table: fk.toTable });
                                setTableUiFor(fk.toTable, {
                                  columnFilters: [{ column: fk.toColumn, op: "equals", value: String(v) }],
                                  rowFilter: "",
                                  sort: null,
                                });
                              }}
                            >
                              {previewCell(r[c])}
                              <span className="ml-2 text-[0.7rem] text-muted-foreground">
                                ↗
                              </span>
                            </button>
                          ) : (
                            <span className="text-foreground">{previewCell(r[c])}</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

