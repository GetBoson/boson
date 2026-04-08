import * as React from "react";
import { IconArrowRight, IconGraph, IconSearch } from "@tabler/icons-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";

export function SchemaTabView() {
  const { domain, openTable, setSelection } = useWorkspace();
  const tables = Object.values(domain.tables);
  const [query, setQuery] = React.useState("");
  const [focusTable, setFocusTable] = React.useState<TableName | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => {
      if (t.name.includes(q)) return true;
      if (t.columns.some((c) => c.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [query, tables]);

  const allEdges = domain.foreignKeys.map((fk) => ({
    id: fk.name,
    from: `${fk.fromTable}.${fk.fromColumn}`,
    to: `${fk.toTable}.${fk.toColumn}`,
  }));

  const edges = focusTable
    ? domain.foreignKeys
        .filter((fk) => fk.fromTable === focusTable || fk.toTable === focusTable)
        .map((fk) => ({
          id: fk.name,
          from: `${fk.fromTable}.${fk.fromColumn}`,
          to: `${fk.toTable}.${fk.toColumn}`,
        }))
    : allEdges;

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Schema</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconGraph className="size-4" />
            Connected data, at a glance
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {focusTable ? (
                <>
                  Focus: <span className="font-mono">{focusTable}</span>
                </>
              ) : (
                <>Click a table to focus its neighbors.</>
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
            onFocusTable={setFocusTable}
            onOpenTable={(t) => {
              setSelection({ kind: "table", table: t });
              openTable(t);
            }}
          />
          <div className="mt-2 text-xs text-muted-foreground">
            Tip: click to focus. Double-click to open.
          </div>
        </CardContent>
      </Card>

      <Card>
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
              }}
            >
              Clear
            </Button>
          </div>

          {filtered.map((t) => (
            <button
              key={t.name}
              type="button"
              className="flex items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/60"
              onClick={() => {
                setFocusTable(t.name);
              }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.columns.length} columns · pk <span className="font-mono">{t.primaryKey}</span>
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Relationships</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconGraph className="size-4" />
            {focusTable ? <span className="font-mono">{focusTable}</span> : <span>All tables</span>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {edges.map((e) => (
            <div key={e.id} className="rounded-md border px-3 py-2 text-xs">
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
  onFocusTable,
  onOpenTable,
}: {
  focusTable: TableName | null;
  onFocusTable: (t: TableName | null) => void;
  onOpenTable: (t: TableName) => void;
}) {
  const { domain } = useWorkspace();

  // Grouped map: makes the schema feel like *this* dataset.
  const nodes: Node[] = [
    { table: "organizations", x: 190, y: 85 },
    { table: "memberships", x: 190, y: 170 },
    { table: "users", x: 190, y: 255 },
    { table: "subscriptions", x: 520, y: 125 },
    { table: "invoices", x: 520, y: 230 },
    { table: "events", x: 820, y: 178 },
  ];

  const width = 980;
  const height = 320;
  const pos = new Map<TableName, { x: number; y: number }>(nodes.map((n) => [n.table, { x: n.x, y: n.y }]));

  const neighbors = React.useMemo(() => {
    if (!focusTable) return new Set<TableName>();
    const set = new Set<TableName>([focusTable]);
    for (const fk of domain.foreignKeys) {
      if (fk.fromTable === focusTable) set.add(fk.toTable);
      if (fk.toTable === focusTable) set.add(fk.fromTable);
    }
    return set;
  }, [domain.foreignKeys, focusTable]);

  const isDimmed = (t: TableName) => focusTable != null && !neighbors.has(t);
  const isEdgeDimmed = (a: TableName, b: TableName) => focusTable != null && !(neighbors.has(a) && neighbors.has(b));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[980px] rounded-md border bg-gradient-to-b from-muted/30 to-background"
      >
        <GroupFrame title="Core" x={55} y={35} w={270} h={255} />
        <GroupFrame title="Billing" x={385} y={70} w={270} h={210} />
        <GroupFrame title="Activity" x={705} y={105} w={240} h={150} />

        {domain.foreignKeys.map((fk) => {
          const a = pos.get(fk.fromTable);
          const b = pos.get(fk.toTable);
          if (!a || !b) return null;
          return (
            <path
              key={fk.name}
              d={`M ${a.x + 80} ${a.y} C ${a.x + 180} ${a.y} ${b.x - 180} ${b.y} ${b.x - 80} ${b.y}`}
              stroke="currentColor"
              strokeOpacity={isEdgeDimmed(fk.fromTable, fk.toTable) ? 0.12 : 0.28}
              strokeWidth={2}
              fill="none"
            />
          );
        })}

        {nodes.map((n) => (
          <TableNode
            key={n.table}
            table={n.table}
            x={n.x}
            y={n.y}
            dimmed={isDimmed(n.table)}
            focused={focusTable === n.table}
            onClick={() => {
              const next = focusTable === n.table ? null : n.table;
              onFocusTable(next);
            }}
            onDoubleClick={() => onOpenTable(n.table)}
          />
        ))}
      </svg>
    </div>
  );
}

function GroupFrame({ title, x, y, w, h }: { title: string; x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} className="fill-transparent stroke-border" />
      <text x={x + 12} y={y + 22} className="select-none fill-muted-foreground text-[11px] font-medium">
        {title}
      </text>
    </g>
  );
}

function TableNode({
  table,
  x,
  y,
  dimmed,
  focused,
  onClick,
  onDoubleClick,
}: {
  table: TableName;
  x: number;
  y: number;
  dimmed: boolean;
  focused: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: "pointer", opacity: dimmed ? 0.45 : 1 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <rect
        x={-85}
        y={-18}
        width={170}
        height={36}
        rx={11}
        className={focused ? "fill-background stroke-foreground" : "fill-background stroke-border"}
      />
      <text x={0} y={5} textAnchor="middle" className="select-none fill-foreground text-[12px] font-medium">
        {table}
      </text>
    </g>
  );
}

