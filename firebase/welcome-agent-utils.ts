"use server";

import { adminDb, adminAuth } from "../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { WelcomeAgent } from "../types/welcome-agent";
import * as gmailUtils from "./gmail-utils";
import { createEmailRecord } from "./email-history-utils";
import * as logsUtils from "./logs-utils";
import { requireAuth } from "@/server/auth";

export async function createWelcomeAgent({
  workspaceId,
  agent,
}: {
  workspaceId: string;
  agent: Omit<WelcomeAgent, "id" | "workspaceId" | "createdAt" | "updatedAt">;
}) {
  const user = await requireAuth();

  try {
    if (!workspaceId) {
      return { error: "Workspace ID is required" };
    }

    // Decrement the user's remaining agents
    const userRef = adminDb.collection("users").doc(user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return { error: "User document does not exist" };
    }

    // Get plan from database
    const planDoc = await adminDb.collection("plans").doc(user.plan).get();
    const planData = planDoc.data();

    // Check if user has reached their workspace limit
    if (user.usage.agents >= planData?.agents) {
      return { error: "You have reached the maximum number of agents for your plan" };
    }

    const timestamp = Date.now();
    const newAgent = {
      ...agent,
      workspaceId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Create the agent document
    const docRef = await adminDb.collection("welcome_agents").add(newAgent);

    // Update the user's remaining agents count
    await userRef.update({
      "usage.agents": FieldValue.increment(1),
    });

    const createdAgent = { ...newAgent, id: docRef.id };

    return { success: "Welcome agent created successfully", agent: createdAgent };
  } catch (error) {
    console.error("Error in createWelcomeAgent:", error);
    return { error: "An error occurred while creating the welcome agent" };
  }
}

export async function updateWelcomeAgent({
  agentId,
  updates,
}: {
  agentId: string;
  updates: Partial<WelcomeAgent>;
}) {
  const user = await requireAuth();

  try {
    if (!agentId) {
      return { error: "Agent ID is required" };
    }

    const docRef = adminDb.collection("welcome_agents").doc(agentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { error: "Welcome agent does not exist" };
    }

    const updates_with_timestamp = {
      ...updates,
      updatedAt: Date.now(),
    };

    await docRef.update(updates_with_timestamp);
    const updatedDocSnap = await docRef.get();

    if (!updatedDocSnap.exists) {
      return { error: "Welcome agent does not exist" };
    }

    const updatedAgent = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data(),
    } as WelcomeAgent;

    return { success: "Welcome agent updated successfully", agent: updatedAgent };
  } catch (error) {
    console.error("Error updating welcome agent:", error);
    return { error: "An error occurred while updating the welcome agent" };
  }
}

export async function getWelcomeAgent({ agentId }: { agentId: string }) {
  const user = await requireAuth();

  try {
    if (!agentId) {
      return { error: "Agent ID is required" };
    }

    const docRef = adminDb.collection("welcome_agents").doc(agentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { error: "Welcome agent does not exist" };
    }

    const agent = {
      id: docSnap.id,
      ...docSnap.data(),
    } as WelcomeAgent;

    return { success: "Welcome agent retrieved successfully", agent };
  } catch (error) {
    console.error("Error getting welcome agent:", error);
    return { error: "An error occurred while retrieving the welcome agent" };
  }
}

export async function getWelcomeAgentServer({ agentId }: { agentId: string }) {
  try {
    if (!agentId) {
      return { error: "Agent ID is required" };
    }

    const docRef = adminDb.collection("welcome_agents").doc(agentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { error: "Welcome agent does not exist" };
    }

    const agent = {
      id: docSnap.id,
      ...docSnap.data(),
    } as WelcomeAgent;

    return { success: "Welcome agent retrieved successfully", agent };
  } catch (error) {
    console.error("Error getting welcome agent:", error);
    return { error: "An error occurred while retrieving the welcome agent" };
  }
}

