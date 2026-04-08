import * as React from "react";
import { IconArrowRight, IconGraph, IconSearch } from "@tabler/icons-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import { StatusCallout } from "@/boson/status-callout";
import type { TableName } from "@/boson/fake-domain";

export function SchemaTabView() {
  const { domain, openTable, setSelection, connection } = useWorkspace();
  const tables = Object.values(domain.tables);
  const unsupportedCount = React.useMemo(() => tables.filter((t) => !t.primaryKey).length, [tables]);
  const [query, setQuery] = React.useState("");
  const [unsupportedOnly, setUnsupportedOnly] = React.useState(false);
  const [focusTable, setFocusTable] = React.useState<TableName | null>(null);
  const [hoverTable, setHoverTable] = React.useState<TableName | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return tables.filter((t) => {
      if (unsupportedOnly && t.primaryKey) return false;
      if (!q) return true;
      if (t.name.includes(q)) return true;
      if (t.columns.some((c) => c.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [query, tables, unsupportedOnly]);

  const allEdges = domain.foreignKeys.map((fk) => ({
    id: fk.name,
    from: `${fk.fromTable}.${fk.fromColumn}`,
    to: `${fk.toTable}.${fk.toColumn}`,
  }));

  const activeTable = hoverTable ?? focusTable;

  const edges = activeTable
    ? domain.foreignKeys
        .filter((fk) => fk.fromTable === activeTable || fk.toTable === activeTable)
        .map((fk) => ({
          id: fk.name,
          from: `${fk.fromTable}.${fk.fromColumn}`,
          to: `${fk.toTable}.${fk.toColumn}`,
        }))
    : allEdges;

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="lg:col-span-2 bg-data/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Schema</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <IconGraph className="size-4" />
            {connection.status === "connecting"
              ? "Connecting…"
              : connection.status === "error"
                ? "Connection error"
                : connection.status === "refreshing"
                  ? "Refreshing schema…"
                  : "Connected data, at a glance"}
            <span className="mx-1 h-3 w-px bg-border" />
            <span>
              <span className="font-mono">{tables.length}</span> tables
            </span>
            <span>
              <span className="font-mono">{domain.foreignKeys.length}</span> fks
            </span>
            {unsupportedCount > 0 ? (
              <span className="text-destructive">
                <span className="font-mono">{unsupportedCount}</span> unsupported
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {connection.status === "error" ? (
            <StatusCallout tone="error" title="Connection error" className="mb-3">
              {connection.message}
            </StatusCallout>
          ) : null}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {activeTable ? (
                <>
                  {hoverTable ? (
                    <>
                      Hover: <span className="font-mono">{hoverTable}</span>
                    </>
                  ) : (
                    <>
                      Focus: <span className="font-mono">{focusTable}</span>
                    </>
                  )}
                </>
              ) : (
                <>Hover to preview connections. Click to pin focus.</>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!focusTable}
                onClick={() => {
                  if (!focusTable) return;
                  setSelection({ kind: "table", table: focusTable });
                  openTable(focusTable);
                }}
              >
                Open focused table
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!focusTable}
                onClick={() => setFocusTable(null)}
              >
                Clear focus
              </Button>
            </div>
          </div>
          <SchemaHeroCanvas
            focusTable={focusTable}
            hoverTable={hoverTable}
            onHoverTable={setHoverTable}
            onFocusTable={setFocusTable}
            onOpenTable={(t) => {
              setSelection({ kind: "table", table: t });
              openTable(t);
            }}
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Tip: hover previews. Click pins focus. Double-click opens a table.
          </div>
        </CardContent>
      </Card>

      <Card className="bg-workspace/20">
        <CardHeader>
          <CardTitle className="text-sm">Tables</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Filter tables or columns…"
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFocusTable(null);
                setQuery("");
                setUnsupportedOnly(false);
              }}
            >
              Clear
            </Button>
          </div>
          {unsupportedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Button
                type="button"
                size="sm"
                variant={unsupportedOnly ? "secondary" : "outline"}
                onClick={() => setUnsupportedOnly((v) => !v)}
              >
                Unsupported only <span className="ml-2 font-mono">{unsupportedCount}</span>
              </Button>
              <span className="text-xs text-muted-foreground">Tables without a single-column PK are limited in v1.</span>
            </div>
          ) : null}

          {filtered.map((t) => (
            <button
              key={t.name}
              type="button"
              className={[
                "flex items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/50",
                focusTable === t.name ? "bg-selected/30 ring-1 ring-border" : "bg-background/20",
              ].join(" ")}
              onClick={() => {
                setFocusTable(t.name);
              }}
              onMouseEnter={() => setHoverTable(t.name)}
              onMouseLeave={() => setHoverTable(null)}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.columns.length} columns ·{" "}
                  {t.primaryKey ? (
                    <>
                      pk <span className="font-mono">{t.primaryKey}</span>
                    </>
                  ) : (
                    <span className="text-destructive">no supported PK</span>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelection({ kind: "table", table: t.name });
                    openTable(t.name);
                  }}
                >
                  Open
                </Button>
                <IconArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </span>
            </button>
          ))}

          <Separator />
          <div className="text-xs text-muted-foreground">
            Click a table to focus connections, then open it when you’re ready.
          </div>
        </CardContent>
      </Card>

      <Card className="bg-workspace/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Relationships</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconGraph className="size-4" />
            {activeTable ? <span className="font-mono">{activeTable}</span> : <span>All tables</span>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {edges.map((e) => (
            <div key={e.id} className="rounded-md border bg-background/20 px-3 py-2 text-xs">
              <div className="font-mono">{e.from}</div>
              <div className="text-muted-foreground">→</div>
              <div className="font-mono">{e.to}</div>
            </div>
          ))}
          <Separator />
          <div className="text-xs text-muted-foreground">
            These relationships are what power table → record → related record traversal.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OpenTableButton({ table }: { table: TableName }) {
  const { openTable } = useWorkspace();
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => openTable(table)}>
      Open table
    </Button>
  );
}

type Node = { table: TableName; x: number; y: number };

function SchemaHeroCanvas({
  focusTable,
  hoverTable,
  onHoverTable,
  onFocusTable,
  onOpenTable,
}: {
  focusTable: TableName | null;
  hoverTable: TableName | null;
  onHoverTable: (t: TableName | null) => void;
  onFocusTable: (t: TableName | null) => void;
  onOpenTable: (t: TableName) => void;
}) {
  const { domain } = useWorkspace();

  const tableNames = React.useMemo(
    () => Object.keys(domain.tables).sort((a, b) => a.localeCompare(b)),
    [domain.tables],
  );

  // Dynamic layout (v1): grid layout that scales with table count.
  // Keeps the schema canvas usable for real Postgres schemas without hardcoding demo tables.
  const width = 980;
  const padding = 70;
  const colGap = 220;
  const rowGap = 74;
  const cols = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(Math.max(1, tableNames.length)))));
  const rows = Math.ceil(tableNames.length / cols);
  const height = Math.max(320, padding * 2 + (rows - 1) * rowGap + 60);

  const nodes: Node[] = tableNames.map((t, i) => {
    const cx = i % cols;
    const cy = Math.floor(i / cols);
    return {
      table: t,
      x: padding + cx * colGap,
      y: padding + cy * rowGap,
    };
  });

  const pos = new Map<TableName, { x: number; y: number }>(
    nodes.map((n) => [n.table, { x: n.x, y: n.y }]),
  );

  const schemas = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of tableNames) {
      const s = t.includes(".") ? t.split(".", 1)[0] : "public";
      set.add(s);
    }
    return Array.from(set).sort();
  }, [tableNames]);

  const active = hoverTable ?? focusTable;
  const neighbors = React.useMemo(() => {
    if (!active) return new Set<TableName>();
    const set = new Set<TableName>([active]);
    for (const fk of domain.foreignKeys) {
      if (fk.fromTable === active) set.add(fk.toTable);
      if (fk.toTable === active) set.add(fk.fromTable);
    }
    return set;
  }, [domain.foreignKeys, active]);

  const isDimmed = (t: TableName) => active != null && !neighbors.has(t);
  const isEdgeDimmed = (a: TableName, b: TableName) => active != null && !(neighbors.has(a) && neighbors.has(b));
  const isEdgeActive = (a: TableName, b: TableName) => active != null && neighbors.has(a) && neighbors.has(b);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[980px] rounded-md border bg-data/40 shadow-sm"
      >
        {/* Schema group hints (best-effort) */}
        {schemas.length > 1 ? (
          <text x={12} y={20} className="select-none fill-muted-foreground text-[11px]">
            Schemas: {schemas.join(", ")}
          </text>
        ) : null}

        {domain.foreignKeys.map((fk) => {
          const a = pos.get(fk.fromTable);
          const b = pos.get(fk.toTable);
          if (!a || !b) return null;
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const label = `${fk.fromColumn}→${fk.toColumn}`;
          return (
            <g key={fk.name}>
              <path
                d={`M ${a.x + 90} ${a.y} C ${a.x + 170} ${a.y} ${b.x - 170} ${b.y} ${b.x - 90} ${b.y}`}
                stroke="currentColor"
                strokeOpacity={isEdgeDimmed(fk.fromTable, fk.toTable) ? 0.10 : isEdgeActive(fk.fromTable, fk.toTable) ? 0.40 : 0.22}
                strokeWidth={isEdgeActive(fk.fromTable, fk.toTable) ? 2.5 : 2}
                fill="none"
              />
              {isEdgeActive(fk.fromTable, fk.toTable) ? (
                <text
                  x={midX}
                  y={midY - 6}
                  textAnchor="middle"
                  className="select-none fill-muted-foreground text-[10px]"
                >
                  {label}
                </text>
              ) : null}
            </g>
          );
        })}

        {nodes.map((n) => (
          <TableNode
            key={n.table}
            table={n.table}
            x={n.x}
            y={n.y}
            dimmed={isDimmed(n.table)}
            focused={active === n.table}
            pinned={focusTable === n.table}
            onClick={() => {
              const next = focusTable === n.table ? null : n.table;
              onFocusTable(next);
            }}
            onDoubleClick={() => onOpenTable(n.table)}
            onHover={(v) => onHoverTable(v ? n.table : null)}
          />
        ))}
      </svg>
    </div>
  );
}

function TableNode({
  table,
  x,
  y,
  dimmed,
  focused,
  pinned,
  onClick,
  onDoubleClick,
  onHover,
}: {
  table: TableName;
  x: number;
  y: number;
  dimmed: boolean;
  focused: boolean;
  pinned: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onHover: (hovered: boolean) => void;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: "pointer", opacity: dimmed ? 0.45 : 1 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <rect
        x={-85}
        y={-18}
        width={170}
        height={36}
        rx={11}
        className={
          pinned
            ? "fill-background stroke-primary"
            : focused
              ? "fill-background stroke-foreground/60"
              : "fill-background stroke-border"
        }
      />
      <text x={0} y={5} textAnchor="middle" className="select-none fill-foreground text-[12px] font-medium">
        {table}
      </text>
    </g>
  );
}

