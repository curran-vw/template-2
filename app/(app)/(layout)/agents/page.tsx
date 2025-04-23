import Agents from "./agents";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agents",
  description:
    "Manage your Welcome Agents - Create and configure automated welcome email campaigns",
};

export default async function AgentsPage() {
  return <Agents />;
}
