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
import { IconBox, IconGraph, IconTable } from "@tabler/icons-react";
import { useWorkspace } from "@/boson/workspace/workspace-context";
import type { TableName } from "@/boson/fake-domain";

export function AppSidebar() {
  const { domain, openSchema, openTable, setSelection } = useWorkspace();
  const tableNames = Object.keys(domain.tables) as TableName[];

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
                    onClick={() => {
                      setSelection({ kind: "table", table: t });
                      openTable(t);
                    }}
                  >
                    <IconTable />
                    <span>{t}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>v1 story</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Explore relational data through <span className="font-mono">schema</span>,{" "}
              <span className="font-mono">tables</span>, and connected{" "}
              <span className="font-mono">records</span>.
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => openSchema({ newTab: true })}>
                  <IconBox />
                  <span>Open Schema in new tab</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

