import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";

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
  const { domain, openRecord, setSelection } = useWorkspace();
  const schema = domain.tables[table];
  const rows = domain.rows[table];
  const cols = schema.columns.map((c) => c.name);

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-mono">{table}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{rows.length} rows</span>
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            Primary key: <span className="font-mono">{schema.primaryKey}</span>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {cols.map((c) => (
                    <TableHead key={c} className="font-mono text-[0.7rem]">
                      {c}
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
                      onClick={() => {
                        setSelection({ kind: "record", table, pk });
                        openRecord(table, pk);
                      }}
                    >
                      {cols.map((c) => (
                        <TableCell key={c} className="max-w-[280px] truncate font-mono text-xs">
                          {previewCell(r[c])}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Click a row to open a <span className="font-mono">Record</span> tab. Use tabs to keep your place.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

