import NewWelcomeAgent from "../welcome-agent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Agent",
  description: "Create a new Welcome Agent to automate your welcome email campaigns",
};

export default function NewAgentPage() {
  return <NewWelcomeAgent />;
}