export async function getWorkspaceWelcomeAgents({ workspaceId }: { workspaceId: string }) {
  await requireAuth();

  try {
    if (!workspaceId) {
      return { error: "Workspace ID is required", agents: [] };
    }

    const agentsRef = adminDb.collection("welcome_agents");
    const q = agentsRef.where("workspaceId", "==", workspaceId);
    const querySnapshot = await q.get();

    const agents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WelcomeAgent[];

    return { success: "Welcome agents retrieved successfully", agents };
  } catch (error) {
    console.error("Error fetching welcome agents:", error);
    return { error: "An error occurred while retrieving welcome agents", agents: [] };
  }
}

export async function deleteWelcomeAgent({ agentId }: { agentId: string }) {
  const user = await requireAuth();

  try {
    if (!agentId) {
      return { error: "Agent ID is required" };
    }

    const docRef = adminDb.collection("welcome_agents").doc(agentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { error: "Welcome agent does not exist" };
    }

    // Delete the agent
    await docRef.delete();

    // Increment the user's remaining agents count
    const userRef = adminDb.collection("users").doc(user.id);
    await userRef.update({
      "usage.agents": FieldValue.increment(-1),
    });

    return { success: "Welcome agent deleted successfully" };
  } catch (error) {
    console.error("Error deleting welcome agent:", error);
    return { error: "An error occurred while deleting the welcome agent" };
  }
}

