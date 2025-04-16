"use server";

import { GmailTokens, GmailConnection, GmailConnectionStatus } from "@/types/gmail";
import { GMAIL_API_ENDPOINTS, GMAIL_ERROR_CODES, GMAIL_CONNECTION_LIMITS } from "@/types/gmail";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/server/auth";

// Rate limiting map (in-memory, will reset on server restart)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

async function checkRateLimit(connectionId: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - GMAIL_CONNECTION_LIMITS.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

  const limit = rateLimitMap.get(connectionId) || { count: 0, windowStart };

  if (now - limit.windowStart > GMAIL_CONNECTION_LIMITS.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000) {
    // Reset if window has passed
    rateLimitMap.set(connectionId, { count: 1, windowStart: now });
    return true;
  }

  if (limit.count >= GMAIL_CONNECTION_LIMITS.MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  rateLimitMap.set(connectionId, {
    count: limit.count + 1,
    windowStart: limit.windowStart,
  });

  return true;
}

export async function validateTokens(tokens: GmailTokens): Promise<boolean> {
  try {
    const response = await fetch(GMAIL_API_ENDPOINTS.USER_INFO, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error validating Gmail tokens:", error);
    return false;
  }
}

async function refreshTokens(connection: GmailConnection): Promise<GmailTokens | null> {
  try {
    const response = await fetch(GMAIL_API_ENDPOINTS.TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to refresh tokens");
    }

    const newTokens = await response.json();
    return {
      ...connection.tokens,
      access_token: newTokens.access_token,
      expires_in: Date.now() + newTokens.expires_in * 1000,
    };
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    return null;
  }
}

export async function getConnectionStatus(connectionId: string): Promise<GmailConnectionStatus> {
  const user = await requireAuth();

  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const connection = await connectionRef.get();

    if (!connection.exists) {
      return { isActive: false, lastChecked: Date.now(), error: "Connection not found" };
    }

    const data = connection.data() as GmailConnection;

    // Check if connection is marked as inactive
    if (!data.isActive) {
      return { isActive: false, lastChecked: Date.now(), error: data.last_error };
    }

    // Check if tokens are expired
    if (data.tokens.expires_in < Date.now()) {
      const newTokens = await refreshTokens(data);
      if (!newTokens) {
        await connectionRef.update({
          isActive: false,
          last_error: "Failed to refresh tokens",
          error_count: FieldValue.increment(1),
        });
        return { isActive: false, lastChecked: Date.now(), error: "Failed to refresh tokens" };
      }

      await connectionRef.update({
        tokens: newTokens,
        last_refresh: Date.now(),
        error_count: 0,
      });
    }

    // Validate tokens
    const isValid = await validateTokens(data.tokens);
    if (!isValid) {
      await connectionRef.update({
        isActive: false,
        last_error: "Invalid tokens",
        error_count: FieldValue.increment(1),
      });
      return { isActive: false, lastChecked: Date.now(), error: "Invalid tokens" };
    }

    return { isActive: true, lastChecked: Date.now() };
  } catch (error) {
    console.error("Error checking connection status:", error);
    return { isActive: false, lastChecked: Date.now(), error: "Error checking connection status" };
  }
}

export async function sendEmail(
  connectionId: string,
  to: string,
  subject: string,
  body: string,
  test = false,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  try {
    // Check rate limit
    if (!(await checkRateLimit(connectionId))) {
      return { success: false, error: "Rate limit exceeded" };
    }

    // Get connection status
    const status = await getConnectionStatus(connectionId);
    if (!status.isActive) {
      return { success: false, error: status.error || "Connection is inactive" };
    }

    // Get connection details
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const connection = await connectionRef.get();
    const data = connection.data() as GmailConnection;

    // Construct email
    const emailContent = [
      'Content-Type: text/html; charset="UTF-8"',
      "MIME-Version: 1.0",
      `To: ${to}`,
      `From: "${data.name}" <${data.email}>`,
      `Subject: ${subject}`,
      "",
      body,
    ].join("\r\n");

    // Send email
    const response = await fetch(GMAIL_API_ENDPOINTS.SEND_EMAIL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: Buffer.from(emailContent)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, ""),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send email");
    }

    if (!test) {
      // Update user's email count
      const userRef = adminDb.collection("users").doc(user.id);
      await userRef.update({
        remainingEmailSent: FieldValue.increment(-1),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
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
    // Validate tokens
    if (!tokens.access_token || !tokens.refresh_token) {
      return { error: "Invalid Gmail tokens provided" };
    }

    // Test the tokens to ensure they're valid
    const tokensValid = await validateTokens(tokens);
    if (!tokensValid) {
      return {
        error: "Gmail tokens validation failed. Please try reconnecting your Gmail account.",
      };
    }

    const connectionData = {
      email,
      name,
      tokens,
      workspaceId,
      userId: user.id,
      connected_at: Date.now(),
      isActive: true,
      error_count: 0,
    };

    // Check if connection already exists
    const existingConnections = await adminDb
      .collection("gmail_connections")
      .where("workspaceId", "==", workspaceId)
      .where("email", "==", email)
      .get();

    let connectionId: string;

    if (!existingConnections.empty) {
      const existing = existingConnections.docs[0];
      const connectionRef = adminDb.collection("gmail_connections").doc(existing.id);
      await connectionRef.set(connectionData, { merge: true });
      connectionId = existing.id;
    } else {
      const connectionRef = adminDb.collection("gmail_connections").doc();
      await connectionRef.set(connectionData);
      connectionId = connectionRef.id;
    }

    // Update user remaining connected gmail accounts
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      remainingConnectedGmailAccounts: FieldValue.increment(-1),
    });

    return { success: "Gmail connection saved successfully", connectionId };
  } catch (error) {
    console.error("Error in saveGmailConnection:", error);
    return { error: "An error occurred while saving Gmail connection" };
  }
}

export async function getWorkspaceConnections(workspaceId: string) {
  const user = await requireAuth();

  try {
    const connectionsRef = adminDb.collection("gmail_connections");
    const q = connectionsRef.where("workspaceId", "==", workspaceId);
    const snapshot = await q.get();

    const connections = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GmailConnection[];

    return { success: "Connections retrieved successfully", connections };
  } catch (error) {
    console.error("Error in getWorkspaceConnections:", error);
    return { error: "An error occurred while retrieving Gmail connections" };
  }
}

export async function removeConnection(connectionId: string) {
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

    // Increment the user's remaining connected gmail accounts
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      remainingConnectedGmailAccounts: FieldValue.increment(1),
    });

    return { success: "Connection removed successfully" };
  } catch (error) {
    console.error("Error removing connection:", error);
    return { error: "An error occurred while removing the connection" };
  }
}
