import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const pkCol = schema.primaryKey;
  const rowLimit = String(activeTab?.ui?.tableRowLimit ?? 50);
  const rowFilter = activeTab?.ui?.tableRowFilter ?? "";

  const filteredRows = React.useMemo(() => {
    const q = rowFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      try {
        return JSON.stringify(r).toLowerCase().includes(q);
      } catch {
        return false;
      }
    });
  }, [rowFilter, rows]);

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
                  setTabUi(activeTabId, { tableRowLimit: Number(v) });
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
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Input
                value={rowFilter}
                onChange={(e) => setTabUi(activeTabId, { tableRowFilter: e.currentTarget.value })}
                placeholder="Filter loaded rows…"
                className="h-8 max-w-md"
              />
              {rowFilter.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setTabUi(activeTabId, { tableRowFilter: "" })}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-mono">{filteredRows.length}</span> of{" "}
              <span className="font-mono">{rows.length}</span>
            </div>
          </div>
          </div>
          {rows.length > 0 && rowFilter.trim() && filteredRows.length === 0 ? (
            <div className="mx-3 mb-2 rounded-md border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
              No matches for <span className="font-mono">{rowFilter.trim()}</span>.
            </div>
          ) : null}
          {(tableRowsState[table] ?? "idle") === "loading" ? (
            <div className="mx-3 mb-2 text-xs text-muted-foreground">Loading rows…</div>
          ) : null}
          {tableRowsError[table] ? (
            <div className="mx-3 mb-2 text-xs text-destructive">Load failed: {tableRowsError[table]}</div>
          ) : null}
          {(tableRowsState[table] ?? "idle") === "loaded" && rows.length === 0 ? (
            <div className="mx-3 mb-2 text-xs text-muted-foreground">No rows (loaded).</div>
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
                      <div className="flex items-center gap-2">
                        <span>{c}</span>
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
                      </div>
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
                          <span className={cn(c === pkCol ? "text-foreground" : "text-foreground")}>
                            {previewCell(r[c])}
                          </span>
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

