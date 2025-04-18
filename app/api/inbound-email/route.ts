import { NextRequest, NextResponse } from "next/server";
import * as mailgunUtils from "@/firebase/mailgun-utils";
import * as welcomeAgentUtils from "@/firebase/welcome-agent-utils";
import * as gmailUtils from "@/firebase/gmail-utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get the raw email content
    const recipient = formData.get("recipient") as string;
    const sender = formData.get("sender") as string;
    const subject = formData.get("subject") as string;
    const bodyPlain = formData.get("body-plain") as string;

    console.log("recipient", recipient);
    console.log("sender", sender);
    console.log("subject", subject);
    console.log("bodyPlain", bodyPlain);
    console.log("========================================================");

    // Find the Welcome Agent
    const localPart = recipient.split("@")[0];

    const { notificationEmail } = await mailgunUtils.findByLocalPart({ localPart });
    if (!notificationEmail) {
      console.error("No notification email found for:", localPart);
      return NextResponse.json({ error: "Invalid notification email" }, { status: 404 });
    }

    // Get the agent configuration
    const { agent } = await welcomeAgentUtils.getWelcomeAgentServer({
      agentId: notificationEmail.agentId,
    });

    if (!agent) {
      console.error("Welcome agent not found for:", notificationEmail.agentId);
      return NextResponse.json({ error: "Welcome agent not found" }, { status: 404 });
    }

    // Extract email from sender or body
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const emailMatches = [...(bodyPlain?.match(emailRegex) || []), sender];
    const recipientEmail = emailMatches[0];
    if (!recipientEmail) {
      console.error("No email found in content");
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    console.log("recipientEmail", recipientEmail);

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
      const { connection } = await gmailUtils.getConnectionByEmail({
        email: agent.configuration.emailAccount,
      });
      if (!connection) {
        return NextResponse.json(
          { error: `No Gmail connection found for ${agent.configuration.emailAccount}` },
          { status: 400 },
        );
      }

      // Generate the email content
      const { success, error, subject, body } = await welcomeAgentUtils.generateWelcomeEmail{
        agent,
          signupInfo: {
          email: recipientEmail,
          rawContent: bodyPlain,
        }
        };
      

      await gmailUtils.sendEmail({
        workspaceId: agent.workspaceId,
        connectionId: connection.id,
        to: recipientEmail,
        subject: agent.lastTestEmail?.subject!,
        body: agent.lastTestEmail?.body!,
      });
    } else {
      return NextResponse.json(
        { error: "No email account configured for this agent" },
        { status: 400 },
      );
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
