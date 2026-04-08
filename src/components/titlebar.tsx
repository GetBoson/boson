import {
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightExpand,
  IconMoon,
  IconSquareDashed,
  IconSun,
} from "@tabler/icons-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  className?: string;
};

export function Titlebar({ title = "Boson", className }: Props) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-9 items-center border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        className,
      )}
    >
      <div data-tauri-drag-region className="w-20 shrink-0" />

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
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
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
        >
          <IconLayoutSidebarRightExpand className="size-4" />
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
              theme === "system" ? resolvedTheme ?? "light" : theme ?? "light";
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
