import { Usage } from "@/components/usage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Usage & Billing",
  description: "View your usage and manage your billing through the Stripe customer portal",
};

export default function UsagePage() {
  return <Usage />;
}
