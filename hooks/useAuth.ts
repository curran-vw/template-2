import { AuthUser, useAuthContext } from "../contexts/auth-context";
import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { useRouter } from "next/navigation";
import { stripeUtils } from "../firebase/stripe-utils";
import { doc, setDoc } from "firebase/firestore";
import { userUtils } from "@/firebase/user-utils";

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const authContext = useAuthContext();
  const router = useRouter();

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);

      if (result.user) {
        const userPlan = await stripeUtils.getUserPlan();
        const newUserData = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          plan: userPlan,
          remainingWorkspaces: userUtils.getMaxWorkspaceLimit(userPlan),
          remainingConnectedGmailAccounts: userUtils.getMaxConnectedGmailAccounts(userPlan),
          remainingEmailSent: userUtils.getMaxEmailSent(userPlan),
          remainingAgents: userUtils.getMaxAgentLimit(userPlan),
        };

        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        if (isNewUser) {
          await setDoc(doc(db, "users", newUserData.uid), newUserData);
          router.push("/subscribe");
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
      await firebaseSignOut(auth);
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
