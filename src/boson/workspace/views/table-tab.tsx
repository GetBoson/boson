import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
  const { domain, openRecord, navigateActive, setSelection } = useWorkspace();
  const schema = domain.tables[table];
  const rows = domain.rows[table];
  const cols = schema.columns.map((c) => c.name);

  const outgoingFks = domain.foreignKeys.filter((f) => f.fromTable === table);
  const incomingFks = domain.foreignKeys.filter((f) => f.toTable === table);
  const fkColumns = new Set(outgoingFks.map((f) => f.fromColumn));
  const pkCol = schema.primaryKey;

  function isNewTabIntent(e: React.MouseEvent): boolean {
    return Boolean(e.metaKey || e.ctrlKey);
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Table</div>
              <div className="truncate font-mono text-base font-semibold tracking-tight">{table}</div>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <div className="font-mono">{rows.length}</div>
              <div>rows</div>
            </div>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary" className="font-mono">
              pk: {pkCol}
            </Badge>
            <Badge variant="outline" className="font-mono">
              outgoing: {outgoingFks.length}
            </Badge>
            <Badge variant="outline" className="font-mono">
              incoming: {incomingFks.length}
            </Badge>
            {fkColumns.size > 0 ? (
              <span className="text-muted-foreground">
                · linked columns: <span className="font-mono">{fkColumns.size}</span>
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            Click a row to follow the record trail. <span className="font-mono">⌘/Ctrl</span>-click opens a new tab.
          </div>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="rounded-md border">
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
                {rows.map((r) => {
                  const pk = r[schema.primaryKey];
                  return (
                    <TableRow
                      key={String(pk)}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={(e) => {
                        setSelection({ kind: "record", table, pk });
                        if (isNewTabIntent(e)) openRecord(table, pk, { newTab: true });
                        else navigateActive({ kind: "record", table, pk });
                      }}
                      onDoubleClick={() => openRecord(table, pk, { newTab: true })}
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

