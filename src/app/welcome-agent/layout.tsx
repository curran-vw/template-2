import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Agents - Welcome Agent',
  description: 'A list of your Welcome Agents',
};

export default function WelcomeAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-full">{children}</div>;
} 