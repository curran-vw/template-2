import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

export const userUtils = {
  async getUserData() {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        remainingWorkspaces: data.remainingWorkspaces,
        remainingConnectedGmailAccounts: data.remainingConnectedGmailAccounts,
        remainingEmailSent: data.remainingEmailSent,
        remainingAgents: data.remainingAgents,
      };
    } else {
      throw new Error("User not found");
    }
  },

  getMaxWorkspaceLimit(plan: string) {
    const limits: Record<string, number> = {
      free: 3,
      pro: 5,
      scale: 10,
    };

    return limits[plan] || 0;
  },

  getMaxConnectedGmailAccounts(plan: string) {
    const limits: Record<string, number> = {
      free: 1,
      pro: 5,
      scale: 10,
    };

    return limits[plan] || 0;
  },

  getMaxEmailSent(plan: string) {
    const limits: Record<string, number> = {
      free: 100,
      pro: 1000,
      scale: 10000,
    };

    return limits[plan] || 0;
  },

  getMaxAgentLimit(plan: string) {
    const limits: Record<string, number> = {
      free: 1,
      pro: 5,
      scale: 10,
    };

    return limits[plan] || 0;
  },
};
