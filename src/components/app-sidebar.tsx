import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { IconBox, IconClock, IconFileText, IconGraph, IconTable } from "@tabler/icons-react";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";

export function AppSidebar() {
  const { domain, openSchema, openTable, openRecord, recents, setSelection, activeTab } = useWorkspace();
  const tableNames = Object.keys(domain.tables) as TableName[];
  const activeSpec = activeTab?.spec;
  const contextTable =
    activeSpec?.kind === "table" ? activeSpec.table : activeSpec?.kind === "record" ? activeSpec.table : null;

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="px-2 py-1 text-sm font-semibold tracking-tight">
          Boson
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeSpec?.kind === "schema"}
                  onClick={() => {
                    setSelection({ kind: "none" });
                    openSchema();
                  }}
                >
                  <IconGraph />
                  <span>Schema</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tables</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tableNames.map((t) => (
                <SidebarMenuItem key={t}>
                  <SidebarMenuButton
                    isActive={contextTable === t}
                    onClick={() => {
                      setSelection({ kind: "table", table: t });
                      openTable(t);
                    }}
                  >
                    <IconTable />
                    <span className="truncate">{t}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recents.slice(0, 8).map((r) => (
                <SidebarMenuItem key={`${r.kind}:${r.kind === "table" ? r.table : `${r.table}:${String(r.pk)}`}`}>
                  <SidebarMenuButton
                    onClick={() => {
                      if (r.kind === "table") {
                        setSelection({ kind: "table", table: r.table });
                        openTable(r.table);
                      } else {
                        setSelection({ kind: "record", table: r.table, pk: r.pk });
                        openRecord(r.table, r.pk);
                      }
                    }}
                  >
                    {r.kind === "table" ? <IconTable /> : <IconFileText />}
                    <span className="truncate">{r.kind === "table" ? r.table : `${r.table}`}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {recents.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  <IconClock className="mr-2 inline size-4" />
                  Recent tables and records will appear here.
                </div>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto px-3 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <IconBox className="size-4" />
            <span>Local-first · Read-only by default</span>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

