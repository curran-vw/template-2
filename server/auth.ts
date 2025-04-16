"use server";

import { adminAuth, adminDb } from "../lib/firebase-admin";
import { cookies } from "next/headers";
import { User } from "@/lib/types";
import { redirect } from "next/navigation";
import { Workspace } from "@/types/workspace";
import { WelcomeAgent } from "@/types/welcome-agent";
// Create session after successful authentication
export async function createSessionCookie(idToken: string) {
  try {
    // Set session expiration to 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Create the session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Set the cookie
    cookies().set("token", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating session:", error);
    return { error: "Error creating session" };
  }
}

// Logout user
export async function logoutUser() {
  cookies().delete("token");
}

// Get authenticated user
export async function getAuthenticatedUser() {
  try {
    const sessionCookie = cookies().get("token")?.value;
    if (!sessionCookie) {
      return { user: null };
    }

    // Verify the session cookie
    const decodedClaim = await adminAuth.verifySessionCookie(sessionCookie);
    const userId = decodedClaim.uid;

    // Get user data
    const userDoc = await adminDb.collection("users").doc(userId).get();

    let user: any;

    if (!userDoc.exists) {
      const newUser = {
        id: userId,
        email: decodedClaim.email!,
        plan: "free",
        usage: {
          emailSent: 0,
          agents: 0,
          connectedGmailAccounts: 0,
          workspaces: 0,
        },
        limits: {
          emailSent: 1000,
          agents: 1,
          connectedGmailAccounts: 1,
          workspaces: 1,
        },
        stripeCustomerId: null,
        createdAt: new Date().toISOString(),
      };

      await adminDb.collection("users").doc(userId).set(newUser);
      await adminDb.collection("workspaces").add({
        name: decodedClaim.name + "'s Workspace",
        createdAt: new Date().toISOString(),
        members: [userId],
        ownerId: userId,
      });

      user = newUser;
    } else {
      user = userDoc.data();
    }

    // // Get user's workspaces
    // const workspacesSnapshot = await adminDb
    //   .collection("workspaces")
    //   .where("members", "array-contains", userId)
    //   .get();

    // const workspaces = workspacesSnapshot.docs.map((doc) => ({
    //   id: doc.id,
    //   ...doc.data(),
    // }));

    // // Get workspace agents
    // const activeWorkspaceId = await getActiveWorkspaceCookie();

    // const agentsSnapshot = await adminDb
    //   .collection("welcomeAgents")
    //   .where("workspaceId", "==", activeWorkspaceId || workspaces[0].id)
    //   .get();

    // const agents = agentsSnapshot.docs.map((doc) => ({
    //   id: doc.id,
    //   ...doc.data(),
    // }));

    return {
      user: {
        ...user,
        photoURL: decodedClaim.picture as string,
        displayName: decodedClaim.name as string,
      },
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return { user: null };
  }
}

// Require authentication or redirect
export async function requireAuth() {
  const { user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

// Set active workspace cookie
export async function setActiveWorkspaceCookie(workspaceId: string) {
  cookies().set("activeWorkspace", workspaceId, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

// Get active workspace cookie
export async function getActiveWorkspaceCookie() {
  return cookies().get("activeWorkspace")?.value;
}
