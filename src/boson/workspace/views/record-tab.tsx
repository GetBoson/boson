import * as React from "react";
import {
  IconArrowUpRight,
  IconArrowsLeftRight,
  IconCornerDownLeft,
  IconCornerUpRight,
  IconExternalLink,
  IconList,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import { formatRowLabel, getRowByPk, type Row, type TableName } from "@/boson/fake-domain";

function stringify(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

type Related = {
  label: string;
  table: TableName;
  pk: unknown;
  via?: string;
};

function newTabIntent(e: React.MouseEvent | React.KeyboardEvent): boolean {
  // Matches common “open in new tab” intent on desktop (even outside the browser).
  // (We’re not using actual <a> tabs; this is an app-level convention.)
  // metaKey for macOS, ctrlKey elsewhere.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyE = e as any;
  return Boolean(anyE?.metaKey || anyE?.ctrlKey);
}

export function RecordTabView({ table, pk }: { table: TableName; pk: unknown }) {
  const {
    domain,
    openRecord,
    openTable,
    navigateActive,
    setSelection,
    activeTabId,
    activeTab,
    setTabUi,
    connection,
    recordState,
    recordError,
    fetchRecordByPk,
  } = useWorkspace();
  const row = getRowByPk(domain, table, pk);
  const schema = domain.tables[table];
  const viewMode = activeTab?.ui?.recordViewMode ?? "list";
  const rKey = `${table}:${String(pk)}`;

  React.useEffect(() => {
    if (row) return;
    if (connection.status !== "connected") return;
    if (!schema) return;
    const state = recordState[rKey] ?? "idle";
    if (state !== "idle") return;
    void fetchRecordByPk(table, pk);
  }, [connection.status, fetchRecordByPk, pk, rKey, recordState, row, schema, table]);

  const outgoing: Related[] = React.useMemo(() => {
    if (!row) return [];
    const rel: Related[] = [];
    for (const fk of domain.foreignKeys.filter((f) => f.fromTable === table)) {
      const v = row[fk.fromColumn];
      if (v != null) {
        rel.push({
          label: `${fk.toTable} (${fk.toColumn})`,
          table: fk.toTable,
          pk: v,
          via: `${table}.${fk.fromColumn} → ${fk.toTable}.${fk.toColumn}`,
        });
      }
    }
    return rel;
  }, [domain, row, table]);

  const incoming: Related[] = React.useMemo(() => {
    if (!row) return [];
    const rel: Related[] = [];
    for (const fk of domain.foreignKeys.filter((f) => f.toTable === table)) {
      const fromRows = domain.rows[fk.fromTable].filter((r) => r[fk.fromColumn] === pk);
      for (const r of fromRows) {
        const fromSchema = domain.tables[fk.fromTable];
        if (!fromSchema?.primaryKey) continue;
        const fromPk = r[fromSchema.primaryKey];
        if (fromPk == null) continue;
        rel.push({
          label: `${fk.fromTable} row`,
          table: fk.fromTable,
          pk: fromPk,
          via: `${fk.fromTable}.${fk.fromColumn} → ${table}.${fk.toColumn}`,
        });
      }
    }
    return rel;
  }, [domain, pk, row, table]);

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

  if (!schema.primaryKey) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unsupported table</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <div>
              <span className="font-mono">{table}</span> doesn’t have a supported single-column primary key yet (v1
              limitation).
            </div>
            <div className="mt-2">Record tabs require a primary key so Boson can anchor traversal and identity.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!row) {
    if (connection.status === "connected") {
      const state = recordState[rKey] ?? "idle";
      const err = recordError[rKey];
      return (
        <div className="p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {state === "loading" ? "Loading record…" : state === "error" ? "Load failed" : "Record not found"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {state === "loading" ? (
                <>
                  Fetching <span className="font-mono">{table}</span> by primary key{" "}
                  <span className="font-mono">{schema.primaryKey}</span>.
                </>
              ) : state === "error" ? (
                <span className="text-destructive">{err ?? "Failed to load record."}</span>
              ) : (
                <>
                  No row matched <span className="font-mono">{schema.primaryKey}</span> ={" "}
                  <span className="font-mono">{String(pk)}</span>.
                </>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Record not found</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            This is dummy data; the requested primary key wasn’t found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const recordLabel = formatRowLabel(domain, table, row);

  const breadcrumb = React.useMemo(() => {
    // Pull a readable “recent path” from tab history.
    // We use table names to keep it compact (and stable across record IDs).
    const hist = activeTab?.history ?? [];
    const tables: string[] = [];
    for (const s of hist) {
      if (s.kind === "table") tables.push(s.table);
      if (s.kind === "record") tables.push(s.table);
    }
    // Collapse consecutive duplicates.
    const collapsed = tables.filter((t, i) => i === 0 || t !== tables[i - 1]);
    // Keep the tail of the path and ensure current table appears at the end.
    const withCurrent =
      collapsed.length === 0 || collapsed[collapsed.length - 1] !== table
        ? [...collapsed, table]
        : collapsed;
    const max = 4;
    if (withCurrent.length <= max) return withCurrent;
    return ["…", ...withCurrent.slice(-max + 1)];
  }, [activeTab?.history, table]);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            Record <span className="font-mono">{table}</span>
          </div>
          <div className="truncate text-lg font-semibold tracking-tight">{recordLabel}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[0.7rem] text-muted-foreground">
            {breadcrumb.map((t, i) => (
              <span key={`${t}-${i}`} className={t === "…" ? "" : "font-mono"}>
                {t}
                {i < breadcrumb.length - 1 ? <span className="px-1 text-muted-foreground">→</span> : null}
              </span>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="font-mono">
              {schema.primaryKey}
            </Badge>
            <span className="font-mono text-muted-foreground">{String(pk)}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Outgoing <span className="font-mono">{outgoing.length}</span>
            </span>
            <span className="text-muted-foreground">
              Incoming <span className="font-mono">{incoming.length}</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center rounded-md border bg-background p-0.5">
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setTabUi(activeTabId, { recordViewMode: "list" })}
            >
              <IconList className="mr-2 size-4" />
              List
            </Button>
            <Button
              type="button"
              variant={viewMode === "trail" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setTabUi(activeTabId, { recordViewMode: "trail" })}
            >
              <IconArrowsLeftRight className="mr-2 size-4" />
              Trail
            </Button>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => openTable(table)}>
            Open table
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openRecord(table, pk, { newTab: true })}
            title="Open this record in a new tab"
          >
            <IconExternalLink className="mr-2 size-4" />
            New tab
          </Button>
        </div>
      </div>

      {viewMode === "trail" ? (
        <RecordTrailView
          center={{ table, pk, label: recordLabel }}
          incoming={incoming}
          outgoing={outgoing}
          onOpen={(target, e) => {
            setSelection({ kind: "record", table: target.table, pk: target.pk });
            if (newTabIntent(e)) openRecord(target.table, target.pk, { newTab: true });
            else navigateActive({ kind: "record", table: target.table, pk: target.pk });
          }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-sm">Fields</CardTitle>
              <div className="text-xs text-muted-foreground">
                Primary key <span className="font-mono">{schema.primaryKey}</span> anchors traversal.
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              {schema.columns.map((c) => (
                <div key={c.name} className="grid grid-cols-[160px_1fr] gap-3 text-xs">
                  <div className="font-mono text-muted-foreground">{c.name}</div>
                  <pre className="whitespace-pre-wrap break-words font-mono">{stringify(row[c.name])}</pre>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <RelationshipSection
              title="Outgoing links"
              icon={<IconCornerUpRight className="size-4 text-muted-foreground" />}
              empty="No outgoing links from this record."
              items={outgoing}
              onOpen={(r, e) => {
                setSelection({ kind: "record", table: r.table, pk: r.pk });
                if (newTabIntent(e)) openRecord(r.table, r.pk, { newTab: true });
                else navigateActive({ kind: "record", table: r.table, pk: r.pk });
              }}
            />

            <RelationshipSection
              title="Incoming links"
              icon={<IconCornerDownLeft className="size-4 text-muted-foreground" />}
              empty="No other rows reference this record."
              items={incoming}
              onOpen={(r, e) => {
                setSelection({ kind: "record", table: r.table, pk: r.pk });
                if (newTabIntent(e)) openRecord(r.table, r.pk, { newTab: true });
                else navigateActive({ kind: "record", table: r.table, pk: r.pk });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RecordTrailView({
  center,
  incoming,
  outgoing,
  onOpen,
}: {
  center: { table: TableName; pk: unknown; label: string };
  incoming: Related[];
  outgoing: Related[];
  onOpen: (target: { table: TableName; pk: unknown }, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { domain } = useWorkspace();

  const left = incoming.slice(0, 8);
  const right = outgoing.slice(0, 8);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm">Record trail</CardTitle>
        <div className="text-xs text-muted-foreground">
          Incoming on the left, outgoing on the right. <span className="font-mono">⌘/Ctrl</span>-click branches.
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative grid gap-4 overflow-x-auto rounded-md border bg-gradient-to-b from-muted/20 to-background p-4 lg:grid-cols-[1fr_260px_1fr]">
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Incoming</div>
            {left.length === 0 ? (
              <div className="text-xs text-muted-foreground">No incoming links.</div>
            ) : (
              left.map((r) => {
                const schema = domain.tables[r.table];
                const targetRow = getRowByPk(domain, r.table, r.pk);
                const label = targetRow ? formatRowLabel(domain, r.table, targetRow) : `${r.table} (${String(r.pk)})`;
                return (
                  <button
                    key={`in:${r.table}:${String(r.pk)}:${r.via ?? ""}`}
                    type="button"
                    className="rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/60"
                    onClick={(e) => onOpen({ table: r.table, pk: r.pk }, e)}
                    title={r.via}
                  >
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
                      {schema.primaryKey}: {String(r.pk)}
                    </div>
                    {r.via ? (
                      <div className="mt-1 truncate font-mono text-[0.65rem] text-muted-foreground">
                        {r.via}
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-col items-stretch justify-center">
            <div className="rounded-lg border bg-background p-3 text-center">
              <div className="text-xs text-muted-foreground">Current</div>
              <div className="mt-1 truncate text-sm font-semibold">{center.label}</div>
              <div className="mt-1 truncate font-mono text-[0.7rem] text-muted-foreground">
                {center.table}: {String(center.pk)}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Outgoing</div>
            {right.length === 0 ? (
              <div className="text-xs text-muted-foreground">No outgoing links.</div>
            ) : (
              right.map((r) => {
                const schema = domain.tables[r.table];
                const targetRow = getRowByPk(domain, r.table, r.pk);
                const label = targetRow ? formatRowLabel(domain, r.table, targetRow) : `${r.table} (${String(r.pk)})`;
                return (
                  <button
                    key={`out:${r.table}:${String(r.pk)}:${r.via ?? ""}`}
                    type="button"
                    className="rounded-md border bg-background px-3 py-2 text-left hover:bg-muted/60"
                    onClick={(e) => onOpen({ table: r.table, pk: r.pk }, e)}
                    title={r.via}
                  >
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="mt-0.5 truncate font-mono text-[0.7rem] text-muted-foreground">
                      {schema.primaryKey}: {String(r.pk)}
                    </div>
                    {r.via ? (
                      <div className="mt-1 truncate font-mono text-[0.65rem] text-muted-foreground">
                        {r.via}
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {(incoming.length > left.length || outgoing.length > right.length) && (
            <div className="lg:col-span-3 text-xs text-muted-foreground">
              Showing the first {Math.max(left.length, right.length)} links per side. Use List view for the full set.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RelationshipSection({
  title,
  icon,
  empty,
  items,
  onOpen,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  items: Related[];
  onOpen: (r: Related, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { domain } = useWorkspace();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title} <span className="text-muted-foreground">· {items.length}</span>
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          <span className="font-mono">⌘/Ctrl</span> opens in new tab
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground">{empty}</div>
        ) : (
          items.map((r) => {
            const targetRow: Row | undefined = getRowByPk(domain, r.table, r.pk);
            const label = targetRow ? formatRowLabel(domain, r.table, targetRow) : `${r.table} (${String(r.pk)})`;
            return (
              <button
                key={`${title}:${r.table}:${String(r.pk)}:${r.via ?? ""}`}
                type="button"
                className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-left hover:bg-muted/60"
                onClick={(e) => onOpen(r, e)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{label}</div>
                  {r.via ? (
                    <div className="truncate font-mono text-[0.7rem] text-muted-foreground">{r.via}</div>
                  ) : null}
                </div>
                <IconArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })
        )}
        <Separator />
        <div className="text-xs text-muted-foreground">
          This is where Boson beats a generic DB client: links are first-class and traversal is the default.
        </div>
      </CardContent>
    </Card>
  );
}

