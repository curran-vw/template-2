"use client";

import { useAuthContext } from "../contexts/auth-context";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/firebase/auth-utils";
import { User } from "@/types/user";

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const authContext = useAuthContext();
  const router = useRouter();

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      if (result.user) {
        // Determine if new user and redirect to subscribe or dashboard
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        if (isNewUser) {
          router.push("/pricing");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const signOut = async () => {
    try {
      // First sign out on client
      await firebaseSignOut(auth);

      // Then clear session on server
      await logoutUser();

      // Redirect to home page
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    user: authContext.user,
    loading: authContext.loading,
    setUser: authContext.setUser,
    signInWithGoogle,
    signOut,
  };
}
