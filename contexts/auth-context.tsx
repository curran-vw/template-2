"use client";

import { createContext, useEffect, useState, useContext, useCallback } from "react";
import { User } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { stripeUtils } from "../firebase/stripe-utils";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { createWorkspace, getMaxWorkspaceLimit } from "../firebase/workspace-utils";
import { userUtils } from "../firebase/user-utils";

export type AuthUser = User & {
  plan: string;
  remainingWorkspaces: number;
  remainingConnectedGmailAccounts: number;
  remainingEmailSent: number;
  remainingAgents: number;
};

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkedWorkspace, setCheckedWorkspace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userPlan = await stripeUtils.getUserPlan();
        const userData = await userUtils.getUserData();
        const authUser = {
          ...firebaseUser,
          ...userData,
          plan: userPlan,
        };

        console.log("authUser", authUser);

        // Set the user first so the UI can update
        setUser(authUser);
        // setUser({ ...authUser, plan: userPlan });
      } else {
        setUser(null);
        // setCheckedWorkspace(null)
        router.push("/sign-in");
      }

      // Check if the user needs a default workspace
      if (firebaseUser) {
        await checkAndCreateDefaultWorkspace(firebaseUser);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkAndCreateDefaultWorkspace = useCallback(async (user: User) => {
    // Skip if we've already checked for this user
    if (checkedWorkspace === user.uid) {
      return;
    }

    try {
      // Check if the user already has workspaces
      const workspacesQuery = query(
        collection(db, "workspaces"),
        where("members", "array-contains", user.uid),
      );
      const querySnapshot = await getDocs(workspacesQuery);

      // If user has no workspaces, create a default one for them
      if (querySnapshot.empty) {
        const displayName = user.displayName || "User";
        const workspaceName = `${displayName}'s Workspace`;

        try {
          const result = await createWorkspace(workspaceName);

          if ("error" in result) {
            console.error(result.error);
          } else {
            // Mark that we've checked workspace creation for this user
            setCheckedWorkspace(user.uid);
          }
        } catch (createError) {
          console.error("Error creating default workspace:", createError);
        }
      } else {
        // Mark that we've checked workspace creation for this user
        setCheckedWorkspace(user.uid);
      }
    } catch (err) {
      console.error("Error checking workspaces:", err);
    }
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser }}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
