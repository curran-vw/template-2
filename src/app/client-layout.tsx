'use client';

import { AuthProvider } from '@/app/lib/contexts/AuthContext';
import { LayoutProvider } from './components/common/LayoutProvider';
import { ToastProvider } from '@/app/components/common/toast-context';
import { Toaster } from "@/app/components/common/toaster";
import { WorkspaceProvider } from '@/app/lib/contexts/WorkspaceContext';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWelcomeAgentNew = pathname === '/welcome-agent/new';

  return (
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
  );
} 