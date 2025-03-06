import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Welcome Agent',
  description: 'Sign in to Welcome Agent',
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 