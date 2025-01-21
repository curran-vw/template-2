'use client';

import { useState, useEffect } from 'react';
import { Workspace } from '@/lib/types/workspace';
import { deleteWorkspace, inviteUserToWorkspace, updateWorkspaceName } from '@/lib/firebase/workspaceUtils';
import { Loader2, Mail, Trash2, X, Pencil, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { useToast } from './use-toast';
import { useWorkspace } from '@/app/lib/hooks/useWorkspace';
import { Button } from './button';

interface WorkspaceSettingsProps {
  workspace: Workspace;
  onClose: () => void;
  onDelete: () => void;
}

export function WorkspaceSettings({ workspace, onClose, onDelete }: WorkspaceSettingsProps) {
  const { workspaces, refreshWorkspaces, setWorkspace } = useWorkspace()
  const { toast } = useToast()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);

  const isLastWorkspace = workspaces.length === 1;

  const handleNameSave = async () => {
    if (!newName.trim() || newName === workspace.name) {
      setIsEditing(false);
      setNewName(workspace.name);
      return;
    }

    // Check for duplicate names
    const existingWorkspace = workspaces.find(
      w => w.id !== workspace.id && w.name.toLowerCase() === newName.trim().toLowerCase()
    );

    if (existingWorkspace) {
      toast({
        title: "Error",
        description: "A workspace with this name already exists",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateWorkspaceName(workspace.id, newName.trim());
      await refreshWorkspaces();
      
      // Update the current workspace with the new name
      setWorkspace({
        ...workspace,
        name: newName.trim()
      });
      
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Workspace name updated successfully"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update workspace name",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;
    
    setIsInviting(true);
    setError(null);
    try {
      await inviteUserToWorkspace(workspace.id, inviteEmail);
      setInviteEmail('');
    } catch (err) {
      setError('Failed to send invite. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleDelete = async () => {
    if (isLastWorkspace) {
      toast({
        title: "Cannot Delete Workspace",
        description: "You must have at least one workspace.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      const nextWorkspace = workspaces.find(w => w.id !== workspace.id);
      if (nextWorkspace) {
        setWorkspace(nextWorkspace);
      }

      await deleteWorkspace(workspace.id);
      await refreshWorkspaces();
      
      toast({
        title: "Success",
        description: "Workspace deleted successfully"
      });
      
      onDelete();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete workspace",
        variant: "destructive"
      });
      setError('Failed to delete workspace. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-xl font-semibold w-[300px]"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleNameSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setNewName(workspace.name);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {workspace.name}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Invite Users Section - Coming Soon */}
        <div className="mb-6 mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Invite Users</h3>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Coming Soon
            </span>
          </div>
          <div className="flex gap-2 opacity-50 cursor-not-allowed">
            <input
              type="email"
              placeholder="Email address"
              disabled
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50"
            />
            <button
              disabled
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium",
                "bg-zinc-900 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
            >
              <Mail className="h-4 w-4" />
              Invite
            </button>
          </div>
        </div>

        {/* Delete Workspace Section */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Danger Zone</h3>
          <div className="bg-red-50 p-4 rounded-md">
            {showDeleteConfirm ? (
              <>
                <p className="text-sm text-red-600 mb-4">
                  Are you sure you want to delete <span className="font-medium">{workspace.name}</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || isLastWorkspace}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700",
                      "disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    )}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Workspace
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600">Delete this workspace</p>
                  <p className="text-sm text-red-500 mt-1">
                    {isLastWorkspace 
                      ? "You cannot delete your last workspace."
                      : "Once you delete a workspace, there is no going back."}
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLastWorkspace}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-100",
                    "flex items-center gap-2 ml-4",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 