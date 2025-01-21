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
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { Workspace, WorkspaceInvite } from '../types/workspace';

export async function createWorkspace(name: string, userId: string): Promise<Workspace> {
  const workspace = {
    name,
    ownerId: userId,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'workspaces'), workspace);
  return { 
    id: docRef.id, 
    ...workspace 
  };
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const workspacesRef = collection(db, 'workspaces');
  const q = query(
    workspacesRef,
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as DocumentData;
    return {
      id: doc.id,
      name: data.name,
      ownerId: data.ownerId,
      createdAt: data.createdAt,
    };
  });
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await deleteDoc(doc(db, 'workspaces', workspaceId));
}

export async function inviteUserToWorkspace(workspaceId: string, email: string): Promise<WorkspaceInvite> {
  const invite = {
    workspaceId,
    email: email.toLowerCase(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, 'workspace_invites'), invite);
  return { id: docRef.id, ...invite } as WorkspaceInvite;
}

export async function getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
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

export async function updateWorkspaceMembers(workspaceId: string, userId: string, action: 'add' | 'remove'): Promise<void> {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  await updateDoc(workspaceRef, {
    members: action === 'add' ? arrayUnion(userId) : arrayRemove(userId)
  });
}

export async function updateWorkspaceName(workspaceId: string, newName: string): Promise<void> {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  await updateDoc(workspaceRef, {
    name: newName,
    updatedAt: Date.now()
  });
} 