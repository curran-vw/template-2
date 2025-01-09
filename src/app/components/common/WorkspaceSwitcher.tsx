'use client';

import { useState, useEffect } from 'react'
import { Button } from "./button"
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWorkspace } from "@/app/lib/hooks/useWorkspace"
import { Check, ChevronsUpDown, Plus, Loader2, X } from "lucide-react"
import { cn } from "@/app/lib/utils"
import * as Dialog from '@radix-ui/react-dialog'
import { Input } from "./input"
import { useAuth } from "@/lib/hooks/useAuth"
import { db } from "@/app/lib/firebase/firebase"
import { collection, addDoc } from "firebase/firestore"

export function WorkspaceSwitcher() {
  const { workspace, workspaces, setWorkspace, refreshWorkspaces } = useWorkspace()
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")

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
  }, []) // Empty dependency array - only runs once

  const handleCreateWorkspace = async () => {
    if (!user || !newWorkspaceName.trim()) return

    setIsCreating(true)
    try {
      const newWorkspace = {
        name: newWorkspaceName.trim(),
        ownerId: user.uid,
        members: [user.uid],
        createdAt: Date.now()
      }

      const docRef = await addDoc(collection(db, 'workspaces'), newWorkspace)
      const createdWorkspace = {
        id: docRef.id,
        ...newWorkspace
      }

      // Refresh the workspaces list
      await refreshWorkspaces()
      
      // Set the new workspace as active
      setWorkspace(createdWorkspace)
      setShowCreateDialog(false)
      setNewWorkspaceName("")
    } catch (error) {
      console.error('Error creating workspace:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="outline" role="combobox" className="w-[200px] justify-between">
            {workspace?.name || "Select workspace"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="z-50 w-[200px] bg-white rounded-md shadow-lg p-1">
            {workspaces.length > 0 ? (
              workspaces.map((ws) => (
                <DropdownMenu.Item
                  key={ws.id}
                  onClick={() => {
                    console.log('Selecting workspace:', ws)
                    setWorkspace(ws)
                  }}
                  className={cn(
                    "flex items-center px-2 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-sm",
                    workspace?.id === ws.id && "font-medium"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      workspace?.id === ws.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {ws.name}
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
              className="flex items-center px-2 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded-sm"
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
    </>
  )
} 