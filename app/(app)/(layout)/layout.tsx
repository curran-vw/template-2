import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default function LayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='bg-white'>
        <TopBar />
        <main className='flex-1 p-4 lg:p-6 overflow-auto'>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
