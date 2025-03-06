import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Email History - Welcome Agent',
  description: 'View your Welcome Agent email history',
};

export default function EmailHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 