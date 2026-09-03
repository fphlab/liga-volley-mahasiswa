import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppModeProvider } from '@/components/AppModeContext';
import AppShell from '@/components/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'LIGA VOLI MAHASISWA (LVM) - Portal Resmi',
  description: 'Sistem Informasi Resmi Registrasi Peserta dan Modul Pelaporan Liga Voli Mahasiswa Nasional.',
  openGraph: {
    title: 'LIGA VOLI MAHASISWA (LVM)',
    description: 'Portal Resmi Liga Voli Mahasiswa Nasional.',
    images: ['/images/lvm-brand-logo.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col selection:bg-pink-600 selection:text-white">
        <ThemeProvider>
          <AppModeProvider>
            <AppShell>{children}</AppShell>
          </AppModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
