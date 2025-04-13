import { NextResponse } from "next/server";
import { mailgunUtils } from "@/firebase/mailgun-utils";
import { welcomeAgentUtils } from "@/firebase/welcome-agent-utils";
import { gmailUtils } from "@/firebase/gmail-utils";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Get the raw email content
    const recipient = formData.get("recipient") as string;
    const sender = formData.get("sender") as string;
    const subject = formData.get("subject") as string;
    const bodyPlain = formData.get("body-plain") as string;
    const strippedText = formData.get("stripped-text") as string;
    const workspaceId = formData.get("workspaceId") as string;

    // Find the Welcome Agent
    const localPart = recipient.split("@")[0];

    const notificationEmail = await mailgunUtils.findByLocalPart(localPart);
    if (!notificationEmail) {
      console.error("No notification email found for:", localPart);
      return NextResponse.json({ error: "Invalid notification email" }, { status: 404 });
    }

    // Get the agent configuration
    const agent = await welcomeAgentUtils.getWelcomeAgent(notificationEmail.agentId);
    if (!agent) {
      console.error("Welcome agent not found:", notificationEmail.agentId);
      return NextResponse.json({ error: "Welcome agent not found" }, { status: 404 });
    }

    // Extract email from sender or body
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const emailMatches = [
      ...(bodyPlain?.match(emailRegex) || []),
      ...(strippedText?.match(emailRegex) || []),
      sender,
    ];
    const recipientEmail = emailMatches[0];

    if (!recipientEmail) {
      console.error("No email found in content");
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Pass the entire email content to the AI
    const signupInfo = {
      email: recipientEmail,
      rawContent: strippedText || bodyPlain,
      subject,
      sender,
    };

    // Generate welcome email
    const emailContent = await welcomeAgentUtils.generateWelcomeEmail(agent, signupInfo);

    // Check if email should be reviewed before sending
    const shouldReview = agent.configuration?.settings?.reviewBeforeSending ?? false;

    if (shouldReview) {
      return NextResponse.json({
        success: true,
        status: "queued_for_review",
      });
    }

    // Only send if review is not required
    if (agent.configuration?.emailAccount) {
      // Get the Gmail connection for this email account
      const connection = await gmailUtils.getConnectionByEmail(agent.configuration.emailAccount);
      if (!connection) {
        throw new Error(`No Gmail connection found for ${agent.configuration.emailAccount}`);
      }

      await gmailUtils.sendEmail({
        workspaceId,
        connectionId: connection.id!,
        to: recipientEmail,
        subject: emailContent.subject,
        body: emailContent.body,
      });
    } else {
      console.warn("No email account configured for agent:", {
        agentId: agent.id,
        configuration: agent.configuration,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing inbound email:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
