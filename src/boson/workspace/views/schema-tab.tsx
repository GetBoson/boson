import { IconArrowRight, IconGraph } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";

export function SchemaTabView() {
  const { domain, openTable, setSelection } = useWorkspace();
  const tables = Object.values(domain.tables);

  const edges = domain.foreignKeys.map((fk) => ({
    id: fk.name,
    from: `${fk.fromTable}.${fk.fromColumn}`,
    to: `${fk.toTable}.${fk.toColumn}`,
  }));

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Schema graph</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconGraph className="size-4" />
            Click a table to open it
          </div>
        </CardHeader>
        <CardContent>
          <SchemaHeroGraph
            onOpenTable={(t) => {
              setSelection({ kind: "table", table: t });
              openTable(t);
            }}
          />
          <div className="mt-2 text-xs text-muted-foreground">
            This is a v1 “hero” placeholder that already supports traversal. Next step is nicer layout + hover/selection.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tables</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {tables.map((t) => (
            <button
              key={t.name}
              type="button"
              className="flex items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted/60"
              onClick={() => {
                setSelection({ kind: "table", table: t.name });
                openTable(t.name);
              }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {t.columns.length} columns · pk {t.primaryKey}
                </div>
              </div>
              <IconArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
          <Separator />
          <div className="text-xs text-muted-foreground">
            Tip: hold <span className="font-mono">⌘</span> (or <span className="font-mono">Ctrl</span>) in
            v2 for “open in new tab”.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Relationships</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconGraph className="size-4" />
            Graph view (v1 placeholder)
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
            Next: render this as an interactive schema graph with selection + opening tables/records.
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

function SchemaHeroGraph({ onOpenTable }: { onOpenTable: (t: TableName) => void }) {
  const { domain } = useWorkspace();
  const tableNames = Object.keys(domain.tables) as TableName[];
  const fk = domain.foreignKeys;

  // Simple deterministic layout: nodes on two rows, ordered.
  const width = 980;
  const height = 240;
  const paddingX = 80;
  const rowY = [70, 170];
  const top = tableNames.slice(0, Math.ceil(tableNames.length / 2));
  const bottom = tableNames.slice(Math.ceil(tableNames.length / 2));

  const pos = new Map<TableName, { x: number; y: number }>();
  const layoutRow = (names: TableName[], y: number) => {
    const step = names.length > 1 ? (width - paddingX * 2) / (names.length - 1) : 0;
    names.forEach((t, i) => pos.set(t, { x: paddingX + step * i, y }));
  };
  layoutRow(top, rowY[0]);
  layoutRow(bottom, rowY[1]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[980px] rounded-md border bg-muted/20"
      >
        {/* edges */}
        {fk.map((e) => {
          const a = pos.get(e.fromTable);
          const b = pos.get(e.toTable);
          if (!a || !b) return null;
          return (
            <g key={e.name}>
              <path
                d={`M ${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`}
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="2"
                fill="none"
              />
            </g>
          );
        })}

        {/* nodes */}
        {tableNames.map((t) => {
          const p = pos.get(t);
          if (!p) return null;
          return (
            <g key={t} transform={`translate(${p.x}, ${p.y})`}>
              <rect
                x={-70}
                y={-18}
                width={140}
                height={36}
                rx={10}
                className="fill-background stroke-border"
              />
              <text
                x={0}
                y={5}
                textAnchor="middle"
                className="select-none fill-foreground text-[12px] font-medium"
              >
                {t}
              </text>
              <rect
                x={-70}
                y={-18}
                width={140}
                height={36}
                rx={10}
                className="fill-transparent"
                onClick={() => onOpenTable(t)}
                style={{ cursor: "pointer" }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

