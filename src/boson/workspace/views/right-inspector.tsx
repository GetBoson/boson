import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import { formatRowLabel, getRowByPk } from "@/boson/fake-domain";
import type { TableName } from "@/boson/fake-domain";

export function RightInspector() {
  const { selection, domain, openTable, openRecord, navigateActive, openSchema, setSelection } =
    useWorkspace();

  return (
    <div className="hidden h-full w-[340px] shrink-0 flex-col bg-background md:flex">
      <div className="border-b px-3 py-2 text-xs text-muted-foreground">Inspector</div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {selection.kind === "none" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Nothing selected</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Click a table, row, or related entity to see details here.
            </CardContent>
          </Card>
        ) : null}

        {selection.kind === "table" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{selection.table}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs">
              <div className="text-muted-foreground">Relationships</div>
              <Separator />
              <div className="flex items-center justify-between font-mono">
                <span>outgoing</span>
                <span className="text-muted-foreground">
                  {domain.foreignKeys.filter((f) => f.fromTable === selection.table).length}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>incoming</span>
                <span className="text-muted-foreground">
                  {domain.foreignKeys.filter((f) => f.toTable === selection.table).length}
                </span>
              </div>
              <Separator />
              <div className="text-muted-foreground">Linked tables</div>
              <Separator />
              {(() => {
                const out = domain.foreignKeys
                  .filter((f) => f.fromTable === selection.table)
                  .map((f) => f.toTable);
                const inc = domain.foreignKeys
                  .filter((f) => f.toTable === selection.table)
                  .map((f) => f.fromTable);
                const uniq = Array.from(new Set<TableName>([...out, ...inc] as TableName[]));
                if (uniq.length === 0) {
                  return <div className="text-xs text-muted-foreground">No linked tables.</div>;
                }
                return (
                  <div className="grid gap-1">
                    {uniq.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="text-left font-mono text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => openTable(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <Separator />
              <div className="text-muted-foreground">Columns</div>
              <Separator />
              {domain.tables[selection.table].columns.map((c) => (
                <div key={c.name} className="flex items-center justify-between font-mono">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.type}</span>
                </div>
              ))}
              <Separator />
              <button
                type="button"
                className="text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => openTable(selection.table)}
              >
                Open table tab
              </button>
              <button
                type="button"
                className="text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelection({ kind: "none" });
                  openSchema();
                }}
              >
                Open schema
              </button>
            </CardContent>
          </Card>
        ) : null}

        {selection.kind === "record" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Record</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs">
              <div className="text-muted-foreground">{selection.table}</div>
              <Separator />
              {(() => {
                const row = getRowByPk(domain, selection.table, selection.pk);
                const outgoing = domain.foreignKeys.filter((f) => f.fromTable === selection.table);
                const incoming = domain.foreignKeys.filter((f) => f.toTable === selection.table);
                return (
                  <div>
                    <div className="text-sm font-medium">
                      {row ? formatRowLabel(domain, selection.table, row) : String(selection.pk)}
                    </div>
                    <div className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
                      {domain.tables[selection.table].primaryKey}: {String(selection.pk)}
                    </div>
                    <div className="mt-2 grid gap-1 font-mono text-[0.7rem] text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>outgoing_fks</span>
                        <span>{outgoing.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>incoming_fks</span>
                        <span>{incoming.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <Separator />
              <button
                type="button"
                className="text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => openRecord(selection.table, selection.pk)}
              >
                Open record tab
              </button>
              <button
                type="button"
                className="text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigateActive({ kind: "table", table: selection.table })}
              >
                Jump to table (same tab)
              </button>
              <button
                type="button"
                className="text-left text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSelection({ kind: "none" });
                  openSchema();
                }}
              >
                Open schema
              </button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