export async function generateWelcomeEmail({
  agent,
  signupInfo,
}: {
  agent: WelcomeAgent;
  signupInfo: string;
}) {
  const user = await requireAuth();

  try {
    if (!agent.configuration?.emailAccount) {
      return { error: "No email account configured for this agent" };
    }

    // Get the Gmail connection to get the sender's name
    const { connection: gmailConnection } = await gmailUtils.getConnectionByEmail({
      email: agent.configuration?.emailAccount,
    });
    const senderName = gmailConnection?.name || agent.configuration?.emailAccount;

    // Run first two prompts in parallel for performance
    const [userInfoResponse, businessInfoResponse] = await Promise.all([
      // First Prompt - User Info
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agentfolio.ai",
          "X-Title": "Agentfolio",
        },
        body: JSON.stringify({
          model: "perplexity/sonar",
          messages: [
            {
              role: "user",
              content: `Do a search for this user. Here's the sign up email we got with their info: ${
                signupInfo.rawContent
              }. 
            Make sure to only look at the user's info. 
            Come back with only info about who they are, what business they work for, etc. 
            Include contact information if you can find it. 
            Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
            For extra context, they signed up for: ${agent.businessContext?.purpose || ""}`,
            },
          ],
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
        return data?.choices?.[0]?.message?.content || "No user information found.";
      }),

      // Second Prompt - Business Info
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://agentfolio.ai",
          "X-Title": "Agentfolio",
        },
        body: JSON.stringify({
          model: "perplexity/sonar",
          messages: [
            {
              role: "user",
              content: `Do a search for the business associated with this signup: ${
                signupInfo.rawContent
              }... 
            Come back with only info about who they are, what business they do, industry, etc. 
            Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
            For extra context, they signed up for ${agent.businessContext?.purpose || ""}`,
            },
          ],
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
        return data?.choices?.[0]?.message?.content || "No business information found.";
      }),
    ]);

    // Third Prompt - Generate Email Body
    const emailBodyResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://agentfolio.ai",
        "X-Title": "Agentfolio",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.7-sonnet",
        messages: [
          {
            role: "user",
            content: `We are writing the HTML body using <p> and <br> tags of a personalized email today to a new lead that just signed up 
            (keep it max of 2-3 paragraphs and MAX 1-2 sentences per paragraph). 
            Do not include the subject line. 
            Make it read like a human sent it after looking up their company and make it clear we know what they do without jargon.  
            Make it pretty casual and welcoming with an 8th grade reading level. 
            If business info is unclear, keep it generic to the industry; if user info is clear, make it more specific.
            Don't use placeholders like [calendar link] and don't make note that it's a template.
            Address the person by first name if available (but just make it general if no name is provided). 
            Sign off with this exact name: ${senderName}

          Please use the following directive for your email. If it specifies a different length, please adjust accordingly: ${
            agent.emailPurpose?.directive || ""
          }  

          Here's the context on this person: ${userInfoResponse}  
          Here's the context on this person's business: ${businessInfoResponse}   
          Frame it in a way where you saw they just signed up for: ${
            agent.businessContext?.purpose || ""
          }
          And lastly, here's the context on my business: ${
            agent.businessContext?.websiteSummary || ""
          }`,
          },
        ],
      }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
      return data?.choices?.[0]?.message?.content || "Error generating email body.";
    });

    // Fourth Prompt - Generate Subject Line
    const subjectResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://agentfolio.ai",
        "X-Title": "Agentfolio",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.7-sonnet",
        messages: [
          {
            role: "user",
            content: `Write a short, email subject line for a personalized email to a new lead.
            Make it personal and seem like it is just a casual email from someone they know. Do not use placeholders or emojis. Do not put "Subject: " before the subject line. Just write the subject line and that's it.
            Context about them: ${userInfoResponse}`,
          },
        ],
      }),
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
      return data?.choices?.[0]?.message?.content || "Welcome!";
    });

    const emailDetails = {
      subject: subjectResponse,
      body: emailBodyResponse,
    };

    // Check if email should be reviewed before sending
    const shouldReview = agent.configuration?.settings?.reviewBeforeSending ?? false;
    const status = shouldReview ? "under_review" : "sent";

    // Get the Gmail connection ID
    const { connection: senderGmailConnection } = await gmailUtils.getConnectionByEmail({
      email: agent.configuration?.emailAccount,
    });
    if (!senderGmailConnection) {
      return {
        error: `No Gmail connection found for email: ${agent.configuration?.emailAccount}`,
      };
    }

    // Create email history record with AI responses
    try {
      const emailId = await createEmailRecord({
        recipientEmail: signupInfo.email || signupInfo.rawContent.email,
        agentId: agent.id || "",
        agentName: agent.name,
        workspaceId: agent.workspaceId,
        subject: emailDetails.subject,
        body: emailDetails.body,
        status,
        gmailConnectionId: senderGmailConnection.id,
        userInfo: userInfoResponse,
        businessInfo: businessInfoResponse,
      });

      // Log the email generation
      await logsUtils.addLog({
        type: "email",
        status: "success",
        details: `Generated email for ${signupInfo.email || signupInfo.rawContent.email}`,
        workspaceId: agent.workspaceId,
        agentId: agent.id,
      });

      return {
        success: "Welcome email generated successfully",
        id: emailId,
        subject: emailDetails.subject,
        body: emailDetails.body,
        status,
      };
    } catch (recordError) {
      console.error("Error recording email:", recordError);
      return { error: "An error occurred while recording the email" };
    }
  } catch (error) {
    console.error("Error generating welcome email:", error);

    // Create a record of the failed attempt
    const failedEmailDetails = {
      subject: `Welcome to ${agent.name}!`,
      body: `Thank you for signing up! We'll be in touch soon.`,
    };

    const { error: recordError } = await createEmailRecord({
      recipientEmail: signupInfo.email,
      agentId: agent.id || "",
      agentName: agent.name,
      workspaceId: agent.workspaceId,
      subject: failedEmailDetails.subject,
      body: failedEmailDetails.body,
      status: "failed",
      userInfo: "No user information available.",
      businessInfo: "No business information available.",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });

    if (recordError) {
      console.error("Error creating failure record:", recordError);
    }

    return {
      error: "An error occurred while generating the welcome email",
      ...failedEmailDetails,
    };
  }
}

export async function getWelcomeAgents({ workspaceId }: { workspaceId: string }) {
  const user = await requireAuth();
  try {
    const userId = user.id;

    if (!userId) {
      return { error: "User is not authenticated" };
    }

    if (!workspaceId) {
      return { error: "Workspace ID is required" };
    }

    const agentsRef = adminDb.collection("welcome_agents");
    const q = agentsRef.where("workspaceId", "==", workspaceId).orderBy("createdAt", "desc");
    const querySnapshot = await q.get();

    const agents = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WelcomeAgent[];

    return { success: "Welcome agents retrieved successfully", agents };
  } catch (error) {
    console.error("Error getting welcome agents:", error);
    return { error: "An error occurred while retrieving welcome agents" };
  }
}
