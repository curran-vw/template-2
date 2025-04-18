"use server";

import { adminDb } from "../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/firebase/auth-utils";

export async function createWorkspace({ name }: { name: string }) {
  const user = await requireAuth();

  try {
    if (!name.trim()) {
      return { error: "Workspace name cannot be empty" };
    }

    // Get plan from database
    const planDoc = await adminDb.collection("plans").doc(user.plan).get();
    const planData = planDoc.data();

    // Check if user has reached their workspace limit
    if (user.usage.workspaces >= planData?.workspaces) {
      return {
        error: `You have reached the maximum number of workspaces for your plan (${planData?.workspaces}). Please upgrade your plan to create more workspaces.`,
      };
    }

    // Check if a workspace with this name already exists for the user
    const existingQuery = adminDb
      .collection("workspaces")
      .where("members", "array-contains", user.id)
      .where("name", "==", name);

    const existingSnapshots = await existingQuery.get();

    // If the workspace already exists, return it
    if (!existingSnapshots.empty) {
      return {
        error: "A workspace with this name already exists",
      };
    }

    // Add the workspace to Firestore

    const workspace = {
      name,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
      members: [user.id],
    };
    const docRef = await adminDb.collection("workspaces").add(workspace);

    // Decrement the user's remaining workspaces count
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      "usage.workspaces": FieldValue.increment(1),
    });

    return {
      success: "Workspace created successfully",
      workspace: {
        id: docRef.id,
        name,
        ownerId: user.id,
        createdAt: new Date().toISOString(),
        members: [user.id],
      },
    };
  } catch (error) {
    console.error("Error in createWorkspace:", error);
    return { error: "An error occurred while creating the workspace" };
  }
}

export async function getUserWorkspaces() {
  const user = await requireAuth();
  try {
    const workspacesRef = adminDb.collection("workspaces");
    const workspacesSnapshot = await workspacesRef
      .where("members", "array-contains", user.id)
      .get();

    const workspaces = workspacesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        createdAt: data.createdAt,
        members: data.members,
      };
    });
    return { workspaces };
  } catch (error) {
    console.error("Error getting user workspaces:", error);
    return { error: "An error occurred while getting the user workspaces", workspaces: [] };
  }
}

export async function deleteWorkspace({ workspaceId }: { workspaceId: string }) {
  const user = await requireAuth();

  try {
    if (!workspaceId) {
      return { error: "Workspace ID is required" };
    }

    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const workspaceSnap = await workspaceRef.get();

    if (!workspaceSnap.exists) {
      return { error: "Workspace does not exist" };
    }

    const workspaceData = workspaceSnap.data();
    if (workspaceData?.ownerId !== user.id) {
      return { error: "Access denied: Only the workspace owner can delete it" };
    }

    // Check if this is the last workspace
    const workspacesRef = adminDb.collection("workspaces");
    const q = workspacesRef.where("members", "array-contains", user.id);
    const querySnapshot = await q.get();
    if (querySnapshot.size === 1) {
      return { error: "You must have at least one workspace" };
    }

    // Delete the workspace
    await workspaceRef.delete();

    // Increment the user's remaining workspaces count
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      "usage.workspaces": FieldValue.increment(-1),
    });

    return { success: "Workspace deleted successfully" };
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return { error: "An error occurred while deleting the workspace" };
  }
}

export async function updateWorkspaceName({
  workspaceId,
  newName,
}: {
  workspaceId: string;
  newName: string;
}) {
  const user = await requireAuth();
  try {
    if (!newName.trim()) {
      return { error: "Workspace name cannot be empty" };
    }

    if (!workspaceId) {
      return { error: "Workspace ID is required" };
    }

    // Check if the user is the owner
    const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
    const workspaceSnap = await workspaceRef.get();

    if (!workspaceSnap.exists) {
      return { error: "Workspace does not exist" };
    }

    const workspaceData = workspaceSnap.data();
    // Only the owner can update the workspace name
    if (workspaceData?.ownerId !== user.id) {
      return { error: "Access denied: Only the workspace owner can update the name" };
    }

    // Check if a workspace with this name already exists for the user
    const existingQuery = adminDb
      .collection("workspaces")
      .where("members", "array-contains", user.id)
      .where("name", "==", newName);

    const existingSnapshots = await existingQuery.get();

    if (!existingSnapshots.empty) {
      return { error: "A workspace with this name already exists" };
    }

    await workspaceRef.update({
      name: newName,
      updatedAt: new Date().toISOString(),
    });

    return { success: "Workspace name updated successfully" };
  } catch (error) {
    console.error("Error updating workspace name:", error);
    return { error: "An error occurred while updating the workspace name" };
  }
}
