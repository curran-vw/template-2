"use server";

import { requireAuth } from "@/server/auth";
import { adminAuth, adminDb } from "../lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { encode } from "js-base64";

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface GmailConnection {
  id: string;
  email: string;
  name: string;
  tokens: GmailTokens;
  workspaceId: string;
  userId: string;
  connected_at: number;
  isActive?: boolean;
}

interface SendEmailParams {
  connectionId: string;
  to: string;
  subject: string;
  body: string;
  workspaceId: string;
  test?: boolean;
}

export async function testGmailTokens(tokens: GmailTokens): Promise<boolean> {
  try {
    // Try a less privileged endpoint first as a fallback
    const profileEndpoint = "https://www.googleapis.com/oauth2/v2/userinfo";

    // Make a simple API call to verify the tokens
    const response = await fetch(profileEndpoint, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Gmail token test failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error testing Gmail tokens:", error);
    return false;
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
  console.log("Saving Gmail connection:", workspaceId, email, name, tokens);
  const user = await requireAuth();

  try {
    // Validate tokens
    if (!tokens.access_token || !tokens.refresh_token) {
      return { error: "Invalid Gmail tokens provided" };
    }

    const connectionData = {
      email,
      name,
      tokens,
      workspaceId,
      userId: user.id,
      connected_at: Date.now(),
      isActive: true,
    };

    const connectionRef = await adminDb.collection("gmail_connections").doc();
    await connectionRef.set(connectionData);

    // Update user remaining connected gmail accounts
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      "usage.connectedGmailAccounts": FieldValue.increment(1),
    });

    return { success: "Gmail connection saved successfully", connectionId: connectionRef.id };
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
    })) as GmailConnection[];

    return { success: "Connections retrieved successfully", connections };
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

export async function refreshTokenIfNeeded({ connectionId }: { connectionId: string }) {
  const user = await requireAuth();

  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const connection = await connectionRef.get();

    if (!connection.exists) {
      return { error: "Gmail connection not found" };
    }

    const data = connection.data() as GmailConnection;
    const expiryDate = data.tokens.expires_in;

    // If token expires in less than 5 minutes, refresh it
    if (expiryDate < Date.now() + 5 * 60 * 1000) {
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

        // Check if refresh was successful before updating the database
        if (!response.ok || !newTokens.access_token) {
          console.error("Token refresh failed:", newTokens);

          // Handle specific error cases
          if (newTokens.error === "invalid_client") {
            console.error(
              "Invalid client credentials. Please check your Google OAuth configuration.",
            );
            // Instead of marking as inactive, try to use the existing token if it's not expired
            if (Date.now() < expiryDate) {
              return { accessToken: data.tokens.access_token };
            }
            return { error: "Google OAuth configuration is invalid. Please contact support." };
          } else if (newTokens.error === "invalid_grant") {
            console.error("Invalid grant. The refresh token may have been revoked.");
            // Instead of marking as inactive, try to use the existing token if it's not expired
            if (Date.now() < expiryDate) {
              return { accessToken: data.tokens.access_token };
            }
            return {
              error: "Gmail authorization has expired. Please reconnect your Gmail account.",
            };
          }

          // For other errors, try to use the existing token if it's not expired
          if (Date.now() < expiryDate) {
            return { accessToken: data.tokens.access_token };
          }

          return { error: `Failed to refresh token: ${newTokens.error || "Unknown error"}` };
        }

        // Update tokens in database
        await connectionRef.update({
          tokens: {
            ...data.tokens,
            access_token: newTokens.access_token,
            expires_in: Date.now() + newTokens.expires_in * 1000,
          },
          isActive: true, // Ensure connection is marked as active
        });

        return { accessToken: newTokens.access_token };
      } catch (error) {
        console.error("Error refreshing token:", error);

        // Try to use the existing token if it's not expired
        if (Date.now() < expiryDate) {
          return { accessToken: data.tokens.access_token };
        }

        // Only mark as inactive if we can't use the existing token
        try {
          await connectionRef.update({
            isActive: false,
          });
        } catch (updateError) {
          console.error("Failed to mark connection as inactive:", updateError);
        }

        return { error: "Gmail authorization has expired. Please reconnect your Gmail account." };
      }
    }

    return { accessToken: data.tokens.access_token };
  } catch (error) {
    console.error("Error in refreshTokenIfNeeded:", error);
    return { error: "An error occurred while refreshing the token" };
  }
}

