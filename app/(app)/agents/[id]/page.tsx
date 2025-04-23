import { getWelcomeAgent } from "@/firebase/welcome-agent-utils";
import WelcomeAgent from "../welcome-agent";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { id } = params;
  const { agent } = await getWelcomeAgent({ agentId: id });

  if (!agent) {
    return {
      title: "Agent Not Found",
      description: "The requested Welcome Agent could not be found",
    };
  }

  return {
    title: agent.name,
    description: `Manage and configure your ${agent.name} Welcome Agent for automated welcome emails`,
  };
}

export default async function WelcomeAgentPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { agent } = await getWelcomeAgent({ agentId: id });

  if (!agent) {
    notFound();
  }

  return <WelcomeAgent agent={agent} />;
}
