"use server";

import { adminDb } from "../lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { WelcomeAgent } from "../types/welcome-agent";
import { requireAuth } from "@/firebase/auth-utils";
import { addLog } from "@/firebase/logs-utils";

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

    // Check if user has reached their agent limit
    if (user.usage.agents >= user.limits.agents) {
      return { error: "You have reached the maximum number of agents for your plan" };
    }

    const newAgent = {
      ...agent,
      workspaceId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (
      agent.configuration.emailAccount &&
      user.usage.connectedGmailAccounts >= user.limits.connectedGmailAccounts
    ) {
      return { error: "You have reached the maximum number of connected accounts for your plan" };
    } else {
      await userRef.update({
        "usage.connectedGmailAccounts": FieldValue.increment(1),
      });
    }

    // Create the agent document
    const docRef = await adminDb.collection("welcome_agents").add(newAgent);

    // Update the user's remaining agents count
    await userRef.update({
      "usage.agents": FieldValue.increment(1),
    });

    const createdAgent = {
      ...newAgent,
      id: docRef.id,
      createdAt: newAgent.createdAt.toDate(),
      updatedAt: newAgent.updatedAt.toDate(),
    };

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

    const agent = docSnap.data() as WelcomeAgent;
    const userRef = adminDb.collection("users").doc(user.id);
    if (
      !agent.configuration.emailAccount &&
      updates.configuration?.emailAccount &&
      user.usage.connectedGmailAccounts >= user.limits.connectedGmailAccounts
    ) {
      return { error: "You have reached the maximum number of connected accounts for your plan" };
    } else {
      await userRef.update({
        "usage.connectedGmailAccounts": FieldValue.increment(1),
      });
    }

    const updates_with_timestamp = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    await docRef.update(updates_with_timestamp);
    const updatedDocSnap = await docRef.get();

    if (!updatedDocSnap.exists) {
      return { error: "Welcome agent does not exist" };
    }

    const updatedAgent = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data(),
      createdAt: updatedDocSnap.data()?.createdAt?.toDate(),
      updatedAt: updatedDocSnap.data()?.updatedAt?.toDate(),
    } as WelcomeAgent;

    return { success: "Welcome agent updated successfully", agent: updatedAgent };
  } catch (error) {
    console.error("Error updating welcome agent:", error);
    return { error: "An error occurred while updating the welcome agent" };
  }
}

export async function getWelcomeAgent({ agentId }: { agentId: string }) {
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
      createdAt: docSnap.data()?.createdAt?.toDate(),
      updatedAt: docSnap.data()?.updatedAt?.toDate(),
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
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
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
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    })) as WelcomeAgent[];

    return { success: "Welcome agents retrieved successfully", agents };
  } catch (error) {
    console.error("Error getting welcome agents:", error);
    return { error: "An error occurred while retrieving welcome agents" };
  }
}

