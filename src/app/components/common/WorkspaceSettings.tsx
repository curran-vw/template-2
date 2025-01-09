'use client';

import { useState } from 'react';
import { Workspace } from '@/lib/types/workspace';
import { deleteWorkspace, inviteUserToWorkspace } from '@/lib/firebase/workspaceUtils';
import { Loader2, Mail, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceSettingsProps {
  workspace: Workspace;
  onClose: () => void;
  onDelete: () => void;
}

export function WorkspaceSettings({ workspace, onClose, onDelete }: WorkspaceSettingsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setIsDeleting(true);
    try {
      await deleteWorkspace(workspace.id);
      onDelete();
    } catch (err) {
      setError('Failed to delete workspace. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Workspace Settings</h2>
            <p className="text-sm text-gray-500 mt-1">{workspace.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Invite Users Section */}
        <div className="mb-6 mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Invite Users</h3>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
            />
            <button
              onClick={handleInviteUser}
              disabled={isInviting || !inviteEmail.trim()}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium",
                "bg-zinc-900 text-white hover:bg-zinc-800",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
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
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
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
                    Once you delete a workspace, there is no going back.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-100 flex items-center gap-2 ml-4"
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