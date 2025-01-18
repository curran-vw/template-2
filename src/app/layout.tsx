'use client'

import './globals.css';
import { DM_Sans } from 'next/font/google';
import { AuthProvider } from '@/app/lib/contexts/AuthContext';
import { LayoutProvider } from './components/common/LayoutProvider';
import { ToastProvider } from '@/app/components/common/toast-context';
import { usePathname } from 'next/navigation';
import { Toaster } from "@/app/components/common/toaster"
import { WorkspaceProvider } from '@/app/lib/contexts/WorkspaceContext'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWelcomeAgentNew = pathname === '/welcome-agent/new';

  return (
    <html lang="en">
      <body className={`${dmSans.className} antialiased`}>
        <AuthProvider>
          <WorkspaceProvider>
            <ToastProvider>
              {isWelcomeAgentNew ? (
                children
              ) : (
                <LayoutProvider>
                  {children}
                </LayoutProvider>
              )}
              <Toaster />
            </ToastProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
