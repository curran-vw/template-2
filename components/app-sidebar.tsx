"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Mail, SquareTerminal, ChevronRight, History } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setOpen } = useSidebar();
  const isAdminUser =
    user?.email === "curranvw@gmail.com" || user?.email === "abdelr7manabdelmoaty@gmail.com";

  const isPathActive = (path: string) => {
    if (!pathname) return false;
    return pathname === path;
  };

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <div className='py-3'>
          <Link href='/dashboard'>
            <Image src='/WA-Sidebar-logo.webp' alt='Welcome Agent' width={40} height={40} />
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Welcome Agent</SidebarGroupLabel>

          <SidebarMenu>
            <SidebarMenuItem>
              <Link href='/dashboard'>
                <SidebarMenuButton tooltip='Dashboard' isActive={isPathActive("/dashboard")}>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            <Collapsible asChild className='group/collapsible' defaultOpen={true}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip='Welcome Agent' onClick={() => setOpen(true)}>
                    <Mail />
                    <span>Welcome Agent</span>
                    <ChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {[
                      {
                        title: "Add New Agent",
                        url: "/agents/new",
                      },
                      {
                        title: "View All Agents",
                        url: "/agents",
                      },
                    ].map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton isActive={isPathActive(subItem.url)} asChild>
                          <Link href={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            <SidebarMenuItem>
              <Link href='/email-history'>
                <SidebarMenuButton
                  tooltip='Email History'
                  isActive={isPathActive("/email-history")}
                >
                  <History />
                  <span>Email History</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>

            {isAdminUser && (
              <SidebarMenuItem>
                <Link href='/logs'>
                  <SidebarMenuButton tooltip='Logs' isActive={isPathActive("/logs")}>
                    <SquareTerminal />
                    <span>Logs</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
