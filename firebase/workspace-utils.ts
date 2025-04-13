import { auth, db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  DocumentData,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import type { Workspace, WorkspaceInvite } from "../types/workspace";

/**
 * Returns the maximum number of workspaces allowed for a given plan
 */
export function getMaxWorkspaceLimit(plan: string = "free"): number {
  const limits: Record<string, number> = {
    free: 3,
    pro: 5,
    scale: 10,
  };

  return limits[plan] || 0;
}

/**
 * Creates a new workspace for the authenticated user
 * @param name The name of the workspace to create
 * @returns The created workspace or an error object
 */
export async function createWorkspace(name: string): Promise<Workspace | { error: string }> {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    // Get user document to check plan limits
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      throw new Error("User document does not exist");
    }

    const userData = userDocSnap.data();
    const userPlan = userData.plan || "free";
    const maxWorkspaces = getMaxWorkspaceLimit(userPlan);
    const currentWorkspacesNumber = userData.workspacesNumber || 0;

    // Check if user has reached their workspace limit
    if (currentWorkspacesNumber >= maxWorkspaces) {
      return {
        error: `You have reached the maximum number of workspaces for your plan (${maxWorkspaces}). Please upgrade your plan to create more workspaces.`,
      };
    }

    // Check if a workspace with this name already exists for the user
    const existingQuery = query(
      collection(db, "workspaces"),
      where("members", "array-contains", userId),
      where("name", "==", name),
    );

    const existingSnapshots = await getDocs(existingQuery);

    if (!existingSnapshots.empty) {
      const existingDoc = existingSnapshots.docs[0];
      const existingData = existingDoc.data();
      return {
        id: existingDoc.id,
        name: existingData.name,
        ownerId: existingData.ownerId,
        createdAt: existingData.createdAt,
        members: existingData.members || [existingData.ownerId],
      };
    }

    // Create the new workspace
    const workspace = {
      name,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      members: [userId], // Initialize with owner as first member
    };

    // Increment the user's workspace count
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      remainingWorkspaces: increment(-1),
    });

    // Add the workspace to Firestore
    const docRef = await addDoc(collection(db, "workspaces"), workspace);

    return {
      id: docRef.id,
      ...workspace,
    };
  } catch (error) {
    console.error("Error in createWorkspace:", error);
    throw error;
  }
}

/**
 * Retrieves all workspaces that a user is a member of
 * @param userId The ID of the user
 * @returns Array of workspaces
 */
export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  try {
    const workspacesRef = collection(db, "workspaces");
    const q = query(workspacesRef, where("members", "array-contains", userId));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        createdAt: data.createdAt,
        members: data.members || [data.ownerId], // Fallback for legacy workspaces
      };
    });
  } catch (error) {
    console.error("Error getting user workspaces:", error);
    return [];
  }
}

/**
 * Deletes a workspace if the user is the owner
 * @param workspaceId The ID of the workspace to delete
 * @returns Boolean indicating success or failure
 */
export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error("User is not authenticated");
    }

    // Check if the user is the owner
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      throw new Error("Workspace does not exist");
    }

    const workspaceData = workspaceSnap.data();
    if (workspaceData.ownerId !== userId) {
      throw new Error("Access denied: Only the workspace owner can delete it");
    }

    // Delete the workspace
    await deleteDoc(workspaceRef);

    // Decrement the user's workspace count
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      remainingWorkspaces: increment(1),
    });

    return true;
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return false;
  }
}

/**
 * Updates the name of a workspace
 * @param workspaceId The ID of the workspace
 * @param newName The new name for the workspace
 * @param userId The ID of the user making the change
 * @returns Boolean indicating success or failure
 */
export async function updateWorkspaceName(
  workspaceId: string,
  newName: string,
  userId: string,
): Promise<boolean> {
  try {
    // Check if the user is the owner
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      return false;
    }

    const workspaceData = workspaceSnap.data();
    // Only the owner can update the workspace name
    if (workspaceData.ownerId !== userId) {
      console.error("Access denied: Only the workspace owner can update the name");
      return false;
    }

    await updateDoc(workspaceRef, {
      name: newName,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error updating workspace name:", error);
    return false;
  }
}

/**
 * Checks if a user has access to a workspace
 * @param workspaceId The ID of the workspace
 * @param userId The ID of the user
 * @returns Boolean indicating if the user has access
 */
export async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  try {
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      return false;
    }

    const workspaceData = workspaceSnap.data();
    return workspaceData.members?.includes(userId) || false;
  } catch (error) {
    console.error("Error checking workspace access:", error);
    return false;
  }
}

/**
 * Invites a user to a workspace
 * @param workspaceId The ID of the workspace
 * @param email The email of the user to invite
 * @param inviterId The ID of the user sending the invitation
 * @returns The created invitation or null if failed
 */
export async function inviteUserToWorkspace(
  workspaceId: string,
  email: string,
  inviterId: string,
): Promise<WorkspaceInvite | null> {
  try {
    // Check if the inviter has access to the workspace
    const hasAccess = await checkWorkspaceAccess(workspaceId, inviterId);
    if (!hasAccess) {
      console.error("Access denied: User does not have access to this workspace");
      return null;
    }

    const invite = {
      workspaceId,
      email: email.toLowerCase(),
      status: "pending",
      createdAt: new Date().toISOString(),
      inviterId,
    };

    const docRef = await addDoc(collection(db, "workspace_invites"), invite);
    return { id: docRef.id, ...invite } as WorkspaceInvite;
  } catch (error) {
    console.error("Error inviting user to workspace:", error);
    return null;
  }
}

/**
 * Gets all pending invites for a workspace
 * @param workspaceId The ID of the workspace
 * @param userId The ID of the user requesting the invites
 * @returns Array of workspace invites
 */
export async function getWorkspaceInvites(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceInvite[]> {
  try {
    // Check if the user has access to the workspace
    const hasAccess = await checkWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      console.error("Access denied: User does not have access to this workspace");
      return [];
    }

    const invitesRef = collection(db, "workspace_invites");
    const q = query(
      invitesRef,
      where("workspaceId", "==", workspaceId),
      where("status", "==", "pending"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as WorkspaceInvite),
    );
  } catch (error) {
    console.error("Error getting workspace invites:", error);
    return [];
  }
}

/**
 * Updates the members of a workspace (add or remove)
 * @param workspaceId The ID of the workspace
 * @param userId The ID of the user making the change
 * @param targetUserId The ID of the user to add or remove
 * @param action Whether to add or remove the user
 * @returns Boolean indicating success or failure
 */
export async function updateWorkspaceMembers(
  workspaceId: string,
  userId: string,
  targetUserId: string,
  action: "add" | "remove",
): Promise<boolean> {
  try {
    // Check if the user has access to modify members
    const workspaceRef = doc(db, "workspaces", workspaceId);
    const workspaceSnap = await getDoc(workspaceRef);

    if (!workspaceSnap.exists()) {
      return false;
    }

    const workspaceData = workspaceSnap.data();
    // Only workspace owner can remove members, but members can add other members
    if (action === "remove" && workspaceData.ownerId !== userId) {
      console.error("Access denied: Only the workspace owner can remove members");
      return false;
    }

    if (action === "add" && !workspaceData.members.includes(userId)) {
      console.error("Access denied: User is not a member of this workspace");
      return false;
    }

    await updateDoc(workspaceRef, {
      members: action === "add" ? arrayUnion(targetUserId) : arrayRemove(targetUserId),
    });
    return true;
  } catch (error) {
    console.error(`Error ${action === "add" ? "adding" : "removing"} workspace member:`, error);
    return false;
  }
}
