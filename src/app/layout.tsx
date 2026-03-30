import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import localFont from 'next/font/local';

const kenao = localFont({
  src: './Fonts/kenao.otf',
  variable: '--font-kenao',
});

export const metadata: Metadata = {
  title: 'Athena',
  description: 'A teacher-first assessment and reporting tool.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Kanit:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-sans antialiased', kenao.variable)} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
