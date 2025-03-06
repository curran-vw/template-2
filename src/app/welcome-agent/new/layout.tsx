import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Agent - Welcome Agent',
  description: 'Edit your Welcome Agent',
};

export default function NewWelcomeAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 