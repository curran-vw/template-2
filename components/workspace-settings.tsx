"use client";

import { useState } from "react";
import { Loader2, Mail, Trash2, X, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { userUtils } from "@/firebase/user-utils";
import type { Workspace } from "@/types/workspace";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteWorkspace,
  inviteUserToWorkspace,
  updateWorkspaceName,
} from "@/firebase/workspace-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkspaceSettingsProps {
  workspace: Workspace;
  showSettingsDialog: boolean;
  setShowSettingsDialog: (show: boolean) => void;
}

export function WorkspaceSettings({
  workspace,
  showSettingsDialog,
  setShowSettingsDialog,
}: WorkspaceSettingsProps) {
  const { workspaces, refreshWorkspaces, setWorkspace } = useWorkspace();
  const { user, setUser } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);

  const isLastWorkspace = workspaces.length === 1;

  const handleNameSave = async () => {
    if (!user || !newName.trim() || newName === workspace.name) {
      setIsEditing(false);
      setNewName(workspace.name);
      return;
    }

    // Check for duplicate names
    const existingWorkspace = workspaces.find(
      (w) => w.id !== workspace.id && w.name.toLowerCase() === newName.trim().toLowerCase(),
    );

    if (existingWorkspace) {
      toast.error("Error", {
        description: "A workspace with this name already exists",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (!user) {
        toast.error("Error", {
          description: "You must be logged in to update workspace name",
        });
        return;
      }

      const success = await updateWorkspaceName(workspace.id, newName.trim(), user.uid);

      if (!success) {
        toast.error("Access Denied", {
          description: "You don't have permission to update this workspace name",
        });
        setIsEditing(false);
        setNewName(workspace.name);
        return;
      }

      await refreshWorkspaces();

      // Update the current workspace with the new name
      setWorkspace({
        id: workspace.id,
        name: newName.trim(),
        createdAt: workspace.createdAt,
        ownerId: workspace.ownerId,
        members: workspace.members || [],
      });

      setIsEditing(false);
      toast.success("Success", {
        description: "Workspace name updated successfully",
      });
    } catch (err) {
      toast.error("Error", {
        description: "Failed to update workspace name",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteUser = async () => {
    if (!user || !inviteEmail.trim()) return;

    setIsInviting(true);
    setError(null);
    try {
      const result = await inviteUserToWorkspace(workspace.id, inviteEmail, user.uid);

      if (!result) {
        toast.error("Access Denied", {
          description: "You don't have permission to invite users to this workspace",
        });
        return;
      }

      setInviteEmail("");
      toast.success("Success", {
        description: "Invitation sent successfully",
      });
    } catch (err) {
      setError("Failed to send invite. Please try again.");
      toast.error("Error", {
        description: "Failed to send invitation",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    if (isLastWorkspace) {
      toast.error("Cannot Delete Workspace", {
        description: "You must have at least one workspace.",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteWorkspace(workspace.id);

      if (!success) {
        toast.error("Access Denied", {
          description: "You don't have permission to delete this workspace",
        });
        setIsDeleting(false);
        return;
      }

      setShowSettingsDialog(false);

      setUser({
        ...user,
        remainingWorkspaces: user.remainingWorkspaces + 1,
      });

      await refreshWorkspaces();

      toast.success("Success", {
        description: "Workspace deleted successfully",
      });
    } catch (err) {
      toast.error("Error", {
        description: "Failed to delete workspace",
      });
      setError("Failed to delete workspace. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={showSettingsDialog} onOpenChange={(value) => setShowSettingsDialog(value)}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              {isEditing ? (
                <div className='flex items-center gap-2'>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className='text-xl font-semibold'
                    autoFocus
                  />
                  <Button size='sm' onClick={handleNameSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Save className='h-4 w-4' />
                    )}
                    <span className='sr-only'>Save</span>
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => {
                      setIsEditing(false);
                      setNewName(workspace.name);
                    }}
                  >
                    <X className='h-4 w-4' />
                    <span className='sr-only'>Cancel</span>
                  </Button>
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <DialogTitle className='text-xl'>{workspace.name}</DialogTitle>
                  <Button size='sm' variant='ghost' onClick={() => setIsEditing(true)}>
                    <Pencil className='h-4 w-4' />
                    <span className='sr-only'>Edit</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Invite Users Section - Coming Soon */}
        <div className='mb-6 mt-6'>
          <div className='flex items-center justify-between mb-2'>
            <h3 className='text-sm font-medium'>Invite Users</h3>
            <Badge variant='secondary' className='bg-primary/10 text-primary hover:bg-primary/20'>
              Coming Soon
            </Badge>
          </div>
          <div className='flex gap-2 opacity-50 pointer-events-none'>
            <Input type='email' placeholder='Email address' disabled className='flex-1' />
            <Button disabled variant='default' className='flex items-center gap-2'>
              <Mail className='h-4 w-4' />
              Invite
            </Button>
          </div>
        </div>

        {/* Delete Workspace Section */}
        <div className='border-t pt-6'>
          <h3 className='text-sm font-medium mb-2'>Danger Zone</h3>
          <div className='bg-destructive/10 p-4 rounded-md'>
            {showDeleteConfirm ? (
              <>
                <p className='text-sm text-destructive mb-4'>
                  Are you sure you want to delete{" "}
                  <span className='font-medium'>{workspace.name}</span>? This action cannot be
                  undone.
                </p>
                <div className='flex gap-2'>
                  <Button variant='outline' onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant='destructive'
                    onClick={handleDelete}
                    disabled={isDeleting || isLastWorkspace}
                    className='flex items-center gap-2'
                  >
                    {isDeleting ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Trash2 className='h-4 w-4' />
                    )}
                    Delete Workspace
                  </Button>
                </div>
              </>
            ) : (
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='text-sm font-medium text-destructive'>Delete this workspace</h4>
                  <p className='text-xs text-destructive/80 mt-1'>
                    This will permanently delete the workspace and all associated data.
                  </p>
                </div>
                <Button
                  variant='outline'
                  className='border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive'
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLastWorkspace}
                  title={isLastWorkspace ? "You must have at least one workspace" : undefined}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <Alert variant='destructive' className='mt-4'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
