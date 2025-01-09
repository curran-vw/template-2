export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  ownerId: string;
  members?: string[]; // Array of user IDs who have access
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
} 