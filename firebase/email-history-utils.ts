"use server";

import { adminDb, adminAuth } from "../lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as gmailUtils from "./gmail-utils";
import { requireAuth } from "@/firebase/auth-utils";

export type EmailRecord = {
  id: string;
  recipientEmail: string;
  agentId: string;
  agentName: string;
  workspaceId: string;
  subject: string;
  body: string;
  status: "under_review" | "sent" | "denied" | "failed";
  gmailConnectionId: string;
  userInfo: string;
  businessInfo: string;
  createdAt: string;
  updatedAt: string;
};

export async function getEmailHistory({
  workspaceId,
  agentId = null,
  page = 1,
  pageSize = 10,
}: {
  workspaceId: string;
  agentId?: string | null;
  page?: number;
  pageSize?: number;
}) {
  await requireAuth();
  try {
    // Create query constraints array
    let query = adminDb
      .collection("email_history")
      .where("workspaceId", "==", workspaceId)
      .orderBy("createdAt", "desc");

    // Add agentId constraint if provided
    if (agentId) {
      query = query.where("agentId", "==", agentId);
    }

    const snapshot = await query.get();
    const totalEmails = snapshot.docs.length;

    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const paginatedDocs = snapshot.docs.slice(startIndex, startIndex + pageSize);

    const emails = paginatedDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EmailRecord[];

    return {
      emails,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalEmails / pageSize),
        totalEmails,
        hasNextPage: startIndex + pageSize < totalEmails,
        hasPreviousPage: page > 1,
      },
      success: "Email history retrieved successfully",
    };
  } catch (error) {
    console.error("Error fetching email history:", error);
    return { error: "Failed to fetch email history" };
  }
}

export async function updateEmailStatusToSent({ emailId }: { emailId: string }) {
  await requireAuth();

  try {
    const docRef = adminDb.collection("email_history").doc(emailId);
    const emailDoc = await docRef.get();

    if (!emailDoc.exists) {
      return { error: "Email record not found" };
    }

    const emailData = emailDoc.data();

    if (emailData?.status === "under_review") {
      if (!emailData?.gmailConnectionId) {
        return { error: "No Gmail connection ID found for this email" };
      }

      const connection = await gmailUtils.getConnectionById({
        connectionId: emailData.gmailConnectionId,
      });

      if (!connection) {
        return { error: "Gmail connection no longer exists" };
      }

      const { error: sendError } = await gmailUtils.sendEmail({
        connectionId: emailData.gmailConnectionId,
        to: emailData.recipientEmail,
        subject: emailData.subject,
        body: emailData.body,
        isTest: false,
      });

      if (sendError) {
        return { error: sendError };
      }
      
      await docRef.update({
        status: "sent",
        updatedAt: new Date().toLocaleDateString(),
      });

      return { success: "Email sent successfully" };
    }

    return { success: "Email is already sent" };
  } catch (error) {
    console.error("Error updating email status:", error);
    return { error: "Failed to update email status" };
  }
}

export async function getEmailById({ emailId }: { emailId: string }) {
  await requireAuth();

  try {
    const emailRef = adminDb.collection("email_history").doc(emailId);
    const emailDoc = await emailRef.get();

    if (emailDoc.exists) {
      return {
        email: {
          id: emailDoc.id,
          ...emailDoc.data(),
        } as EmailRecord & {
          id: string;
        },
      };
    }

    return { error: "Email not found" };
  } catch (error) {
    console.error("Error fetching email:", error);
    return { error: "Failed to fetch email" };
  }
}

export async function createEmailRecord({
  recipientEmail,
  agentId,
  agentName,
  workspaceId,
  subject,
  body,
  status,
  gmailConnectionId,
  userInfo,
  businessInfo,
}: {
  recipientEmail: string;
  agentId: string;
  agentName: string;
  workspaceId: string;
  subject: string;
  body: string;
  status: "sent" | "under_review";
  gmailConnectionId: string;
  userInfo: string;
  businessInfo: string;
}) {
  try {
    // Create base record with required fields
    const emailRecord: Record<string, any> = {
      recipientEmail,
      agentId,
      agentName,
      workspaceId,
      subject,
      body,
      status,
      updatedAt: new Date().toLocaleDateString(),
      createdAt: new Date().toLocaleDateString(),
      userInfo,
      businessInfo,
      gmailConnectionId,
    };

    const docRef = await adminDb.collection("email_history").add(emailRecord);
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error("Error creating email record:", error);
    return { error: "Failed to create email record" };
  }
}
