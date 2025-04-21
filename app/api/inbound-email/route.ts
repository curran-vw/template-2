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
    const agentNotifiactionEmail = formData.get("recipient") as string;
    const bodyPlain = formData.get("body-plain") as string;

    // Extract the name, email, website, and role from the body plain text
    const NAME = bodyPlain.match(/Name: ([^\n]+)/)?.[1];
    const EMAIL = bodyPlain.match(/Email: ([^\n]+)/)?.[1];
    const WEBSITE = bodyPlain.match(/Website: ([^\n]+)/)?.[1];
    const ROLE = bodyPlain.match(/Role: ([^\n]+)/)?.[1];

    if (!NAME || !EMAIL || !WEBSITE || !ROLE) {
      await createEmailRecord({
        agentId: "invalid-agent-id",
        agentName: "invalid-agent-name",
        workspaceId: "invalid-workspace-id",
        gmailConnectionId: "invalid-gmail-connection-id",
        recipientEmail: "invalid-recipient-email",
        subject: "Invalid Signup Info",
        body: "Invalid signup info",
        status: "failed",
        userInfo: bodyPlain,
        error: "Invalid signup info",
      });
      return NextResponse.json({ error: "Invalid signup info" }, { status: 400 });
    }

    // Find the Welcome Agent
    const localPart = agentNotifiactionEmail.split("@")[0];
    const { notificationEmail, error: notificationEmailError } = await mailgunUtils.findByLocalPart(
      { localPart },
    );
    if (!notificationEmail) {
      await createEmailRecord({
        agentId: "invalid-agent-id",
        agentName: "invalid-agent-name",
        workspaceId: "invalid-workspace-id",
        gmailConnectionId: "invalid-gmail-connection-id",
        recipientEmail: EMAIL,
        subject: "Invalid Notification Email",
        body: "Invalid notification email",
        status: "failed",
        userInfo: bodyPlain,
        error: notificationEmailError,
      });

      return NextResponse.json({ error: "Invalid notification email" }, { status: 404 });
    }

    // Get the agent configuration
    const { agent, error: agentError } = await welcomeAgentUtils.getWelcomeAgent({
      agentId: notificationEmail.agentId,
    });
    if (!agent) {
      await createEmailRecord({
        recipientEmail: EMAIL,
        agentId: "invalid-agent-id",
        agentName: "invalid-agent-name",
        gmailConnectionId: "invalid-gmail-connection-id",
        workspaceId: "invalid-workspace-id",
        subject: "Invalid Welcome Agent",
        body: "Invalid welcome agent",
        status: "failed",
        userInfo: bodyPlain,
        error: agentError,
      });
      return NextResponse.json({ error: "Welcome agent not found" }, { status: 404 });
    }

    if (agent.configuration?.emailAccount) {
      // Get the Gmail connection for this email account
      const { connection: gmailConnection, error: gmailConnectionError } =
        await gmailUtils.getConnectionByEmail({
          agentId: agent.id,
          email: agent.configuration.emailAccount,
        });
      if (!gmailConnection) {
        await createEmailRecord({
          recipientEmail: EMAIL,
          agentId: agent.id,
          agentName: agent.name,
          workspaceId: agent.workspaceId,
          gmailConnectionId: "invalid-gmail-connection-id",
          subject: "Invalid Gmail Connection",
          body: "Invalid gmail connection",
          status: "failed",
          userInfo: bodyPlain,
          businessContext: agent.businessContext,
          error: gmailConnectionError,
        });

        return NextResponse.json(
          { error: `No Gmail connection found for ${agent.configuration.emailAccount}` },
          { status: 400 },
        );
      }

      // Generate the email content
      const {
        success: generateEmailSuccess,
        error: generateEmailError,
        email,
      } = await generateEmail({
        senderName: gmailConnection.name,
        signupInfo: bodyPlain,
        directive: agent.businessContext?.purpose,
        businessContext: {
          website: agent.businessContext?.website,
          purpose: agent.businessContext?.purpose,
          websiteSummary: agent.businessContext?.websiteSummary,
          additionalContext: agent.businessContext?.additionalContext,
        },
        workspaceId: agent.workspaceId,
      });

      if (generateEmailSuccess) {
        // Check if email should be reviewed before sending
        const shouldReview = agent.configuration?.settings?.reviewBeforeSending;
        if (shouldReview) {
          await createEmailRecord({
            recipientEmail: EMAIL,
            agentId: agent.id,
            agentName: agent.name,
            workspaceId: agent.workspaceId,
            gmailConnectionId: gmailConnection.id,
            subject: email.subject,
            body: email.body,
            status: "under_review",
            userInfo: bodyPlain,
            businessContext: agent.businessContext,
          });

          return NextResponse.json({
            success: true,
            message: "Email queued for review",
          });
        }

        const { success: gmailSuccess, error: gmailError } = await gmailUtils.sendEmail({
          connectionId: gmailConnection.id,
          to: email.to,
          subject: email.subject,
          body: email.body,
          isTest: false,
        });

        if (gmailSuccess) {
          await createEmailRecord({
            recipientEmail: email.to,
            agentId: agent.id,
            agentName: agent.name,
            workspaceId: agent.workspaceId,
            subject: email.subject,
            body: email.body,
            status: "sent",
            gmailConnectionId: gmailConnection.id,
            userInfo: bodyPlain,
            businessContext: agent.businessContext,
          });
          return NextResponse.json({ success: true, message: "Email sent successfully" });
        } else {
          await createEmailRecord({
            recipientEmail: email.to,
            agentId: agent.id,
            agentName: agent.name,
            workspaceId: agent.workspaceId,
            subject: email.subject,
            body: email.body,
            status: "failed",
            gmailConnectionId: gmailConnection.id,
            userInfo: bodyPlain,
            businessContext: agent.businessContext,
            error: gmailError,
          });
          return NextResponse.json({ error: gmailError }, { status: 400 });
        }
      } else if (generateEmailError) {
        await createEmailRecord({
          recipientEmail: EMAIL,
          agentId: agent.id,
          agentName: agent.name,
          workspaceId: agent.workspaceId,
          subject: "Invalid Email Generation",
          body: bodyPlain,
          status: "failed",
          gmailConnectionId: "invalid-gmail-connection-id",
          userInfo: bodyPlain,
          businessContext: agent.businessContext,
          error: generateEmailError,
        });

        return NextResponse.json({ error: generateEmailError }, { status: 400 });
      }
    } else {
      await createEmailRecord({
        recipientEmail: EMAIL,
        agentId: agent.id,
        agentName: agent.name,
        workspaceId: agent.workspaceId,
        subject: "Invalid Email Generation",
        body: bodyPlain,
        status: "failed",
        gmailConnectionId: "invalid-gmail-connection-id",
        userInfo: bodyPlain,
        businessContext: agent.businessContext,
        error: "No email account configured for this agent",
      });

      return NextResponse.json(
        { error: "No email account configured for this agent" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    await createEmailRecord({
      recipientEmail: "invalid-recipient-email",
      agentId: "invalid-agent-id",
      agentName: "invalid-agent-name",
      workspaceId: "invalid-workspace-id",
      subject: "Internal Server Error",
      body: "Invalid body",
      status: "failed",
      gmailConnectionId: "invalid-gmail-connection-id",
      userInfo: "Invalid user info",
      error: "Internal server error",
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