export async function sendEmail({
  workspaceId,
  connectionId,
  to,
  subject,
  body,
  test,
}: SendEmailParams) {
  const user = await requireAuth();

  try {
    // Get the connection details
    const connectionResult = await getConnectionById({ connectionId });
    if (connectionResult.error) {
      return {
        error: `No Gmail connection found for ID: ${connectionId}.`,
      };
    }

    const connection = connectionResult.connection;

    // // Check if the connection is inactive and try to reactivate it
    // if (connection?.isActive === false) {
    //   // Check if the token is still valid
    //   if (connection?.tokens.expires_in > Date.now()) {
    //     // Try to reactivate the connection
    //     const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    //     await connectionRef.update({
    //       isActive: true,
    //     });
    //   } else {
    //     // Try to refresh the token
    //     const refreshResult = await refreshTokenIfNeeded({ connectionId });
    //     if (refreshResult.error) {
    //       return {
    //         error: `Gmail connection for ${connection?.email} is inactive. Please reconnect your Gmail account.`,
    //       };
    //     }
    //   }
    // }

    // // Get fresh access token
    // const refreshResult = await refreshTokenIfNeeded({ connectionId });
    // if (refreshResult.error) {
    //   return { error: refreshResult.error };
    // }
    // const accessToken = refreshResult.accessToken;

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
        Authorization: `Bearer ${connection?.tokens.access_token}`,
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

    if (!test) {
      // Update user email sent number
      const userRef = adminDb.collection("users").doc(user.id);
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

export async function testEmailConnection({
  connectionId,
  workspaceId,
}: {
  connectionId: string;
  workspaceId: string;
}) {
  const user = await requireAuth();

  try {
    const connectionResult = await getConnectionById({ connectionId });
    if (connectionResult.error) {
      return { error: connectionResult.error };
    }

    const connection = connectionResult.connection;

    // // Check if the connection is inactive and try to reactivate it
    // if (connection?.isActive === false) {
    //   // Check if the token is still valid
    //   if (connection?.tokens.expires_in > Date.now()) {
    //     // Try to reactivate the connection
    //     const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    //     await connectionRef.update({
    //       isActive: true,
    //     });
    //   } else {
    //     // Try to refresh the token
    //     const refreshResult = await refreshTokenIfNeeded({ connectionId });
    //     if (refreshResult.error) {
    //       return { error: "Gmail connection is inactive. Please reconnect your Gmail account." };
    //     }
    //   }
    // }

    // Send a test email
    const emailResult = await sendEmail({
      connectionId,
      workspaceId,
      to: connection?.email!,
      subject: "Welcome Agent - Test Connection",
      body: `
        <p>This is a test email from your Welcome Agent.</p>
        <p>If you're receiving this, your email connection is working correctly!</p>
        <p>You can now start using this email account to send welcome emails to your new signups.</p>
        `,
      test: true,
    });

    if (emailResult.error) {
      return { error: emailResult.error };
    }

    return { success: "Test email sent successfully" };
  } catch (error) {
    return { error: "An error occurred while testing the email connection" };
  }
}

export async function getConnection({ connectionId }: { connectionId: string }) {
  const user = await requireAuth();

  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const connection = await connectionRef.get();

    if (!connection.exists) {
      return { error: "Connection not found" };
    }

    const data = connection.data() as GmailConnection;
    return {
      success: "Connection retrieved successfully",
      connection: {
        ...data,
        id: connection.id,
        // Ensure isActive is a boolean
        isActive: data.isActive !== false,
      } as GmailConnection,
    };
  } catch (error) {
    console.error("Error getting connection:", error);
    return { error: "An error occurred while retrieving the connection" };
  }
}

export async function getConnectionByEmail({ email }: { email: string }) {
  const user = await requireAuth();

  try {
    const connectionsRef = adminDb.collection("gmail_connections");
    const q = connectionsRef.where("email", "==", email);
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
  const user = await requireAuth();

  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);
    const snapshot = await connectionRef.get();

    if (!snapshot.exists) {
      return { error: "Connection not found" };
    }

    const data = snapshot.data() as GmailConnection;
    return {
      success: "Connection retrieved successfully",
      connection: {
        ...data,
        id: snapshot.id,
        // Ensure isActive is a boolean
        isActive: data.isActive !== false,
      } as GmailConnection,
    };
  } catch (error) {
    console.error("Error getting connection by ID:", error);
    return { error: "An error occurred while retrieving the connection" };
  }
}

export async function reactivateConnection({
  connectionId,
  tokens,
}: {
  connectionId: string;
  tokens: GmailTokens;
}) {
  const user = await requireAuth();

  try {
    const connectionRef = adminDb.collection("gmail_connections").doc(connectionId);

    // Get current connection data
    const connectionResult = await getConnectionById({ connectionId });
    if (connectionResult.error) {
      return { error: connectionResult.error };
    }

    // Update connection with new tokens and mark as active
    await connectionRef.update({
      tokens,
      isActive: true,
    });

    return { success: "Connection reactivated successfully" };
  } catch (error) {
    console.error("Error reactivating connection:", error);
    return { error: "An error occurred while reactivating the connection" };
  }
}

export async function checkAndFixInactiveConnections({ workspaceId }: { workspaceId: string }) {
  const user = await requireAuth();

  try {
    const connectionsResult = await getWorkspaceConnections({ workspaceId });
    if (connectionsResult.error) {
      return { error: connectionsResult.error };
    }

    const connections = connectionsResult.connections;

    // Filter for inactive connections
    const inactiveConnections = connections?.filter((conn) => conn.isActive === false) || [];
    let fixedCount = 0;

    // Try to reactivate each inactive connection
    for (const connection of inactiveConnections) {
      try {
        // Check if the token is still valid
        if (connection.tokens.expires_in > Date.now()) {
          // Reactivate the connection
          const connectionRef = adminDb.collection("gmail_connections").doc(connection.id);
          await connectionRef.update({
            isActive: true,
          });
          fixedCount++;
        } else {
          // Try to refresh the token
          const refreshResult = await refreshTokenIfNeeded({ connectionId: connection.id });
          if (!refreshResult.error) {
            fixedCount++;
          }
        }
      } catch (error) {
        console.error(`Failed to reactivate connection for ${connection.email}:`, error);
        // Continue with other connections
      }
    }

    return {
      success: "Checked and fixed inactive connections",
      stats: {
        total: connections?.length || 0,
        inactive: inactiveConnections.length,
        fixed: fixedCount,
      },
    };
  } catch (error) {
    console.error("Error checking and fixing inactive connections:", error);
    return { error: "An error occurred while checking and fixing inactive connections" };
  }
}
