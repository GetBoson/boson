import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import { formatRowLabel, getRowByPk } from "@/boson/fake-domain";
import type { TableName } from "@/boson/fake-domain";

export function RightInspector() {
  const { selection, domain, openTable, openRecord, navigateActive, openSchema, setSelection } =
    useWorkspace();

  return (
    <div className="hidden h-full w-[360px] shrink-0 flex-col bg-workspace/30 md:flex">
      <div className="border-b bg-sidebar/40 px-3 py-2">
        <div className="text-xs text-muted-foreground">Inspector</div>
        <div className="mt-0.5 truncate text-sm font-semibold">
          {selection.kind === "none"
            ? "Nothing selected"
            : selection.kind === "table"
              ? selection.table
              : "Record"}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {selection.kind === "none" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Select something to inspect</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Select a table or record to see relationships and quick actions.
            </CardContent>
          </Card>
        ) : null}

        {selection.kind === "table" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{selection.table}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs">
              <div className="rounded-md border bg-data/30 p-2">
                <div className="text-[0.7rem] text-muted-foreground">Relationship metrics</div>
                <Separator className="my-2" />
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
              </div>

              {(() => {
                const out = domain.foreignKeys
                  .filter((f) => f.fromTable === selection.table)
                  .map((f) => f.toTable);
                const inc = domain.foreignKeys
                  .filter((f) => f.toTable === selection.table)
                  .map((f) => f.fromTable);
                const uniq = Array.from(new Set<TableName>([...out, ...inc] as TableName[]));
                return (
                  <div className="rounded-md border bg-data/30 p-2">
                    <div className="text-[0.7rem] text-muted-foreground">Linked tables</div>
                    <Separator className="my-2" />
                    {uniq.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No linked tables.</div>
                    ) : (
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
                    )}
                  </div>
                );
              })()}
              <div className="rounded-md border bg-data/30 p-2">
                <div className="text-[0.7rem] text-muted-foreground">Columns</div>
                <Separator className="my-2" />
                {domain.tables[selection.table].columns.map((c) => (
                  <div key={c.name} className="flex items-center justify-between font-mono">
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">{c.type}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-md border bg-data/30 p-2">
                <div className="text-[0.7rem] text-muted-foreground">Actions</div>
                <Separator className="my-2" />
                <button
                  type="button"
                  className="text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => openTable(selection.table)}
                >
                  Open table tab
                </button>
                <button
                  type="button"
                  className="mt-1 text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSelection({ kind: "none" });
                    openSchema();
                  }}
                >
                  Open schema
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {selection.kind === "record" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Record</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-xs">
              {(() => {
                const row = getRowByPk(domain, selection.table, selection.pk);
                const outgoing = domain.foreignKeys.filter((f) => f.fromTable === selection.table);
                const incoming = domain.foreignKeys.filter((f) => f.toTable === selection.table);
                const pkCol = domain.tables[selection.table]?.primaryKey ?? null;
                return (
                  <div>
                    <div className="rounded-md border bg-selected/30 p-2 shadow-xs ring-1 ring-border">
                      <div className="text-[0.7rem] text-muted-foreground">Selected record</div>
                      <Separator className="my-2" />
                      <div className="text-sm font-medium">
                        {row ? formatRowLabel(domain, selection.table, row) : String(selection.pk)}
                      </div>
                      <div className="mt-0.5 text-[0.7rem] text-muted-foreground">
                        <span className="font-mono">{selection.table}</span>
                      </div>
                      {pkCol ? (
                        <div className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
                          {pkCol}: {String(selection.pk)}
                        </div>
                      ) : (
                        <div className="mt-1 text-[0.7rem] text-destructive">No supported PK (v1 limitation)</div>
                      )}
                    </div>

                    <div className="mt-2 rounded-md border bg-data/30 p-2">
                      <div className="text-[0.7rem] text-muted-foreground">Relationship metrics</div>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between font-mono text-[0.7rem] text-muted-foreground">
                        <span>outgoing_fks</span>
                        <span>{outgoing.length}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[0.7rem] text-muted-foreground">
                        <span>incoming_fks</span>
                        <span>{incoming.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="rounded-md border bg-data/30 p-2">
                <div className="text-[0.7rem] text-muted-foreground">Actions</div>
                <Separator className="my-2" />
                <button
                  type="button"
                  className="text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => openRecord(selection.table, selection.pk)}
                >
                  Open record tab
                </button>
                <button
                  type="button"
                  className="mt-1 text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigateActive({ kind: "table", table: selection.table })}
                >
                  Jump to table (same tab)
                </button>
                <button
                  type="button"
                  className="mt-1 text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSelection({ kind: "none" });
                    openSchema();
                  }}
                >
                  Open schema
                </button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

