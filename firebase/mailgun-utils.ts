"use server";

import { adminDb, adminAuth } from "../lib/firebase-admin";
import { nanoid } from "nanoid";
import { getAuthenticatedUser } from "../server/auth";
interface NotificationEmail {
  id: string;
  agentId: string;
  workspaceId: string;
  emailLocalPart: string; // e.g., "agent-123abc"
  createdAt: number;
  isActive: boolean;
}

export async function generateNotificationEmail({
  agentId,
  workspaceId,
}: {
  agentId: string;
  workspaceId: string;
}) {
  const user = await getAuthenticatedUser();
  try {
    // Generate a unique local part for the email address
    const emailLocalPart = `agent-${nanoid(6)}`; // e.g., "agent-x7f2p9"

    const notificationEmail: NotificationEmail = {
      id: nanoid(),
      agentId,
      workspaceId,
      emailLocalPart,
      createdAt: Date.now(),
      isActive: true,
    };

    // Save to Firestore
    const emailRef = adminDb.collection("notification_emails").doc(notificationEmail.id);
    await emailRef.set(notificationEmail);

    return { success: "Notification email generated successfully", notificationEmail };
  } catch (error) {
    console.error("Error generating notification email:", error);
    return { error: "Failed to generate notification email" };
  }
}

export async function getNotificationEmail({
  agentId,
  workspaceId,
}: {
  agentId: string;
  workspaceId: string;
}) {
  const user = await getAuthenticatedUser();
  try {
    const emailsRef = adminDb.collection("notification_emails");
    const q = emailsRef
      .where("agentId", "==", agentId)
      .where("workspaceId", "==", workspaceId)
      .where("isActive", "==", true);

    const snapshot = await q.get();

    if (snapshot.empty) {
      const { success, error, notificationEmail } = await generateNotificationEmail({
        agentId,
        workspaceId,
      });

      if (success) {
        return { notificationEmail, success: "Notification email generated successfully" };
      } else {
        return { error: error };
      }
    }

    const notificationEmail = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as NotificationEmail;

    return { notificationEmail, success: "Notification email found successfully" };
  } catch (error) {
    console.error("Error getting notification email:", error);
    return { error: "Failed to get notification email" };
  }
}

export async function findByLocalPart({ localPart }: { localPart: string }) {
  try {
    const emailsRef = adminDb.collection("notification_emails");
    const q = emailsRef.where("emailLocalPart", "==", localPart).where("isActive", "==", true);

    const snapshot = await q.get();

    if (snapshot.empty) {
      return { notificationEmail: null };
    }

    const notificationEmail = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as NotificationEmail;

    return { notificationEmail };
  } catch (error) {
    console.error("Error finding notification email by local part:", error);
    return { error: "Failed to find notification email" };
  }
}
