"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User, Menu, Sparkles } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function TopBar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className='sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background'>
      <div className='flex items-center gap-4 px-4 lg:px-6'>
        <SidebarTrigger className='rounded-md p-2 hover:bg-muted'>
          <Menu className='h-6 w-6' />
          <span className='sr-only'>Toggle sidebar</span>
        </SidebarTrigger>

        <WorkspaceSwitcher />
      </div>

      <div className='px-4 lg:px-6'>
        {loading ? (
          <div className='flex items-center gap-2'>
            <Skeleton className='h-8 w-8 rounded-full' />
            <Skeleton className='h-4 w-24' />
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='lg' className='flex items-center gap-2 px-2 py-1.5'>
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL || "/placeholder.svg"}
                    alt='Profile'
                    width={28}
                    height={28}
                    className='rounded-full'
                  />
                ) : (
                  <div className='flex h-7 w-7 items-center justify-center rounded-full bg-muted'>
                    <User className='h-4 w-4 text-muted-foreground' />
                  </div>
                )}
                <span className='text-sm font-medium'>{user?.displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <div className='px-3 py-2'>
                <div className='text-sm font-medium'>{user?.displayName}</div>
                <div className='text-xs text-muted-foreground'>{user?.email}</div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='capitalize'
                onClick={() => {
                  router.push("/pricing");
                }}
              >
                <Sparkles className='mr-2 h-4 w-4' />
                {user?.plan} Plan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className='text-destructive focus:bg-destructive/10 focus:text-destructive'
              >
                <LogOut className='mr-2 h-4 w-4' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
