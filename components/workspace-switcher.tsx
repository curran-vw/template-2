"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, Settings, Sparkles, X, Network } from "lucide-react";
import { toast } from "sonner";

import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/hooks/use-auth";
import { createWorkspace } from "@/firebase/workspace-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { WorkspaceSettings } from "./workspace-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import Link from "next/link";

export function WorkspaceSwitcher() {
  const { workspace, workspaces, setWorkspace, setWorkspaces } = useWorkspace();
  const { user, loading, setUser } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateWorkspace = async () => {
    if (!user) return;

    setIsCreating(true);
    const { workspace, error, success } = await createWorkspace({
      name: newWorkspaceName.trim(),
    });

    if (error) {
      toast.error("Error", {
        description: error,
      });
    } else if (success) {
      setShowCreateDialog(false);
      setWorkspace(workspace);
      setWorkspaces([...workspaces, workspace]);
      setNewWorkspaceName("");
      toast.success("Success", {
        description: success,
      });
      setUser({ ...user, usage: { ...user.usage, workspaces: user.usage.workspaces + 1 } });
    }
    setIsCreating(false);
  };

  const filteredWorkspaces = searchQuery
    ? workspaces.filter((w) => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : workspaces;

  if (loading) {
    return <Skeleton className='h-8 w-[150px] lg:w-64' />;
  }

  return (
    <div className='w-auto lg:w-64'>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size='lg'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='w-full justify-between px-4 transition-all hover:bg-accent'
          >
            {workspace ? (
              <div className='flex items-center gap-2 overflow-hidden'>
                <Network className='h-4 w-4 text-primary' />
                <span className='overflow-ellipsis overflow-hidden font-medium'>
                  {workspace.name}
                </span>
              </div>
            ) : (
              <span className='text-muted-foreground'>Select a workspace</span>
            )}
            <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-[var(--radix-dropdown-menu-trigger-width)] p-2'>
          <div className='mb-2'>
            <Input
              placeholder='Search workspaces...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='h-8'
            />
          </div>

          <div className='max-h-[300px] overflow-y-auto'>
            {filteredWorkspaces.length > 0 ? (
              filteredWorkspaces.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className={cn(
                    "rounded-md my-1 px-2 py-1.5 cursor-pointer",
                    workspace?.id === item.id && "bg-accent",
                  )}
                  onSelect={() => {
                    setWorkspace(item);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <div className='flex items-center w-full'>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        workspace?.id === item.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className='line-clamp-1 flex-grow'>{item.name}</span>
                    {workspace?.id === item.id && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='ml-auto h-6 w-6 hover:bg-background/80'
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSettingsDialog(true);
                          setOpen(false);
                          setSearchQuery("");
                        }}
                      >
                        <Settings className='h-4 w-4' />
                        <span className='sr-only'>Workspace settings</span>
                      </Button>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : searchQuery ? (
              <div className='text-center py-4 text-sm text-muted-foreground'>
                No workspaces match your search
              </div>
            ) : (
              <div className='text-center py-4 text-sm text-muted-foreground'>
                No workspaces available
              </div>
            )}
          </div>

          <DropdownMenuSeparator className='my-2' />

          <DropdownMenuItem
            className='rounded-md px-2 py-1.5 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer'
            onSelect={() => {
              setShowCreateDialog(true);
              setOpen(false);
              setSearchQuery("");
            }}
          >
            <Plus className='mr-2 h-4 w-4' />
            Create Workspace
            {user?.limits.workspaces && user?.usage.workspaces && (
              <Badge variant='outline' className='ml-auto'>
                {user?.limits.workspaces - user?.usage.workspaces}
              </Badge>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Add a new workspace to manage your welcome agents.
            </DialogDescription>
          </DialogHeader>
          {!user ? (
            <>
              <Alert variant='destructive'>
                <AlertTitle>Workspace limit reached</AlertTitle>
                <AlertDescription>
                  You've reached the maximum number of workspaces for your current plan.
                </AlertDescription>
              </Alert>
              <Button size='lg' variant='default' asChild className='w-full'>
                <Link href='/pricing'>
                  <Sparkles className='mr-2 h-4 w-4' />
                  Upgrade Plan
                </Link>
              </Button>
            </>
          ) : (
            <div className='space-y-4 py-2'>
              <div className='space-y-2'>
                <Input
                  placeholder='Enter workspace name'
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newWorkspaceName.trim()) {
                      handleCreateWorkspace();
                    }
                  }}
                  autoFocus
                  maxLength={50}
                />
                <p className='text-xs text-muted-foreground'>
                  {newWorkspaceName.length}/50 characters
                </p>
              </div>

              <DialogFooter>
                <Button variant='outline' onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWorkspace}
                  disabled={isCreating || !newWorkspaceName.trim()}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className='mr-2 h-4 w-4' />
                      Create Workspace
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
          <DialogClose className='absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'>
            <X className='h-4 w-4' />
            <span className='sr-only'>Close</span>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Workspace Settings Dialog */}
      {showSettingsDialog && workspace && (
        <WorkspaceSettings
          workspace={workspace}
          showSettingsDialog={showSettingsDialog}
          setShowSettingsDialog={setShowSettingsDialog}
        />
      )}
    </div>
  );
}
