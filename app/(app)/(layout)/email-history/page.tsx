import EmailHistory from "./email-history";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email History",
  description: "View and track your welcome email campaign history and performance",
};

export default function EmailHistoryPage() {
  return <EmailHistory />;
}
