import type { ReactNode } from "react";

import { Titlebar } from "@/components/titlebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { WorkspaceProvider } from "@/boson/workspace/workspace-context";
import { CommandPalette } from "@/boson/command-palette";
import { ConnectDialog } from "@/boson/connect-dialog";

type Props = {
  children: ReactNode;
};

export function AppLayout({ children }: Props) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <SidebarProvider defaultOpen>
        <WorkspaceProvider>
          <Titlebar />
          <CommandPalette />
          <ConnectDialog />
          <AppSidebar />
          <SidebarInset className="pt-9">{children}</SidebarInset>
        </WorkspaceProvider>
      </SidebarProvider>
    </main>
  );
}

