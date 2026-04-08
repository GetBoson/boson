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
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  className?: string;
};

export function Titlebar({ title = "Boson", className }: Props) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const { inspectorOpen, toggleInspector, activeTab, openCommandPalette } = useWorkspace();

  const connectionLabel = "Demo: Acme Billing";
  const tabLabel =
    activeTab?.spec.kind === "schema"
      ? "Schema"
      : activeTab?.spec.kind === "table"
        ? `Table · ${activeTab.spec.table}`
        : activeTab?.spec.kind === "record"
          ? `Record · ${activeTab.spec.table}`
          : "Workspace";

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-9 items-center border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        className,
      )}
    >
      <div
        data-tauri-drag-region
        className="flex w-56 shrink-0 items-center gap-2 ml-18 mt-2"
      >
        <div className="text-xs text-muted-foreground">{connectionLabel}</div>
      </div>

      <div
        data-tauri-drag-region
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div
          data-tauri-drag-region
          className="pointer-events-auto flex min-w-0 items-center gap-2 text-sm font-medium"
        >
          <IconSquareDashed
            data-tauri-drag-region
            className="size-4 text-muted-foreground"
          />
          <span data-tauri-drag-region className="truncate">
            {title}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="truncate text-xs text-muted-foreground">
            {tabLabel}
          </span>
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
