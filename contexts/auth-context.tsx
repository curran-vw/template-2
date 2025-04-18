"use client";

import { createContext, useEffect, useState, useContext } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { User } from "@/types/user";
import { createSessionCookie, getAuthenticatedUser } from "@/firebase/auth-utils";
import { getUserWorkspaces } from "@/firebase/workspace-utils";
import { useWorkspaceContext } from "@/contexts/workspace-context";
interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { setWorkspaces, handleSetWorkspaces, setWorkspacesLoading } = useWorkspaceContext();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        await createSessionCookie(idToken);
        const { user } = await getAuthenticatedUser();
        setUser(user);
        setLoading(false);

        const result = await getUserWorkspaces();
        setWorkspaces(result.workspaces);
        handleSetWorkspaces(result.workspaces);
        setWorkspacesLoading(false);
      } else {
        setLoading(false);
        router.push("/sign-in");
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser }}>{children}</AuthContext.Provider>;
}

export const AuthContext = createContext<AuthContextType | null>(null);
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
