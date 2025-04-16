import { getWelcomeAgent } from "@/firebase/welcome-agent-utils";
import WelcomeAgent from "../welcome-agent";
import { notFound } from "next/navigation";

export default async function WelcomeAgentPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { agent } = await getWelcomeAgent({ agentId: id });

  if (!agent) {
    notFound();
  }

  return <WelcomeAgent agent={agent} />;
}
