import {
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightExpand,
  IconMoon,
  IconSearch,
  IconSquareDashed,
  IconSun,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import { formatRowLabel, getRowByPk } from "@/boson/fake-domain";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  className?: string;
};

export function Titlebar({ title = "Boson", className }: Props) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const { inspectorOpen, toggleInspector, activeTab, openCommandPalette, connection, openConnectDialog, domain } =
    useWorkspace();

  const connectionLabel =
    connection.status === "connected" || connection.status === "refreshing"
      ? `${connection.database} (${connection.schema})`
      : connection.status === "connecting"
        ? "Connecting…"
        : connection.status === "error"
          ? "Connection error"
          : "No connection";
  const connectionSub =
    connection.status === "connected" || connection.status === "refreshing"
      ? "Postgres · Read only"
      : connection.status === "error"
        ? connection.message
        : "Demo data";
  const tabLabel =
    activeTab?.spec.kind === "schema"
      ? "Schema"
      : activeTab?.spec.kind === "table"
        ? `Table`
        : activeTab?.spec.kind === "record"
          ? `Record`
          : "Workspace";
  const tabContext =
    activeTab?.spec.kind === "table"
      ? activeTab.spec.table
      : activeTab?.spec.kind === "record"
        ? activeTab.spec.table
        : activeTab?.spec.kind === "schema"
          ? "Structure"
          : "";
  const recordSuffix =
    activeTab?.spec.kind === "record"
      ? (() => {
          const row = getRowByPk(domain, activeTab.spec.table, activeTab.spec.pk);
          const pkShort = String(activeTab.spec.pk).slice(0, 8);
          return row ? formatRowLabel(domain, activeTab.spec.table, row) : `${pkShort}…`;
        })()
      : "";

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-11 items-center border-b bg-sidebar/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-sidebar/70",
        className,
      )}
    >
      <div
        data-tauri-drag-region
        className="flex w-72 shrink-0 items-center gap-2"
      >
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border bg-background/40 px-2.5 py-1 text-foreground/90 hover:bg-background/60"
            onClick={openConnectDialog}
            title="Connection settings"
          >
            {connectionLabel}
          </button>
          <span className="rounded bg-muted/40 px-2 py-1 text-muted-foreground">{connectionSub}</span>
        </div>
      </div>

      <div
        data-tauri-drag-region
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          data-tauri-drag-region
          className="pointer-events-auto flex min-w-0 items-center gap-2"
        >
          <IconSquareDashed
            data-tauri-drag-region
            className="size-4 text-muted-foreground"
          />
          <div className="min-w-0">
            <div data-tauri-drag-region className="truncate text-sm font-semibold tracking-tight">
              {title}
            </div>
            <div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
              <span className="font-medium text-foreground/80">{tabLabel}</span>
              {tabContext ? (
                <>
                  <span className="px-1 text-muted-foreground">·</span>
                  <span className="font-mono">{tabContext}</span>
                </>
              ) : null}
              {recordSuffix ? (
                <>
                  <span className="px-1 text-muted-foreground">·</span>
                  <span className="truncate text-foreground/80">{recordSuffix}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-md"
          aria-label="Search"
          title="Search (⌘/Ctrl+K)"
          onClick={openCommandPalette}
        >
          <IconSearch className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-md"
          aria-label="Toggle left sidebar"
          onClick={toggleSidebar}
        >
          <IconLayoutSidebarLeftExpand className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-md"
          aria-label="Toggle right sidebar"
          onClick={toggleInspector}
        >
          <IconLayoutSidebarRightExpand
            className={cn(
              "size-4",
              inspectorOpen ? "opacity-100" : "opacity-60",
            )}
          />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-md"
          aria-label="Toggle theme"
          onClick={() => {
            const current =
              theme === "system"
                ? (resolvedTheme ?? "light")
                : (theme ?? "light");
            setTheme(current === "dark" ? "light" : "dark");
          }}
        >
          <IconSun className="size-4 dark:hidden" />
          <IconMoon className="hidden size-4 dark:block" />
        </Button>
      </div>
    </div>
  );
}
