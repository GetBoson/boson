import * as React from "react";
import { IconArrowUpRight } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
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

export function RecordTabView({ table, pk }: { table: TableName; pk: unknown }) {
  const { domain, openRecord, openTable, setSelection } = useWorkspace();
  const row = getRowByPk(domain, table, pk);
  const schema = domain.tables[table];

  const related: Related[] = React.useMemo(() => {
    if (!row) return [];
    const rel: Related[] = [];

    // Outgoing FKs from this table.
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

    // Incoming references to this record.
    for (const fk of domain.foreignKeys.filter((f) => f.toTable === table)) {
      const fromRows = domain.rows[fk.fromTable].filter((r) => r[fk.fromColumn] === pk);
      for (const r of fromRows) {
        const fromSchema = domain.tables[fk.fromTable];
        const fromPk = r[fromSchema.primaryKey];
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

  if (!row) {
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

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Record <span className="text-muted-foreground">· {table}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="text-sm font-medium">{formatRowLabel(domain, table, row)}</div>
          <div className="text-xs">
            <Badge variant="secondary" className="font-mono">
              {schema.primaryKey}
            </Badge>{" "}
            <span className="font-mono">{String(pk)}</span>
          </div>
          <Separator />

          <div className="grid gap-2">
            {schema.columns.map((c) => (
              <div key={c.name} className="grid grid-cols-[160px_1fr] gap-3 text-xs">
                <div className="font-mono text-muted-foreground">{c.name}</div>
                <pre className="whitespace-pre-wrap break-words font-mono">{stringify(row[c.name])}</pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">
            Related <span className="text-muted-foreground">· {related.length}</span>
          </CardTitle>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => openTable(table)}
          >
            Open table
          </button>
        </CardHeader>
        <CardContent className="grid gap-2">
          {related.length === 0 ? (
            <div className="text-xs text-muted-foreground">No related entities in this dummy dataset.</div>
          ) : (
            related.map((r) => {
              const targetRow: Row | undefined = getRowByPk(domain, r.table, r.pk);
              const label = targetRow ? formatRowLabel(domain, r.table, targetRow) : `${r.table} (${String(r.pk)})`;
              return (
                <button
                  key={`${r.table}:${String(r.pk)}:${r.via ?? ""}`}
                  type="button"
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-left hover:bg-muted/60"
                  onClick={() => {
                    setSelection({ kind: "record", table: r.table, pk: r.pk });
                    openRecord(r.table, r.pk);
                  }}
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
        </CardContent>
      </Card>
    </div>
  );
}

