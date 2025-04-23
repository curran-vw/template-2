import Dashboard from "./dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Welcome Agent Dashboard - Manage your welcome email campaigns",
};

export default function DashboardPage() {
  return <Dashboard />;
}
