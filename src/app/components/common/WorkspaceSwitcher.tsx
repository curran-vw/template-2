'use client';

import { useState, useEffect } from 'react'
import { Button } from "./button"
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWorkspace } from "@/app/lib/hooks/useWorkspace"
import { Check, ChevronsUpDown, Plus, Loader2, X, Settings, Users, Pencil } from "lucide-react"
import { cn } from "@/app/lib/utils"
import * as Dialog from '@radix-ui/react-dialog'
import { Input } from "./input"
import { useAuth } from "@/lib/hooks/useAuth"
import { db } from "@/app/lib/firebase/firebase"
import { collection, addDoc, getDocs, query, where } from "firebase/firestore"
import { WorkspaceSettings } from './WorkspaceSettings'
import { useToast } from "../common/use-toast"
import { Workspace } from "@/lib/types/workspace"

export function WorkspaceSwitcher() {
  const { workspace, workspaces, setWorkspace, refreshWorkspaces } = useWorkspace()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [open, setOpen] = useState(false)

  // Debug logging - only log when values actually change
  useEffect(() => {
    console.log('WorkspaceSwitcher - Workspaces updated:', workspaces)
  }, [workspaces])

  useEffect(() => {
    console.log('WorkspaceSwitcher - Selected workspace updated:', workspace)
  }, [workspace])

  // Only refresh workspaces once when component mounts
  useEffect(() => {
    const initialLoad = async () => {
      await refreshWorkspaces()
    }
    initialLoad()
  }, [refreshWorkspaces]) // Add refreshWorkspaces to dependency array

  const handleCreateWorkspace = async () => {
    if (!user || !newWorkspaceName.trim()) return

    setIsCreating(true)
    try {
      // Check for duplicate names
      const existingWorkspace = workspaces.find(
        w => w.name.toLowerCase() === newWorkspaceName.trim().toLowerCase()
      )
      
      if (existingWorkspace) {
        toast({
          title: "Error",
          description: "A workspace with this name already exists",
          variant: "destructive"
        })
        return
      }

      const newWorkspace: Omit<Workspace, 'id'> = {
        name: newWorkspaceName.trim(),
        ownerId: user.uid,
        members: [user.uid],
        createdAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, 'workspaces'), newWorkspace)
      const createdWorkspace: Workspace = {
        id: docRef.id,
        ...newWorkspace
      }

      await refreshWorkspaces()
      setWorkspace(createdWorkspace)
      setShowCreateDialog(false)
      setNewWorkspaceName("")
      
      toast({
        title: "Success",
        description: "Workspace created successfully"
      })
    } catch (error) {
      console.error('Error creating workspace:', error)
      toast({
        title: "Error",
        description: "Failed to create workspace",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleWorkspaceDeleted = async () => {
    setShowSettingsDialog(false);
    await refreshWorkspaces();
    
    // The workspace list will be updated after refreshWorkspaces
    // If there are no workspaces left, setWorkspace(null) will be called
    // If there are workspaces, the active workspace was already set in handleDelete
  }

  return (
    <>
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" role="combobox" className="w-[200px] justify-between">
            {workspace?.name || "Select workspace"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="z-50 min-w-[200px] bg-white rounded-md shadow-lg p-1">
            {workspaces.length > 0 ? (
              workspaces.map((ws) => (
                <DropdownMenu.Item
                  key={ws.id}
                  onClick={() => setWorkspace(ws)}
                  className={cn(
                    "flex items-center justify-between px-2 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-sm group outline-none",
                    workspace?.id === ws.id && "font-medium"
                  )}
                >
                  <div className="flex items-center flex-1">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        workspace?.id === ws.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {ws.name}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "ml-2 h-8 w-8 p-0",
                      "opacity-0 group-hover:opacity-100 transition-opacity"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorkspace(ws);
                      setShowSettingsDialog(true);
                      setOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenu.Item>
              ))
            ) : (
              <DropdownMenu.Item
                className="px-2 py-2 text-sm text-gray-500"
                disabled
              >
                No workspaces found
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
            <DropdownMenu.Item
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center px-2 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-sm outline-none"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Workspace
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              Create New Workspace
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mt-1">
              Add a new workspace to manage your welcome agents.
            </Dialog.Description>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  placeholder="Workspace name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newWorkspaceName.trim()) {
                      handleCreateWorkspace()
                    }
                  }}
                />
              </div>
              <Button 
                onClick={handleCreateWorkspace}
                disabled={isCreating || !newWorkspaceName.trim()}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workspace
                  </>
                )}
              </Button>
            </div>
            <Dialog.Close className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Workspace Settings Dialog */}
      {workspace && showSettingsDialog && (
        <WorkspaceSettings
          workspace={workspace}
          onClose={() => setShowSettingsDialog(false)}
          onDelete={handleWorkspaceDeleted}
        />
      )}
    </>
  )
} 