import { auth, db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  increment,
} from "firebase/firestore";
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

export const gmailUtils = {
  async testGmailTokens(tokens: GmailTokens): Promise<boolean> {
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
  },

  async saveGmailConnection(
    workspaceId: string,
    userId: string,
    email: string,
    name: string,
    tokens: GmailTokens,
  ) {
    try {
      // Validate tokens
      if (!tokens.access_token || !tokens.refresh_token) {
        console.error("Invalid tokens provided:", tokens);
        throw new Error("Invalid Gmail tokens provided");
      }

      // Check if tokens are expired
      if (tokens.expires_in && Date.now() >= tokens.expires_in) {
        console.warn("Tokens are already expired, but proceeding with save");
      }

      // Test the tokens to ensure they're valid
      const tokensValid = await this.testGmailTokens(tokens);
      if (!tokensValid) {
        console.error("Gmail tokens validation failed");
        throw new Error(
          "Gmail tokens validation failed. Please try reconnecting your Gmail account.",
        );
      }

      const connectionData = {
        email,
        name,
        tokens,
        workspaceId,
        userId,
        connected_at: Date.now(),
        isActive: true,
      };

      // Check if connection already exists
      const existingConnections = await this.getWorkspaceConnections(workspaceId);

      const existing = existingConnections.find((conn) => conn.email === email);

      let connectionId: string;

      if (existing && existing.id) {
        const connectionRef = doc(db, "gmail_connections", existing.id);
        await setDoc(connectionRef, connectionData, { merge: true });
        connectionId = existing.id;
      } else {
        const connectionRef = doc(collection(db, "gmail_connections"));
        await setDoc(connectionRef, connectionData);
        connectionId = connectionRef.id;
      }

      // Update user remaining connected gmail accounts
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          remainingConnectedGmailAccounts: increment(-1),
        },
        { merge: true },
      );

      // Verify the connection was saved
      await this.getConnection(connectionId);

      return connectionId;
    } catch (error) {
      console.error("Error in saveGmailConnection:", error);
      throw error;
    }
  },

  async getWorkspaceConnections(workspaceId: string) {
    try {
      const connectionsRef = collection(db, "gmail_connections");
      const q = query(connectionsRef, where("workspaceId", "==", workspaceId));
      const snapshot = await getDocs(q);

      const connections = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GmailConnection[];

      return connections;
    } catch (error) {
      console.error("Error in getWorkspaceConnections:", error);
      throw error;
    }
  },

  async removeConnection(connectionId: string) {
    await deleteDoc(doc(db, "gmail_connections", connectionId));
  },

  async refreshTokenIfNeeded(connectionId: string) {
    const connectionRef = doc(db, "gmail_connections", connectionId);
    const connection = await getDoc(connectionRef);

    if (!connection.exists()) {
      console.error("Gmail connection not found:", connectionId);
      throw new Error("Gmail connection not found");
    }

    const data = connection.data() as GmailConnection;
    const expiryDate = data.tokens.expires_in;

    // If token expires in less than 5 minutes, refresh it
    if (expiryDate < 5 * 60) {
      try {
        // Log client ID (without the full secret) for debugging
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

        if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
          console.error("Missing Google OAuth credentials");
          throw new Error("Google OAuth credentials are not properly configured");
        }

        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
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
              return data.tokens.access_token;
            }
            throw new Error("Google OAuth configuration is invalid. Please contact support.");
          } else if (newTokens.error === "invalid_grant") {
            console.error("Invalid grant. The refresh token may have been revoked.");
            // Instead of marking as inactive, try to use the existing token if it's not expired
            if (Date.now() < expiryDate) {
              return data.tokens.access_token;
            }
            throw new Error(
              "Gmail authorization has expired. Please reconnect your Gmail account.",
            );
          }

          // For other errors, try to use the existing token if it's not expired
          if (Date.now() < expiryDate) {
            return data.tokens.access_token;
          }

          throw new Error(`Failed to refresh token: ${newTokens.error || "Unknown error"}`);
        }

        // Update tokens in database
        await setDoc(
          connectionRef,
          {
            tokens: {
              ...data.tokens,
              access_token: newTokens.access_token,
              expires_in: Date.now() + newTokens.expires_in * 1000,
            },
            isActive: true, // Ensure connection is marked as active
          },
          { merge: true },
        );

        return newTokens.access_token;
      } catch (error) {
        console.error("Error refreshing token:", error);

        // Try to use the existing token if it's not expired
        if (expiryDate > 0) {
          return data.tokens.access_token;
        }

        // Only mark as inactive if we can't use the existing token
        try {
          await setDoc(
            connectionRef,
            {
              isActive: false,
            },
            { merge: true },
          );
        } catch (updateError) {
          console.error("Failed to mark connection as inactive:", updateError);
        }

        throw new Error(`Gmail authorization has expired. Please reconnect your Gmail account.`);
      }
    }

    return data.tokens.access_token;
  },

  async sendEmail({ workspaceId, connectionId, to, subject, body, test }: SendEmailParams) {
    try {
      // Get the connection details
      const connection = await this.getConnectionById(connectionId);
      if (!connection) {
        const connections = await this.getWorkspaceConnections(workspaceId);
        const availableEmails = connections.map((c) => c.email).join(", ");
        throw new Error(
          `No Gmail connection found for ID: ${connectionId}. Available connections: ${availableEmails}`,
        );
      }

      // Check if the connection is inactive and try to reactivate it
      if (connection.isActive === false) {
        // Check if the token is still valid
        if (connection.tokens.expires_in > 0) {
          // Try to reactivate the connection
          const connectionRef = doc(db, "gmail_connections", connectionId);
          await setDoc(
            connectionRef,
            {
              isActive: true,
            },
            { merge: true },
          );
        } else {
          // Try to refresh the token
          try {
            await this.refreshTokenIfNeeded(connectionId);
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
            throw new Error(
              `Gmail connection for ${connection.email} is inactive. Please reconnect your Gmail account.`,
            );
          }
        }
      }

      // Type assertion to ensure TypeScript knows connection has all GmailConnection properties
      const connectionDetails: GmailConnection = connection;

      // Get fresh access token
      const accessToken = await this.refreshTokenIfNeeded(connectionId);

      // Construct the email in RFC 822 format with proper From header
      const emailContent = [
        'Content-Type: text/html; charset="UTF-8"',
        "MIME-Version: 1.0",
        `To: ${to}`,
        `From: "${connectionDetails.name}" <${connectionDetails.email}>`,
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
        throw new Error(`Failed to send email: ${error}`);
      }

      if (!test) {
        // Update user email sent number
        const userId = auth.currentUser?.uid;
        if (!userId) {
          throw new Error("User is anuthenticated");
        }

        const userRef = doc(db, "users", userId);
        await setDoc(
          userRef,
          {
            remainingEmailSent: increment(-1),
          },
          { merge: true },
        );
      }

      const result = await response.json();

      return result;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  },

  async testEmailConnection({
    connectionId,
    workspaceId,
  }: {
    connectionId: string;
    workspaceId: string;
  }) {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      // Check if the connection is inactive and try to reactivate it
      if (connection.isActive === false) {
        // Check if the token is still valid

        if (connection.tokens.expires_in > 0) {
          // Try to reactivate the connection
          const connectionRef = doc(db, "gmail_connections", connectionId);
          await setDoc(
            connectionRef,
            {
              isActive: true,
            },
            { merge: true },
          );
        } else {
          // Try to refresh the token
          try {
            await this.refreshTokenIfNeeded(connectionId);
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
            throw new Error("Gmail connection is inactive. Please reconnect your Gmail account.");
          }
        }
      }

      // Send a test email
      await this.sendEmail({
        connectionId,
        workspaceId,
        to: connection.email,
        subject: "Welcome Agent - Test Connection",
        body: `
        <p>This is a test email from your Welcome Agent.</p>
        <p>If you're receiving this, your email connection is working correctly!</p>
        <p>You can now start using this email account to send welcome emails to your new signups.</p>
        `,
        test: true,
      });

      return true;
    } catch (error) {
      console.error("Test email failed:", error);
      throw error;
    }
  },

  async getConnection(connectionId: string) {
    const connectionRef = doc(db, "gmail_connections", connectionId);
    const connection = await getDoc(connectionRef);

    if (!connection.exists()) {
      return null;
    }

    const data = connection.data() as GmailConnection;
    return {
      ...data,
      id: connection.id,
      // Ensure isActive is a boolean
      isActive: data.isActive !== false,
    } as GmailConnection;
  },

  async getConnectionByEmail(email: string): Promise<GmailConnection | null> {
    const connectionsRef = collection(db, "gmail_connections");

    // Add isActive field if it doesn't exist in the query
    const q = query(connectionsRef, where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const connection = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as GmailConnection;

    return connection;
  },

  async getConnectionById(connectionId: string): Promise<GmailConnection | null> {
    const connectionRef = doc(db, "gmail_connections", connectionId);
    const snapshot = await getDoc(connectionRef);
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as GmailConnection;
    return {
      ...data,
      id: snapshot.id,
      // Ensure isActive is a boolean
      isActive: data.isActive !== false,
    } as GmailConnection;
  },

  async reactivateConnection(connectionId: string, tokens: GmailTokens) {
    const connectionRef = doc(db, "gmail_connections", connectionId);

    // Get current connection data
    const connection = await this.getConnectionById(connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    // Update connection with new tokens and mark as active
    await setDoc(
      connectionRef,
      {
        tokens,
        isActive: true,
      },
      { merge: true },
    );

    return true;
  },

  async checkAndFixInactiveConnections(workspaceId: string) {
    try {
      // Get all connections for the workspace
      const connections = await this.getWorkspaceConnections(workspaceId);

      // Filter for inactive connections
      const inactiveConnections = connections.filter((conn) => conn.isActive === false);

      // Try to reactivate each inactive connection
      for (const connection of inactiveConnections) {
        try {
          // Check if the token is still valid
          if (connection.tokens.expires_in > 0) {
            // Reactivate the connection
            const connectionRef = doc(db, "gmail_connections", connection.id);
            await setDoc(
              connectionRef,
              {
                isActive: true,
              },
              { merge: true },
            );
          } else {
            // Try to refresh the token

            await this.refreshTokenIfNeeded(connection.id);
          }
        } catch (error) {
          console.error(`Failed to reactivate connection for ${connection.email}:`, error);
          // Continue with other connections
        }
      }

      return {
        total: connections.length,
        inactive: inactiveConnections.length,
        fixed: inactiveConnections.length, // We tried to fix all inactive connections
      };
    } catch (error) {
      console.error("Error checking and fixing inactive connections:", error);
      throw error;
    }
  },

  // Client-side function to periodically check and fix inactive connections
  startPeriodicConnectionCheck(workspaceId: string, intervalMinutes = 60) {
    // Check immediately
    this.checkAndFixInactiveConnections(workspaceId)
      .then((result) => {})
      .catch((error) => {
        console.error("Error in initial connection check:", error);
      });

    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      this.checkAndFixInactiveConnections(workspaceId)
        .then((result) => {})
        .catch((error) => {
          console.error("Error in periodic connection check:", error);
        });
    }, intervalMinutes * 60 * 1000);

    // Return the interval ID so it can be cleared if needed
    return intervalId;
  },
};
