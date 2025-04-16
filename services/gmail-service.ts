import { GmailTokens, GmailConnection, GmailConnectionStatus } from "@/types/gmail";
import { GMAIL_API_ENDPOINTS, GMAIL_ERROR_CODES, GMAIL_CONNECTION_LIMITS } from "@/types/gmail";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export class GmailService {
  private static instance: GmailService;
  private rateLimitMap: Map<string, { count: number; windowStart: number }>;

  private constructor() {
    this.rateLimitMap = new Map();
  }

  public static getInstance(): GmailService {
    if (!GmailService.instance) {
      GmailService.instance = new GmailService();
    }
    return GmailService.instance;
  }

  private async checkRateLimit(connectionId: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - GMAIL_CONNECTION_LIMITS.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

    const limit = this.rateLimitMap.get(connectionId) || { count: 0, windowStart };

    if (now - limit.windowStart > GMAIL_CONNECTION_LIMITS.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000) {
      // Reset if window has passed
      this.rateLimitMap.set(connectionId, { count: 1, windowStart: now });
      return true;
    }

    if (limit.count >= GMAIL_CONNECTION_LIMITS.MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    this.rateLimitMap.set(connectionId, {
      count: limit.count + 1,
      windowStart: limit.windowStart,
    });

    return true;
  }

  public async validateTokens(tokens: GmailTokens): Promise<boolean> {
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

  private async refreshTokens(connection: GmailConnection): Promise<GmailTokens | null> {
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

  public async getConnectionStatus(connectionId: string): Promise<GmailConnectionStatus> {
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
        const newTokens = await this.refreshTokens(data);
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
      const isValid = await this.validateTokens(data.tokens);
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
      return {
        isActive: false,
        lastChecked: Date.now(),
        error: "Error checking connection status",
      };
    }
  }

  public async sendEmail(
    connectionId: string,
    to: string,
    subject: string,
    body: string,
    test = false,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check rate limit
      if (!(await this.checkRateLimit(connectionId))) {
        return { success: false, error: "Rate limit exceeded" };
      }

      // Get connection status
      const status = await this.getConnectionStatus(connectionId);
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
        const userRef = adminDb.collection("users").doc(data.userId);
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
}
