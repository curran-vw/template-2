"use server";

import { adminDb, adminAuth } from "../lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as gmailUtils from "./gmail-utils";
import { requireAuth } from "@/server/auth";

export interface EmailRecord {
  id: string;
  recipientEmail: string;
  status: "sent" | "under_review" | "denied" | "failed";
  createdAt: Date;
  agentId: string;
  agentName: string;
  subject: string;
}

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
      createdAt: doc.data().createdAt.toDate(),
    })) as EmailRecord[];

    return {
      emails: emails.map((email) => ({
        id: email.id,
        recipientEmail: email.recipientEmail,
        status: email.status,
        createdAt: email.createdAt,
        agentId: email.agentId,
        agentName: email.agentName,
        subject: email.subject,
      })),
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

export async function updateEmailStatus({
  emailId,
  status,
  workspaceId,
}: {
  emailId: string;
  status: "sent" | "denied";
  workspaceId: string;
}) {
  const user = await requireAuth();

  try {
    const docRef = adminDb.collection("email_history").doc(emailId);
    const emailDoc = await docRef.get();

    if (!emailDoc.exists) {
      return { error: "Email record not found" };
    }

    const emailData = emailDoc.data();

    // If approving the email, send it
    if (status === "sent") {
      if (!emailData?.gmailConnectionId) {
        return { error: "No Gmail connection ID found for this email" };
      }

      try {
        // First verify the Gmail connection is still valid
        const connection = await gmailUtils.getConnection(emailData.gmailConnectionId);

        if (!connection) {
          return { error: "Gmail connection no longer exists" };
        }

        const { error: sendError } = await gmailUtils.sendEmail({
          workspaceId,
          connectionId: emailData.gmailConnectionId,
          to: emailData.recipientEmail,
          subject: emailData.subject,
          body: emailData.body,
        });

        if (sendError) {
          // If sending fails, mark as failed with detailed error message
          await docRef.update({
            status: "failed",
            error: sendError,
            updatedAt: Timestamp.now(),
          });
          return { error: sendError };
        }

        // Update the status and add sent timestamp
        await docRef.update({
          status,
          updatedAt: Timestamp.now(),
          sentAt: Timestamp.now(),
        });
      } catch (sendError) {
        console.error("Error sending email:", sendError);
        // If sending fails, mark as failed with detailed error message
        await docRef.update({
          status: "failed",
          error: sendError instanceof Error ? sendError.message : "Failed to send email",
          updatedAt: Timestamp.now(),
        });
        return { error: "Failed to send email" };
      }
    } else {
      // Just update status for non-send actions (like deny)
      await docRef.update({
        status,
        updatedAt: Timestamp.now(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating email status:", error);
    return { error: "Failed to update email status" };
  }
}

export async function getEmailById({ emailId }: { emailId: string }) {
  const user = await requireAuth();

  try {
    const emailRef = adminDb.collection("email_history").doc(emailId);
    const emailDoc = await emailRef.get();

    if (emailDoc.exists) {
      return {
        email: {
          id: emailDoc.id,
          ...emailDoc.data(),
          createdAt: emailDoc.data()?.createdAt.toDate(),
        } as EmailRecord,
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
  status = "under_review",
  gmailConnectionId,
  error,
  userInfo,
  businessInfo,
}: {
  recipientEmail: string;
  agentId: string;
  agentName: string;
  workspaceId: string;
  subject: string;
  body: string;
  status?: "sent" | "under_review" | "denied" | "failed";
  gmailConnectionId?: string;
  error?: string;
  userInfo?: string;
  businessInfo?: string;
}) {
  const user = await requireAuth();

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
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      userInfo,
      businessInfo,
    };

    // Only add optional fields if they are defined
    if (gmailConnectionId) {
      emailRecord.gmailConnectionId = gmailConnectionId;
    }

    if (error) {
      emailRecord.error = error;
    }

    const docRef = await adminDb.collection("email_history").add(emailRecord);
    return { id: docRef.id, success: true };
  } catch (error) {
    console.error("Error creating email record:", error);
    return { error: "Failed to create email record" };
  }
}
