'use client'

import { useState, useEffect } from 'react'
import { Button } from './button'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useWorkspace } from '../../lib/hooks/useWorkspace'
import {
  Check,
  ChevronsUpDown,
  Plus,
  Loader2,
  X,
  Settings,
  Users,
  Pencil,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import * as Dialog from '@radix-ui/react-dialog'
import { Input } from './input'
import { useAuth } from '@/app/lib/hooks/useAuth'
import { createWorkspace } from '../../lib/firebase/workspaceUtils'
import { WorkspaceSettings } from './WorkspaceSettings'
import { toast } from 'sonner'

export function WorkspaceSwitcher() {
  const { workspace, workspaces, setWorkspace, refreshWorkspaces } =
    useWorkspace()
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
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
        (w) => w.name.toLowerCase() === newWorkspaceName.trim().toLowerCase(),
      )

      if (existingWorkspace) {
        toast.error('Error', {
          description: 'A workspace with this name already exists',
        })
        return
      }

      // Use the workspaceUtils function instead of directly adding to Firestore
      const createdWorkspace = await createWorkspace(
        newWorkspaceName.trim(),
        user.uid,
      )

      await refreshWorkspaces()
      setWorkspace(createdWorkspace)
      setShowCreateDialog(false)
      setNewWorkspaceName('')

      toast.success('Success', {
        description: 'Workspace created successfully',
      })
    } catch (error) {
      console.error('Error creating workspace:', error)
      toast.error('Error', {
        description: 'Failed to create workspace',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleWorkspaceDeleted = async () => {
    setShowSettingsDialog(false)
    await refreshWorkspaces()

    // The workspace list will be updated after refreshWorkspaces
    // If there are no workspaces left, setWorkspace(null) will be called
    // If there are workspaces, the active workspace was already set in handleDelete
  }

  return (
    <div className="w-full">
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="line-clamp-1 mr-2">
              {workspace?.name || 'Select a workspace'}
            </span>
            <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content className="w-[--radix-dropdown-menu-trigger-width] bg-white rounded-md border p-1 shadow-md z-50">
          <div className="max-h-[300px] overflow-y-auto">
            {workspaces.map((item) => (
              <DropdownMenu.Item
                key={item.id}
                className={cn(
                  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                  'data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900',
                  workspace?.id === item.id && 'bg-gray-100',
                )}
                onSelect={() => {
                  setWorkspace(item)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    workspace?.id === item.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="line-clamp-1">{item.name}</span>
                {workspace?.id === item.id && (
                  <button
                    className="ml-auto opacity-70 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSettingsDialog(true)
                      setOpen(false)
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </DropdownMenu.Item>
            ))}
          </div>

          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-gray-200" />

          <DropdownMenu.Item
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-blue-600 outline-none data-[highlighted]:bg-gray-100 data-[highlighted]:text-blue-700"
            onSelect={() => {
              setShowCreateDialog(true)
              setOpen(false)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      {/* Create Workspace Dialog */}
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
      {showSettingsDialog && workspace && (
        <WorkspaceSettings
          workspace={workspace}
          onClose={() => setShowSettingsDialog(false)}
          onDelete={handleWorkspaceDeleted}
        />
      )}
    </div>
  )
}
