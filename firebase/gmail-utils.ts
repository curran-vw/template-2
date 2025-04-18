"use server";

import { requireAuth } from "@/firebase/auth-utils";
import { adminDb } from "../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { encode } from "js-base64";

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface GmailConnection {
  id: string;
  email: string;
  name: string;
  tokens: GmailTokens;
  workspaceId: string;
  userId: string;
  isActive: boolean;
}

export async function saveGmailConnection({
  workspaceId,
  email,
  name,
  tokens,
}: {
  workspaceId: string;
  email: string;
  name: string;
  tokens: GmailTokens;
}) {
  const user = await requireAuth();

  try {
    // check if the user has reached the limit
    if (user.limits.connectedGmailAccounts <= user.usage.connectedGmailAccounts) {
      return { error: "You have reached the limit of connected Gmail accounts" };
    }

    // check if the user has already connected this gmail account
    const connectionRef = await adminDb
      .collection("gmail_connections")
      .where("email", "==", email)
      .where("workspaceId", "==", workspaceId)
      .where("userId", "==", user.id)
      .get();

    if (connectionRef.docs.length > 0) {
      return { error: "You have already connected this Gmail account" };
    }

    const newConnectionRef = adminDb.collection("gmail_connections").doc();
    const connectionData: GmailConnection = {
      id: newConnectionRef.id,
      email,
      name,
      tokens,
      workspaceId,
      userId: user.id,
      isActive: true,
    };

    await newConnectionRef.set(connectionData);

    // Update user remaining connected gmail accounts
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      "usage.connectedGmailAccounts": FieldValue.increment(1),
    });

    return {
      success: "Gmail connection saved successfully",
      connection: connectionData,
    };
  } catch (error) {
    console.error("Error in saveGmailConnection:", error);
    return { error: "An error occurred while saving Gmail connection" };
  }
}

export async function getWorkspaceConnections({ workspaceId }: { workspaceId: string }) {
  const user = await requireAuth();

  try {
    const connectionsRef = adminDb.collection("gmail_connections");
    const q = connectionsRef.where("workspaceId", "==", workspaceId).where("userId", "==", user.id);
    const snapshot = await q.get();

    const connections = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: "Connections retrieved successfully",
      connections: connections as GmailConnection[],
    };
  } catch (error) {
    console.error("Error in getWorkspaceConnections:", error);
    return { error: "An error occurred while retrieving Gmail connections" };
  }
}

export async function removeConnection({ connectionId }: { connectionId: string }) {
  const user = await requireAuth();

  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const connection = await connectionRef.get();

    if (!connection.exists) {
      return { error: "Connection not found" };
    }

    const connectionData = connection.data() as GmailConnection;

    // Check if user has permission to remove this connection
    if (connectionData.userId !== user.id) {
      return { error: "You don't have permission to remove this connection" };
    }

    await connectionRef.delete();

    // Decrement the user's remaining connected gmail accounts
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      "usage.connectedGmailAccounts": FieldValue.increment(-1),
    });

    return { success: "Connection removed successfully" };
  } catch (error) {
    console.error("Error removing connection:", error);
    return { error: "An error occurred while removing the connection" };
  }
}

export async function refreshTokenIfNeeded({ connectionId }: { connectionId: string }) {
  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const connection = await connectionRef.get();

    if (!connection.exists) {
      return { error: "Gmail connection not found" };
    }

    const data = connection.data() as GmailConnection;
    const expiryDate = data.tokens.expires_in;
    const tokenExpiryTime = data.tokens.expires_in * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    // If token is expired or will expire in the next 5 minutes, refresh it
    if (currentTime >= tokenExpiryTime - 300000) {
      // 5 minutes buffer
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: data.tokens.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        const newTokens = await response.json();

        if (!response.ok) {
          // If we get an invalid_grant error, the refresh token is no longer valid
          if (newTokens.error === "invalid_grant") {
            await connectionRef.update({
              isActive: false,
            });
            return {
              error: "Gmail authorization has expired. Please reconnect your Gmail account.",
            };
          }
          return { error: `Failed to refresh token: ${newTokens.error}` };
        }

        if (!newTokens.access_token) {
          return { error: "No access token received from refresh" };
        }

        // Update tokens in database with the new expiry time
        await connectionRef.update({
          tokens: {
            ...newTokens,
            expires_in: Math.floor(Date.now() / 1000) + newTokens.expires_in,
          },
          isActive: true,
        });

        console.log("Token refreshed successfully");
        return { accessToken: newTokens.access_token };
      } catch (error) {
        console.error("Error refreshing token:", error);
        return { error: "Failed to refresh token. Please try reconnecting your Gmail account." };
      }
    }

    return { accessToken: data.tokens.access_token };
  } catch (error) {
    console.error("Error in refreshTokenIfNeeded:", error);
    return { error: "An error occurred while refreshing the token" };
  }
}

