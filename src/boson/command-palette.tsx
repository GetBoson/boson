"use client";

import * as React from "react";
import {
  IconDatabase,
  IconFileText,
  IconLayoutDashboard,
  IconLayoutSidebarRight,
  IconPlugConnected,
  IconTable,
  IconClock,
  IconX,
} from "@tabler/icons-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { formatRowLabel, type TableName } from "@/boson/fake-domain";
import { useWorkspace } from "@/boson/workspace/workspace-context";

type RecordHit = {
  table: TableName;
  pk: unknown;
  label: string;
};

export function CommandPalette() {
  const {
    domain,
    tabs,
    activeTabId,
    setActiveTabId,
    closeTab,
    openSchema,
    openTable,
    openRecord,
    toggleInspector,
    setSelection,
    recents,
    connection,
    openConnectDialog,
    disconnect,
    commandPaletteOpen,
    setCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
  } = useWorkspace();

  const openInNewTabRef = React.useRef(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (e.key === "Escape") closeCommandPalette();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeCommandPalette, openCommandPalette]);

  const recordHits: RecordHit[] = React.useMemo(() => {
    const hits: RecordHit[] = [];
    for (const table of Object.keys(domain.tables) as TableName[]) {
      const schema = domain.tables[table];
      if (!schema.primaryKey) continue;
      for (const row of domain.rows[table]) {
        const pk = row[schema.primaryKey];
        hits.push({
          table,
          pk,
          label: formatRowLabel(domain, table, row),
        });
      }
    }
    return hits;
  }, [domain]);

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      title="Search"
      description="Jump to tables, records, and tabs."
    >
      <Command
        onKeyDown={(e) => {
          // When selecting with keyboard, allow holding ⌘/Ctrl to branch.
          openInNewTabRef.current = Boolean(e.metaKey || e.ctrlKey);
        }}
        onKeyUp={(e) => {
          openInNewTabRef.current = Boolean(e.metaKey || e.ctrlKey);
        }}
      >
        <CommandInput placeholder="Search tables, records, tabs…" autoFocus />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setSelection({ kind: "none" });
                openSchema();
                closeCommandPalette();
              }}
            >
              <IconLayoutDashboard />
              Open Schema
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                toggleInspector();
                closeCommandPalette();
              }}
            >
              <IconLayoutSidebarRight />
              Toggle Inspector
            </CommandItem>
            <CommandItem
              onSelect={async () => {
                closeCommandPalette();
                if (connection.status === "connected") {
                  disconnect();
                  return;
                }
                openConnectDialog();
              }}
            >
              <IconPlugConnected />
              {connection.status === "connected" ? "Disconnect Postgres" : "Connect to Postgres…"}
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Recent">
            {recents.length === 0 ? (
              <CommandItem disabled>
                <IconClock />
                No recent items yet
              </CommandItem>
            ) : (
              recents.slice(0, 8).map((r) => (
                <CommandItem
                  key={`${r.kind}:${r.kind === "table" ? r.table : `${r.table}:${String(r.pk)}`}`}
                  onSelect={() => {
                    if (r.kind === "table") {
                      setSelection({ kind: "table", table: r.table });
                      openTable(r.table, { newTab: openInNewTabRef.current });
                    } else {
                      setSelection({ kind: "record", table: r.table, pk: r.pk });
                      openRecord(r.table, r.pk, { newTab: openInNewTabRef.current });
                    }
                    closeCommandPalette();
                  }}
                  onMouseDown={(e) => {
                    openInNewTabRef.current = Boolean(e.metaKey || e.ctrlKey);
                  }}
                >
                  {r.kind === "table" ? <IconTable /> : <IconFileText />}
                  <span className="truncate">
                    {r.kind === "table" ? (
                      <span className="font-mono">{r.table}</span>
                    ) : (
                      <span className="font-mono">{r.table}</span>
                    )}
                  </span>
                  <CommandShortcut>⌘↵</CommandShortcut>
                </CommandItem>
              ))
            )}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Tables">
            {(Object.keys(domain.tables) as TableName[]).map((t) => (
              <CommandItem
                key={t}
                onSelect={() => {
                  setSelection({ kind: "table", table: t });
                  openTable(t, { newTab: openInNewTabRef.current });
                  closeCommandPalette();
                }}
                onMouseDown={(e) => {
                  openInNewTabRef.current = Boolean(e.metaKey || e.ctrlKey);
                }}
              >
                <IconTable />
                <span className="font-mono">{t}</span>
                <CommandShortcut>⌘↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Records">
            {recordHits.map((r) => (
              <CommandItem
                key={`${r.table}:${String(r.pk)}`}
                onSelect={() => {
                  setSelection({ kind: "record", table: r.table, pk: r.pk });
                  openRecord(r.table, r.pk, { newTab: openInNewTabRef.current });
                  closeCommandPalette();
                }}
                onMouseDown={(e) => {
                  openInNewTabRef.current = Boolean(e.metaKey || e.ctrlKey);
                }}
              >
                <IconFileText />
                <span className="truncate">{r.label}</span>
                <span className="ml-auto truncate font-mono text-xs text-muted-foreground">{r.table}</span>
                <CommandShortcut>⌘↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Tabs">
            {tabs.map((t) => {
              const isActive = t.id === activeTabId;
              return (
                <CommandItem
                  key={t.id}
                  onSelect={() => {
                    setActiveTabId(t.id);
                    closeCommandPalette();
                  }}
                >
                  <IconDatabase />
                  <span className="truncate">{t.title}</span>
                  {isActive ? <span className="ml-auto text-xs text-muted-foreground">active</span> : null}
                </CommandItem>
              );
            })}
            <CommandItem
              onSelect={() => {
                closeTab(activeTabId);
                closeCommandPalette();
              }}
              disabled={tabs.length <= 1}
            >
              <IconX />
              Close current tab
              <CommandShortcut>⌘W</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>

      {/* Cmd/Ctrl+K hint stays in titlebar too; this is just logic holder. */}
    </CommandDialog>
  );
}

