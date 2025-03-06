import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  DocumentData,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction
} from 'firebase/firestore';
import type { Workspace, WorkspaceInvite } from '@/lib/types/workspace';

export async function createWorkspace(name: string, userId: string): Promise<Workspace> {
  try {
    console.log(`Creating workspace "${name}" for user ${userId}`);
    
    // First check if a workspace with this name already exists for the user
    const existingQuery = query(
      collection(db, 'workspaces'),
      where('members', 'array-contains', userId),
      where('name', '==', name)
    );
    
    const existingSnapshots = await getDocs(existingQuery);
    
    if (!existingSnapshots.empty) {
      console.log('Workspace with this name already exists, returning existing one');
      const existingData = existingSnapshots.docs[0].data();
      return {
        id: existingSnapshots.docs[0].id,
        name: existingData.name,
        ownerId: existingData.ownerId,
        createdAt: existingData.createdAt,
        members: existingData.members || [existingData.ownerId]
      };
    }
    
    // Create the new workspace
    const workspace = {
      name,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      members: [userId], // Initialize with owner as first member
    };

    const docRef = await addDoc(collection(db, 'workspaces'), workspace);
    
    console.log(`Workspace created with ID: ${docRef.id}`);
    
    return { 
      id: docRef.id, 
      ...workspace 
    };
  } catch (error) {
    console.error('Error in createWorkspace:', error);
    throw error;
  }
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const workspacesRef = collection(db, 'workspaces');
  const q = query(
    workspacesRef,
    where('members', 'array-contains', userId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as DocumentData;
    return {
      id: doc.id,
      name: data.name,
      ownerId: data.ownerId,
      createdAt: data.createdAt,
      members: data.members || [data.ownerId], // Fallback for legacy workspaces
    };
  });
}

// Check if user has access to a workspace
export async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  try {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (!workspaceSnap.exists()) {
      return false;
    }
    
    const workspaceData = workspaceSnap.data();
    return workspaceData.members?.includes(userId) || false;
  } catch (error) {
    console.error('Error checking workspace access:', error);
    return false;
  }
}

export async function deleteWorkspace(workspaceId: string, userId: string): Promise<boolean> {
  try {
    // First check if the user is the owner
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (!workspaceSnap.exists()) {
      return false;
    }
    
    const workspaceData = workspaceSnap.data();
    if (workspaceData.ownerId !== userId) {
      console.error('Access denied: Only the workspace owner can delete it');
      return false;
    }
    
    await deleteDoc(workspaceRef);
    return true;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return false;
  }
}

export async function inviteUserToWorkspace(workspaceId: string, email: string, inviterId: string): Promise<WorkspaceInvite | null> {
  // Check if the inviter has access to the workspace
  const hasAccess = await checkWorkspaceAccess(workspaceId, inviterId);
  if (!hasAccess) {
    console.error('Access denied: User does not have access to this workspace');
    return null;
  }
  
  const invite = {
    workspaceId,
    email: email.toLowerCase(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    inviterId
  };

  const docRef = await addDoc(collection(db, 'workspace_invites'), invite);
  return { id: docRef.id, ...invite } as WorkspaceInvite;
}

export async function getWorkspaceInvites(workspaceId: string, userId: string): Promise<WorkspaceInvite[]> {
  // Check if the user has access to the workspace
  const hasAccess = await checkWorkspaceAccess(workspaceId, userId);
  if (!hasAccess) {
    console.error('Access denied: User does not have access to this workspace');
    return [];
  }
  
  const invitesRef = collection(db, 'workspace_invites');
  const q = query(
    invitesRef,
    where('workspaceId', '==', workspaceId),
    where('status', '==', 'pending')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as WorkspaceInvite));
}

export async function updateWorkspaceMembers(workspaceId: string, userId: string, targetUserId: string, action: 'add' | 'remove'): Promise<boolean> {
  try {
    // Check if the user has access to modify members
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (!workspaceSnap.exists()) {
      return false;
    }
    
    const workspaceData = workspaceSnap.data();
    // Only workspace owner can remove members, but members can add other members
    if (action === 'remove' && workspaceData.ownerId !== userId) {
      console.error('Access denied: Only the workspace owner can remove members');
      return false;
    }
    
    if (action === 'add' && !workspaceData.members.includes(userId)) {
      console.error('Access denied: User is not a member of this workspace');
      return false;
    }
    
    await updateDoc(workspaceRef, {
      members: action === 'add' ? arrayUnion(targetUserId) : arrayRemove(targetUserId)
    });
    return true;
  } catch (error) {
    console.error(`Error ${action === 'add' ? 'adding' : 'removing'} workspace member:`, error);
    return false;
  }
}

export async function updateWorkspaceName(workspaceId: string, newName: string, userId: string): Promise<boolean> {
  try {
    // Check if the user is the owner or a member
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);
    
    if (!workspaceSnap.exists()) {
      return false;
    }
    
    const workspaceData = workspaceSnap.data();
    // Only the owner can update the workspace name
    if (workspaceData.ownerId !== userId) {
      console.error('Access denied: Only the workspace owner can update the name');
      return false;
    }
    
    await updateDoc(workspaceRef, {
      name: newName,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error updating workspace name:', error);
    return false;
  }
} 