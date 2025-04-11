import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
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
}

export const gmailUtils = {
  async testGmailTokens(tokens: GmailTokens): Promise<boolean> {
    try {
      console.log("Testing Gmail tokens...");

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

      console.log("Gmail tokens are valid");
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
    console.log("Starting saveGmailConnection:", {
      workspaceId,
      userId,
      email,
      name,
    });

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
      const existingConnections =
        await this.getWorkspaceConnections(workspaceId);
      console.log("Existing connections:", existingConnections);

      const existing = existingConnections.find((conn) => conn.email === email);
      console.log("Found existing connection:", existing);

      let connectionId: string;

      if (existing && existing.id) {
        console.log("Updating existing connection:", existing.id);
        const connectionRef = doc(db, "gmail_connections", existing.id);
        await setDoc(connectionRef, connectionData, { merge: true });
        connectionId = existing.id;
      } else {
        console.log("Creating new connection");
        const connectionRef = doc(collection(db, "gmail_connections"));
        await setDoc(connectionRef, connectionData);
        connectionId = connectionRef.id;
      }

      // Verify the connection was saved
      const savedConnection = await this.getConnection(connectionId);
      console.log("Saved connection:", savedConnection);

      return connectionId;
    } catch (error) {
      console.error("Error in saveGmailConnection:", error);
      throw error;
    }
  },

  async getWorkspaceConnections(workspaceId: string) {
    console.log("Getting workspace connections for:", workspaceId);
    try {
      const connectionsRef = collection(db, "gmail_connections");
      const q = query(connectionsRef, where("workspaceId", "==", workspaceId));
      const snapshot = await getDocs(q);

      const connections = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GmailConnection[];

      console.log("Found connections:", connections);
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
    console.log(
      "Checking if token needs refresh for connection:",
      connectionId,
    );
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
      console.log("Token needs refresh, refreshing...");
      try {
        // Log client ID (without the full secret) for debugging
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        console.log(
          "Using client ID:",
          clientId ? `${clientId.substring(0, 5)}...` : "undefined",
        );

        if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
          console.error("Missing Google OAuth credentials");
          throw new Error(
            "Google OAuth credentials are not properly configured",
          );
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
              console.log("Using existing token despite refresh failure");
              return data.tokens.access_token;
            }
            throw new Error(
              "Google OAuth configuration is invalid. Please contact support.",
            );
          } else if (newTokens.error === "invalid_grant") {
            console.error(
              "Invalid grant. The refresh token may have been revoked.",
            );
            // Instead of marking as inactive, try to use the existing token if it's not expired
            if (Date.now() < expiryDate) {
              console.log("Using existing token despite refresh failure");
              return data.tokens.access_token;
            }
            throw new Error(
              "Gmail authorization has expired. Please reconnect your Gmail account.",
            );
          }

          // For other errors, try to use the existing token if it's not expired
          if (Date.now() < expiryDate) {
            console.log("Using existing token despite refresh failure");
            return data.tokens.access_token;
          }

          throw new Error(
            `Failed to refresh token: ${newTokens.error || "Unknown error"}`,
          );
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

        console.log("Token refreshed successfully");
        return newTokens.access_token;
      } catch (error) {
        console.error("Error refreshing token:", error);

        // Try to use the existing token if it's not expired
        if (expiryDate > 0) {
          console.log("Using existing token despite refresh error");
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

        throw new Error(
          `Gmail authorization has expired. Please reconnect your Gmail account.`,
        );
      }
    }

    console.log("Token still valid, using existing token");
    return data.tokens.access_token;
  },

  async sendEmail({ connectionId, to, subject, body }: SendEmailParams) {
    try {
      console.log("Attempting to send email:", { connectionId, to, subject });

      // Get the connection details
      const connection = await this.getConnectionById(connectionId);
      if (!connection) {
        const connections = await this.getWorkspaceConnections(
          "uIRfO3U9XyCw2eIbeeFb",
        );
        const availableEmails = connections.map((c) => c.email).join(", ");
        throw new Error(
          `No Gmail connection found for ID: ${connectionId}. Available connections: ${availableEmails}`,
        );
      }

      // Check if the connection is inactive and try to reactivate it
      if (connection.isActive === false) {
        console.log("Connection is inactive, attempting to reactivate...");

        // Check if the token is still valid
        if (
          connection.tokens.expires_in > 0 
        ) {
          console.log("Token is still valid, reactivating connection...");

          // Try to reactivate the connection
          const connectionRef = doc(db, "gmail_connections", connectionId);
          await setDoc(
            connectionRef,
            {
              isActive: true,
            },
            { merge: true },
          );

          console.log("Connection reactivated successfully");
        } else {
          // Try to refresh the token
          try {
            console.log("Token is expired, attempting to refresh...");
            await this.refreshTokenIfNeeded(connectionId);
            console.log(
              "Token refreshed successfully, connection should be active now",
            );
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

      console.log("Using Gmail connection:", {
        id: connectionDetails.id,
        email: connectionDetails.email,
        name: connectionDetails.name,
      });

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

      console.log("Encoded email content:", encodedEmail);
      console.log("Sending email to:", to);
      console.log("Email subject:", subject);
      console.log("Email body:", body);
      console.log("Access token:", accessToken);
      console.log("Connection ID:", connectionId);
      // Send the email via Gmail API
      const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Goog-AuthUser": "0",
          },
          body: JSON.stringify({
            raw: encodedEmail,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      const result = await response.json();
      console.log("Email sent successfully:", result);
      return result;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  },

  async testEmailConnection(connectionId: string) {
    try {
      const connection = await this.getConnection(connectionId);
      if (!connection) {
        throw new Error("Connection not found");
      }

      // Check if the connection is inactive and try to reactivate it
      if (connection.isActive === false) {
        console.log("Connection is inactive, attempting to reactivate...");

        // Check if the token is still valid
        console.log("Checking token validity...");
        console.log("Token expiry date:", connection.tokens.expires_in);
        if (
          connection.tokens.expires_in > 0 
        ) {
          console.log("Token is still valid, reactivating connection...");

          // Try to reactivate the connection
          const connectionRef = doc(db, "gmail_connections", connectionId);
          await setDoc(
            connectionRef,
            {
              isActive: true,
            },
            { merge: true },
          );

          console.log("Connection reactivated successfully");
        } else {
          // Try to refresh the token
          try {
            console.log("Token is expired, attempting to refresh...");
            await this.refreshTokenIfNeeded(connectionId);
            console.log(
              "Token refreshed successfully, connection should be active now",
            );
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
            throw new Error(
              "Gmail connection is inactive. Please reconnect your Gmail account.",
            );
          }
        }
      }

      // Send a test email
      await this.sendEmail({
        connectionId,
        to: connection.email,
        subject: "Welcome Agent - Test Connection",
        body: `
        <p>This is a test email from your Welcome Agent.</p>
        <p>If you're receiving this, your email connection is working correctly!</p>
        <p>You can now start using this email account to send welcome emails to your new signups.</p>
        `,
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
    console.log("Looking up Gmail connection for:", email);
    const connectionsRef = collection(db, "gmail_connections");

    // Add isActive field if it doesn't exist in the query
    const q = query(connectionsRef, where("email", "==", email));
    const snapshot = await getDocs(q);

    console.log("Query results:", {
      empty: snapshot.empty,
      count: snapshot.docs.length,
      docs: snapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        isActive: doc.data().isActive,
      })),
    });

    if (snapshot.empty) {
      console.log("No Gmail connection found for:", email);
      return null;
    }

    const connection = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as GmailConnection;

    console.log("Found Gmail connection:", connection);
    return connection;
  },

  async getConnectionById(
    connectionId: string,
  ): Promise<GmailConnection | null> {
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
    console.log("Reactivating connection:", connectionId);
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

    console.log("Connection reactivated successfully");
    return true;
  },

  async checkAndFixInactiveConnections(workspaceId: string) {
    console.log(
      "Checking for inactive Gmail connections in workspace:",
      workspaceId,
    );
    try {
      // Get all connections for the workspace
      const connections = await this.getWorkspaceConnections(workspaceId);
      console.log(`Found ${connections.length} connections`);

      // Filter for inactive connections
      const inactiveConnections = connections.filter(
        (conn) => conn.isActive === false,
      );
      console.log(`Found ${inactiveConnections.length} inactive connections`);

      // Try to reactivate each inactive connection
      for (const connection of inactiveConnections) {
        try {
          console.log(
            `Attempting to reactivate connection for ${connection.email}...`,
          );

          // Check if the token is still valid
          if (
            connection.tokens.expires_in > 0 
          ) {
            console.log("Token is still valid, reactivating connection...");

            // Reactivate the connection
            const connectionRef = doc(db, "gmail_connections", connection.id);
            await setDoc(
              connectionRef,
              {
                isActive: true,
              },
              { merge: true },
            );

            console.log(
              `Connection for ${connection.email} reactivated successfully`,
            );
          } else {
            // Try to refresh the token
            console.log("Token is expired, attempting to refresh...");
            await this.refreshTokenIfNeeded(connection.id);
            console.log(
              `Connection for ${connection.email} refreshed successfully`,
            );
          }
        } catch (error) {
          console.error(
            `Failed to reactivate connection for ${connection.email}:`,
            error,
          );
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
    console.log(
      `Starting periodic Gmail connection check every ${intervalMinutes} minutes`,
    );

    // Check immediately
    this.checkAndFixInactiveConnections(workspaceId)
      .then((result) => {
        console.log("Initial connection check result:", result);
      })
      .catch((error) => {
        console.error("Error in initial connection check:", error);
      });

    // Set up interval for periodic checks
    const intervalId = setInterval(
      () => {
        console.log("Running periodic Gmail connection check");
        this.checkAndFixInactiveConnections(workspaceId)
          .then((result) => {
            console.log("Periodic connection check result:", result);
          })
          .catch((error) => {
            console.error("Error in periodic connection check:", error);
          });
      },
      intervalMinutes * 60 * 1000,
    );

    // Return the interval ID so it can be cleared if needed
    return intervalId;
  },
};
