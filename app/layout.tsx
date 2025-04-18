import "./globals.css";
import { DM_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "sonner";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import type { Metadata } from "next";
import { TanstackProvider } from "@/lib/tanstack-provider";
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Welcome Agent",
  description: "Automate your welcome email campaigns",
  icons: {
    icon: [{ url: "/wa-favicon.png" }, { url: "/favicon.ico" }],
    shortcut: "/wa-favicon.png",
    apple: "/wa-favicon.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={`${dmSans.className} antialiased min-h-screen relative`}>
        <TanstackProvider>
          <WorkspaceProvider>
            <AuthProvider>{children}</AuthProvider>
          </WorkspaceProvider>
        </TanstackProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
