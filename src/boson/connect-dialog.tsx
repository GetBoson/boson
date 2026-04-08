"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/boson/workspace/workspace-context";

export function ConnectDialog() {
  const {
    connectDialogOpen,
    setConnectDialogOpen,
    domain,
    connection,
    connectPostgres,
    disconnect,
    switchSchema,
    refreshSchema,
    recentConnections,
  } = useWorkspace();
  const [connStr, setConnStr] = React.useState("");
  const [schema, setSchema] = React.useState("public");
  const [error, setError] = React.useState<string | null>(null);
  const didPrefillThisOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (!connectDialogOpen) {
      setError(null);
      didPrefillThisOpenRef.current = false;
      return;
    }
    if (didPrefillThisOpenRef.current) return;
    didPrefillThisOpenRef.current = true;

    // Prefill once per open. Do not clobber user edits while the dialog stays open.
    if (connection.status === "connected" || connection.status === "refreshing") {
      setConnStr(connection.connStr);
      setSchema(connection.schema);
      return;
    }
    const last = recentConnections[0];
    if (last) {
      setConnStr(last.connStr);
      setSchema(last.schema);
    }
  }, [connectDialogOpen, connection, recentConnections]);

  const statusLine =
    connection.status === "demo"
      ? "Demo data"
      : connection.status === "connecting"
        ? "Connecting…"
        : connection.status === "refreshing"
          ? "Refreshing schema…"
          : connection.status === "connected"
            ? "Connected"
            : "Error";

  return (
    <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect to Postgres</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-muted-foreground">Status</div>
              <div className="font-mono">{statusLine}</div>
            </div>
            <div className="mt-1 text-muted-foreground">Mode</div>
            <div className="font-mono">Read only</div>
            {(connection.status === "connected" || connection.status === "refreshing") && (
              <div className="mt-2">
                <div className="text-muted-foreground">Database</div>
                <div className="font-mono">{connection.database}</div>
                <div className="mt-1 text-muted-foreground">Schema</div>
                <div className="font-mono">{connection.schema}</div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-muted-foreground">Tables</div>
                    <div className="font-mono">{Object.keys(domain.tables).length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">FKs</div>
                    <div className="font-mono">{domain.foreignKeys.length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Unsupported</div>
                    <div className="font-mono">
                      {Object.values(domain.tables).filter((t) => !t.primaryKey).length}
                    </div>
                  </div>
                </div>
                {connection.lastError ? (
                  <div className="mt-2 text-destructive">Last error: {connection.lastError}</div>
                ) : null}
              </div>
            )}
            {connection.status === "error" ? (
              <div className="mt-2 text-destructive">Last error: {connection.message}</div>
            ) : null}
          </div>
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                const isConn = connection.status === "connected" || connection.status === "refreshing";
                const db = isConn ? connection.database : null;
                const sch = isConn ? connection.schema : null;
                const lastErr =
                  connection.status === "error"
                    ? connection.message
                    : isConn
                      ? (connection.lastError ?? null)
                      : null;

                const text = [
                  `Boson diagnostics`,
                  `status=${connection.status}`,
                  `read_only=true`,
                  db ? `database=${db}` : null,
                  sch ? `schema=${sch}` : null,
                  `tables=${Object.keys(domain.tables).length}`,
                  `foreign_keys=${domain.foreignKeys.length}`,
                  `unsupported_tables=${Object.values(domain.tables).filter((t) => !t.primaryKey).length}`,
                  lastErr ? `last_error=${lastErr}` : null,
                ]
                  .filter(Boolean)
                  .join("\n");

                try {
                  await navigator.clipboard.writeText(text);
                } catch {
                  window.prompt("Copy diagnostics", text);
                }
              }}
              title="Copy connection diagnostics"
            >
              Copy diagnostics
            </Button>
          </div>

          {recentConnections.length ? (
            <div className="grid gap-1">
              <div className="text-xs text-muted-foreground">Recent (this session)</div>
              <div className="flex flex-wrap gap-2">
                {recentConnections.slice(0, 6).map((c) => (
                  <Button
                    key={`${c.connStr}::${c.schema}`}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="max-w-full"
                    onClick={() => {
                      setConnStr(c.connStr);
                      setSchema(c.schema);
                      setError(null);
                    }}
                    title={c.connStr}
                  >
                    <span className="truncate font-mono">
                      {c.database ? c.database : "db"} ({c.schema})
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Connection string</div>
            <Input
              value={connStr}
              onChange={(e) => setConnStr(e.currentTarget.value)}
              placeholder="postgresql://user:pass@host:5432/db"
              className="font-mono text-xs"
              autoFocus
            />
          </div>
          <div className="grid gap-1">
            <div className="text-xs text-muted-foreground">Schema</div>
            <Input value={schema} onChange={(e) => setSchema(e.currentTarget.value)} className="font-mono text-xs" />
          </div>

          {error ? <div className="text-xs text-destructive">{error}</div> : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            {connection.status === "connected" || connection.status === "refreshing" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={connection.status === "refreshing"}
                  onClick={async () => {
                    await refreshSchema();
                  }}
                  title="Re-run schema introspection"
                >
                  Refresh schema
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={connection.status === "refreshing"}
                  onClick={async () => {
                    const next = schema.trim() || "public";
                    await switchSchema(next);
                  }}
                  title="Switch schema without changing the connection string"
                >
                  Switch schema
                </Button>
              </>
            ) : null}
            {connection.status === "connected" || connection.status === "refreshing" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  disconnect();
                  setConnectDialogOpen(false);
                }}
              >
                Disconnect
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={connection.status === "connecting" || connection.status === "refreshing"}
              onClick={async () => {
                const v = connStr.trim();
                if (!v) {
                  setError("Enter a connection string.");
                  return;
                }
                const ok = await connectPostgres(v, schema.trim() || "public");
                if (ok) setConnectDialogOpen(false);
              }}
            >
              {connection.status === "connecting" ? "Connecting…" : "Connect"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

