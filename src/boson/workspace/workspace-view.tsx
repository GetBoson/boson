import * as React from "react";
import { IconChevronLeft, IconFileText, IconGraph, IconTable, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import { SchemaTabView } from "@/boson/workspace/views/schema-tab";
import { TableTabView } from "@/boson/workspace/views/table-tab";
import { RecordTabView } from "@/boson/workspace/views/record-tab";
import { RightInspector } from "@/boson/workspace/views/right-inspector";
import { formatRowLabel, getRowByPk } from "@/boson/fake-domain";

export function WorkspaceView() {
  const { tabs, activeTabId, activeTab, setActiveTabId, closeTab, goBack, setSelection, inspectorOpen, domain } =
    useWorkspace();
  const active = activeTab;

  // Keep inspector selection aligned to the active tab.
  // (Users can still select within a tab; any active-tab navigation re-syncs.)
  // This prevents “inspector drift” where selection doesn’t match what you’re looking at.
  React.useEffect(() => {
    if (!active) return;
    if (active.spec.kind === "schema") setSelection({ kind: "none" });
    if (active.spec.kind === "table") setSelection({ kind: "table", table: active.spec.table });
    if (active.spec.kind === "record")
      setSelection({ kind: "record", table: active.spec.table, pk: active.spec.pk });
  }, [activeTabId, active?.spec, setSelection]);

  return (
    <div className="flex h-[calc(100dvh-2.25rem)] min-h-0 w-full">
      <div className={cn("flex min-w-0 flex-1 flex-col", inspectorOpen ? "border-r" : "")}>
        <div className="flex items-center gap-1 border-b bg-workspace/70 px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-md"
            aria-label="Back"
            onClick={() => active && goBack(active.id)}
            disabled={!active || active.history.length <= 1}
          >
            <IconChevronLeft className="size-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const isActive = t.id === activeTabId;
              const icon =
                t.spec.kind === "schema" ? (
                  <IconGraph className="size-3.5 shrink-0" />
                ) : t.spec.kind === "table" ? (
                  <IconTable className="size-3.5 shrink-0" />
                ) : (
                  <IconFileText className="size-3.5 shrink-0" />
                );

              let label = t.title;
              if (t.spec.kind === "table") label = t.spec.table;
              if (t.spec.kind === "record") {
                const row = getRowByPk(domain, t.spec.table, t.spec.pk);
                label = row ? formatRowLabel(domain, t.spec.table, row) : `${t.spec.table} · ${String(t.spec.pk)}`;
              }
              return (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    "group inline-flex max-w-[320px] shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-selected/50 text-foreground shadow-xs ring-1 ring-border"
                      : "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  onClick={() => setActiveTabId(t.id)}
                >
                  <span className={cn("text-muted-foreground", isActive ? "text-foreground" : "")}>{icon}</span>
                  <span className="truncate">{label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "rounded p-0.5 hover:bg-background/60",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      closeTab(t.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      e.stopPropagation();
                      closeTab(t.id);
                    }}
                    aria-label="Close tab"
                    title="Close tab"
                  >
                    <IconX className="size-3" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-background">
          {active?.spec.kind === "schema" ? <SchemaTabView /> : null}
          {active?.spec.kind === "table" ? <TableTabView table={active.spec.table} /> : null}
          {active?.spec.kind === "record" ? (
            <RecordTabView table={active.spec.table} pk={active.spec.pk} />
          ) : null}
        </div>
      </div>

      {inspectorOpen ? <RightInspector /> : null}
    </div>
  );
}

