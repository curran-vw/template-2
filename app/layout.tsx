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
  title: {
    default: "Welcome Agent",
    template: "%s | Welcome Agent",
  },
  description: "Automate your welcome email campaigns",
  icons: {
    icon: [{ url: "/wa-favicon.png" }, { url: "/favicon.ico" }],
    shortcut: "/wa-favicon.png",
    apple: "/wa-favicon.png",
  },
  openGraph: {
    title: "Welcome Agent",
    description: "Automate your welcome email campaigns",
    url: "https://welcomeagent.ai",
    siteName: "Welcome Agent",
    images: [
      {
        url: "/wa-favicon.png",
        width: 1200,
        height: 630,
        alt: "Welcome Agent Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Welcome Agent",
    description: "Automate your welcome email campaigns",
    images: ["/wa-favicon.png"],
    creator: "@welcomeagent",
  },
  metadataBase: new URL("https://welcomeagent.ai"),
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
