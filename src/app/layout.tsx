import './globals.css';
import { DM_Sans } from 'next/font/google';
import ClientLayout from './client-layout';
import type { Metadata } from 'next';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Welcome Agent',
  description: 'Automate your welcome email campaigns',
  icons: {
    icon: [
      { url: '/wa-favicon.png' },
      { url: '/favicon.ico' }
    ],
    shortcut: '/wa-favicon.png',
    apple: '/wa-favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
