import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Welcome Agent',
  description: 'Welcome Agent dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 