export async function generateEmail({
  senderName,
  signupInfo,
  directive,
  businessContext,
  workspaceId,
  agentId,
}: {
  senderName: string;
  signupInfo: string;
  directive: string;
  businessContext: {
    website: string;
    purpose: string;
    additionalContext?: string;
    websiteSummary?: string;
  };
  workspaceId: string;
  agentId?: string;
}) {
  try {
    const NAME = signupInfo.match(/Name: ([^\n]+)/)?.[1];
    const EMAIL = signupInfo.match(/Email: ([^\n]+)/)?.[1];
    const WEBSITE = signupInfo.match(/Website: ([^\n]+)/)?.[1];
    const ROLE = signupInfo.match(/Role: ([^\n]+)/)?.[1];
    if (!NAME || !EMAIL || !WEBSITE || !ROLE) {
      throw new Error("No name, email, website, or role found in signup info");
    }

    // Log the start of the process
    await addLog({
      type: "api",
      status: "pending",
      details: "Starting email generation process",
      workspaceId,
      agentId,
    });

    // Run first two prompts in parallel
    const [userInfo, businessInfo] = await Promise.all([
      // User Info Prompt
      (async () => {
        await addLog({
          type: "api",
          status: "pending",
          details: "Getting user information",
          workspaceId,
          agentId,
        });

        const userInfoResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                content: `Do a search for this user. Here's the sign up email we got with their info: ${signupInfo}. 
              Make sure to only look at the user's info. 
              Come back with only info about who they are, what business they work for, etc. 
              Include contact information if you can find it. 
              Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
              For extra context, they signed up for: ${businessContext.purpose}`,
              },
            ],
          }),
        });

        if (!userInfoResponse.ok) {
          throw new Error(
            `Failed to get user info: ${userInfoResponse.status} ${userInfoResponse.statusText}`,
          );
        }
        const data = await userInfoResponse.json();
        const info = data.choices[0].message.content;

        await addLog({
          type: "api",
          status: "success",
          details: "Successfully retrieved user information",
          response: info,
          workspaceId,
          agentId,
        });

        return info;
      })(),

      // Business Info Prompt
      (async () => {
        await addLog({
          type: "api",
          status: "pending",
          details: "Getting business information",
          workspaceId,
          agentId,
        });

        const businessInfoResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                content: `Do a search for the business associated with this signup: ${signupInfo}... 
              -- Come back with only info about who they are, what business they do, industry, etc. 
              Give extreme weight to the EXACT domain listed in the email as this is likely the business they work for. 
              For extra context, they signed up for ${businessContext.purpose}`,
              },
            ],
          }),
        });

        if (!businessInfoResponse.ok) {
          throw new Error(
            `Failed to get business info: ${businessInfoResponse.status} ${businessInfoResponse.statusText}`,
          );
        }
        const data = await businessInfoResponse.json();
        const info = data.choices[0].message.content;

        await addLog({
          type: "api",
          status: "success",
          details: "Successfully retrieved business information",
          response: info,
          workspaceId,
          agentId,
        });

        return info;
      })(),
    ]);

    // Now run email body and subject generation in parallel
    const [emailBody, subject] = await Promise.all([
      // Generate Email Body
      (async () => {
        await addLog({
          type: "api",
          status: "pending",
          details: "Generating email body",
          workspaceId,
          agentId,
        });

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
                content: `We are writing the body of a personalized email today to a new lead that just signed up 
              (keep it max of 2-3 paragraphs and MAX 1-2 sentences per paragraph). 
              Do not include the subject line. 
              Make it read like a human sent it after looking up their company and make it clear we know what they do without jargon.  
              Make it pretty casual and welcoming with an 8th grade reading level. 
              If there's no specific info at all about the signup, just make it generic 
              (and don't make a note that it is a template). 
              Address the person by first name if available (but just make it general if no name is provided). 
              Sign off from the name ${senderName}

              Please use the following directive for your email. If it specifies a different length, please adjust accordingly: ${directive}

              Here's the context on this person: ${userInfo}  
              Here's the context on this person's business: ${businessInfo}   
              Frame it in a way where you saw they just signed up for: ${businessContext.purpose}
              And lastly, here's the context on my business: ${businessContext.websiteSummary} ${
                  businessContext.additionalContext || ""
                }`,
              },
            ],
          }),
        });

        if (!emailBodyResponse.ok) throw new Error("Failed to generate email body");
        const data = await emailBodyResponse.json();
        const body = data.choices[0].message.content;

        await addLog({
          type: "api",
          status: "success",
          details: "Successfully generated email body",
          response: body,
          workspaceId,
          agentId,
        });

        return body;
      })(),

      // Generate Subject Line (can start this at the same time as the body)
      (async () => {
        await addLog({
          type: "api",
          status: "pending",
          details: "Generating subject line",
          workspaceId,
          agentId,
        });

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
              Context about them: ${userInfo}`,
              },
            ],
          }),
        });

        if (!subjectResponse.ok) throw new Error("Failed to generate subject line");
        const data = await subjectResponse.json();
        const subject = data.choices[0].message.content;

        await addLog({
          type: "api",
          status: "success",
          details: "Successfully generated subject line",
          response: subject,
          workspaceId,
          agentId,
        });

        return subject;
      })(),
    ]);

    // Log successful completion
    await addLog({
      type: "api",
      status: "success",
      details: "Email generation completed successfully",
      workspaceId,
      agentId,
    });

    return {
      success: true,
      email: {
        to: EMAIL,
        subject,
        body: emailBody,
      },
    };
  } catch (error) {
    await addLog({
      type: "api",
      status: "failed",
      details: "Email generation failed",
      response: error instanceof Error ? `${error.name}: ${error.message}` : "Unknown error",
      workspaceId: workspaceId || "",
      agentId: agentId || "",
    });

    return {
      error: "Failed to generate email",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
