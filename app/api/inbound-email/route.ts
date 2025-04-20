import { NextRequest, NextResponse } from "next/server";
import * as mailgunUtils from "@/firebase/mailgun-utils";
import * as welcomeAgentUtils from "@/firebase/welcome-agent-utils";
import * as gmailUtils from "@/firebase/gmail-utils";
import { generateEmail } from "@/firebase/welcome-agent-utils";
import { createEmailRecord } from "@/firebase/email-history-utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get the raw email content
    const recipient = formData.get("recipient") as string;
    const bodyPlain = formData.get("body-plain") as string;

    // Find the Welcome Agent
    const localPart = recipient.split("@")[0];

    const { notificationEmail } = await mailgunUtils.findByLocalPart({ localPart });
    if (!notificationEmail) {
      console.error("No notification email found for:", localPart);
      return NextResponse.json({ error: "Invalid notification email" }, { status: 404 });
    }

    // Get the agent configuration
    const { agent } = await welcomeAgentUtils.getWelcomeAgent({
      agentId: notificationEmail.agentId,
    });
    if (!agent) {
      console.error("Welcome agent not found for:", notificationEmail.agentId);
      return NextResponse.json({ error: "Welcome agent not found" }, { status: 404 });
    }

    // Only send if review is not required
    if (agent.configuration?.emailAccount) {
      // Get the Gmail connection for this email account
      const { connection } = await gmailUtils.getConnectionByEmail({
        agentId: agent.id,
        email: agent.configuration.emailAccount,
      });
      if (!connection) {
        return NextResponse.json(
          { error: `No Gmail connection found for ${agent.configuration.emailAccount}` },
          { status: 400 },
        );
      }

      // Check if email should be reviewed before sending
      const shouldReview = agent.configuration?.settings?.reviewBeforeSending;

      if (shouldReview) {
        await createEmailRecord({
          recipientEmail: recipient,
          agentId: agent.id,
          agentName: agent.name,
          workspaceId: agent.workspaceId,
          subject: "Inbound Email",
          body: bodyPlain,
          status: "under_review",
          gmailConnectionId: connection.id,
          userInfo: bodyPlain,
          businessInfo: agent.businessContext?.websiteSummary || "",
        });

        return NextResponse.json({
          success: true,
          status: "queued_for_review",
        });
      }

      // Generate the email content
      const { success, error, email } = await generateEmail({
        senderName: connection.name,
        signupInfo: bodyPlain,
        directive: agent.businessContext?.purpose,
        businessContext: {
          website: agent.businessContext?.website,
          purpose: agent.businessContext?.purpose,
          websiteSummary: agent.businessContext?.websiteSummary,
        },
        workspaceId: agent.workspaceId,
      });

      if (success) {
        const { success, error } = await gmailUtils.sendEmail({
          connectionId: connection.id,
          to: email.to,
          subject: email.subject,
          body: email.body,
          isTest: false,
        });

        if (success) {
          await createEmailRecord({
            recipientEmail: email.to,
            agentId: agent.id,
            agentName: agent.name,
            workspaceId: agent.workspaceId,
            subject: email.subject,
            body: email.body,
            status: "sent",
            gmailConnectionId: connection.id,
            userInfo: bodyPlain,
            businessInfo: agent.businessContext?.websiteSummary || "",
          });
          return NextResponse.json({ success: true });
        } else {
          console.error("Failed to send email:", error);
          return NextResponse.json({ error: error }, { status: 400 });
        }
      } else if (error) {
        return NextResponse.json({ error: error }, { status: 400 });
      }
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
