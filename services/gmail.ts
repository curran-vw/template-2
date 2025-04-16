import { google } from "googleapis";
import { getGmailClient } from "@/lib/gmail";
import { GmailError, AuthError, ValidationError } from "@/lib/errors";
import { GmailTokens } from "@/types/gmail";

export class GmailService {
  private gmail;

  constructor(tokens: GmailTokens) {
    try {
      this.gmail = getGmailClient(tokens);
    } catch (error) {
      throw new AuthError("Failed to initialize Gmail client");
    }
  }

  async getEmails(maxResults: number = 10) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: "me",
        maxResults,
      });

      if (!response.data.messages) {
        return [];
      }

      return response.data.messages;
    } catch (error) {
      throw new GmailError("Failed to fetch emails");
    }
  }

  async getEmailDetails(messageId: string) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
      });

      return response.data;
    } catch (error) {
      throw new GmailError("Failed to fetch email details");
    }
  }

  async sendEmail(to: string, subject: string, body: string) {
    if (!to || !subject || !body) {
      throw new ValidationError("Missing required email fields");
    }

    try {
      const email = [
        `To: ${to}`,
        "Content-Type: text/html; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${subject}`,
        "",
        body,
      ].join("\n");

      const encodedEmail = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await this.gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      return response.data;
    } catch (error) {
      throw new GmailError("Failed to send email");
    }
  }
}
