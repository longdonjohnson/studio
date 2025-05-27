
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import {TermsAndConditions} from '@/components/terms-and-conditions';
import {ThemeProvider} from "@/components/theme-provider";
import DynamicNeonBackground from '@/components/ui/DynamicNeonBackground';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'KidenAi',
  description: 'A safe and fun chat app for kids!',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <DynamicNeonBackground />
        <TermsAndConditions/>
        {children}
        <Toaster/>
      </ThemeProvider>
      </body>
    </html>
  );
}
