import * as React from "react";
import { IconChevronLeft, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import { SchemaTabView } from "@/boson/workspace/views/schema-tab";
import { TableTabView } from "@/boson/workspace/views/table-tab";
import { RecordTabView } from "@/boson/workspace/views/record-tab";
import { RightInspector } from "@/boson/workspace/views/right-inspector";

export function WorkspaceView() {
  const { tabs, activeTabId, setActiveTabId, closeTab, goBack, setSelection, inspectorOpen } =
    useWorkspace();
  const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  // Keep inspector selection aligned to the active tab.
  // (Users can still select within a tab; switching tabs re-syncs.)
  // This prevents “inspector drift” where selection doesn’t match what you’re looking at.
  React.useEffect(() => {
    if (!active) return;
    if (active.spec.kind === "schema") setSelection({ kind: "none" });
    if (active.spec.kind === "table") setSelection({ kind: "table", table: active.spec.table });
    if (active.spec.kind === "record")
      setSelection({ kind: "record", table: active.spec.table, pk: active.spec.pk });
  }, [activeTabId]); // intentionally only on tab switch

  return (
    <div className="flex h-[calc(100dvh-2.25rem)] min-h-0 w-full">
      <div className={cn("flex min-w-0 flex-1 flex-col", inspectorOpen ? "border-r" : "")}>
        <div className="flex items-center gap-1 border-b bg-background px-2 py-1">
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
              return (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    "group inline-flex max-w-[240px] shrink-0 items-center gap-2 rounded-md border px-2 py-1 text-xs",
                    isActive
                      ? "border-border bg-muted text-foreground"
                      : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                  onClick={() => setActiveTabId(t.id)}
                >
                  <span className="truncate">{t.title}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="rounded p-0.5 opacity-0 hover:bg-background/60 group-hover:opacity-100"
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

        <div className="min-h-0 flex-1 overflow-auto">
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

