import Logs from "./logs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Logs",
  description: "Monitor system logs and track the performance of your welcome email campaigns",
};

export default function LogsPage() {
  return <Logs />;
}