export async function sendEmail({
  connectionId,
  to,
  subject,
  body,
  isTest,
}: {
  connectionId: string;
  to: string;
  subject: string;
  body: string;
  isTest: boolean;
}) {
  try {
    // Get the connection details
    const { connection } = await getConnectionById({ connectionId });
    if (!connection) {
      return {
        error: "No Gmail connection found",
      };
    }

    // Get fresh access token
    const refreshResult = await refreshTokenIfNeeded({ connectionId });
    if (refreshResult.error) {
      return { error: refreshResult.error };
    }

    const accessToken = refreshResult.accessToken;

    // Construct the email in RFC 822 format with proper From header
    const emailContent = [
      'Content-Type: text/html; charset="UTF-8"',
      "MIME-Version: 1.0",
      `To: ${to}`,
      `From: "${connection?.name}" <${connection?.email}>`,
      `Subject: ${subject}`,
      "",
      body,
    ].join("\r\n");

    // Encode the email content
    const encodedEmail = encode(emailContent)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send the email via Gmail API
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Goog-AuthUser": "0",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
      return { error: "Failed to send email" };
    }

    if (!isTest) {
      // Update user email sent number
      const userRef = adminDb.collection("users").doc(connection.userId);
      await userRef.update({
        remainingEmailSent: FieldValue.increment(-1),
      });
    }

    return { success: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending email:", error);
    return { error: "An error occurred while sending the email" };
  }
}

export async function testEmailConnection({ connectionId }: { connectionId: string }) {
  await requireAuth();

  try {
    const { connection } = await getConnectionById({ connectionId });
    if (!connection) {
      return { error: "No Gmail connection found" };
    }

    // Send a test email
    const emailResult = await sendEmail({
      connectionId,
      to: connection.email,
      subject: "Welcome Agent - Test Connection",
      body: `
        <p>This is a test email from your Welcome Agent.</p>
        <p>If you're receiving this, your email connection is working correctly!</p>
        <p>You can now start using this email account to send welcome emails to your new signups.</p>
        `,
      isTest: true,
    });

    if (emailResult.error) {
      return { error: emailResult.error };
    }

    return { success: "Test email sent successfully" };
  } catch (error) {
    return { error: "An error occurred while testing the email connection" };
  }
}

export async function getConnectionByEmail({ email }: { email: string }) {
  try {
    const connectionsRef = adminDb.collection("gmail_connections");
    const q = connectionsRef.where("email", "==", email).where("isActive", "==", true);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return { error: "No connection found for this email" };
    }

    const connection = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as GmailConnection;

    return { success: "Connection retrieved successfully", connection };
  } catch (error) {
    console.error("Error getting connection by email:", error);
    return { error: "An error occurred while retrieving the connection" };
  }
}

export async function getConnectionById({ connectionId }: { connectionId: string }) {
  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const snapshot = await connectionRef.get();

    if (!snapshot.exists) {
      return { error: "Connection not found" };
    }

    const data = snapshot.data();
    return {
      success: "Connection retrieved successfully",
      connection: {
        id: snapshot.id,
        ...data,
      } as GmailConnection,
    };
  } catch (error) {
    console.error("Error getting connection by ID:", error);
    return { error: "An error occurred while retrieving the connection" };
  }
}

export async function toggleConnectionStatus({
  connectionId,
  isActive,
}: {
  connectionId: string;
  isActive: boolean;
}) {
  await requireAuth();

  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);

    // Get current connection data
    const { connection } = await getConnectionById({ connectionId });
    if (!connection) {
      return { error: "No Gmail connection found" };
    }

    // Update connection with new tokens and mark as active
    await connectionRef.update({
      isActive,
    });

    return { success: "Connection reactivated successfully" };
  } catch (error) {
    console.error("Error reactivating connection:", error);
    return { error: "An error occurred while reactivating the connection" };
  }
}
