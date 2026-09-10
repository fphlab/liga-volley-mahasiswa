'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LvmLogo from '@/components/LvmLogo';
import { useAppMode } from '@/components/AppModeContext';
import ProductionLanding from '@/components/ProductionLanding';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isProductionHolding } = useAppMode();

  // Redirect any other route back to / if in production holding mode
  useEffect(() => {
    if (isProductionHolding && pathname !== '/' && pathname !== '/production') {
      router.replace('/');
    }
  }, [isProductionHolding, pathname, router]);

  // If in production holding mode or viewing /production, strictly show only the holding landing display
  if (isProductionHolding || pathname === '/production') {
    return (
      <main className="w-full min-h-screen min-h-[100dvh] flex flex-col bg-[#260c71]">
        <ProductionLanding />
      </main>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-[#fbfafd] dark:bg-[#0d041a] text-slate-900 dark:text-slate-100 selection:bg-pink-600 selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {children}
      </main>
      <footer className="relative border-t border-purple-100 dark:border-purple-950/80 bg-white/80 dark:bg-[#120624]/90 backdrop-blur-md py-5 sm:py-6 text-xs text-slate-500 dark:text-purple-300/70 print:hidden mt-14 transition-colors">
        {/* Top Accent Neon Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-80" />
        
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3.5 sm:gap-4 text-left">
          <Link
            href="/"
            className="inline-flex items-center shrink-0 group p-1.5 rounded-2xl bg-gradient-to-br from-[#1c083e] via-[#240a4e] to-[#120427] border border-purple-700/60 transition-all shadow-md group-hover:scale-105"
          >
            <LvmLogo variant="badge" size="md" />
          </Link>

          <div className="space-y-0.5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
              <span className="font-black text-slate-800 dark:text-purple-100 tracking-wider text-xs sm:text-sm uppercase">
                Liga Voli Mahasiswa (LVM)
              </span>
              <span className="hidden sm:inline text-purple-300 dark:text-purple-800">•</span>
              <span className="text-[11px] text-slate-500 dark:text-purple-300/70">
                Portal Resmi Manajemen Pendaftaran &amp; Sistem Informasi Kejuaraan
              </span>
            </div>
            <p className="text-slate-400 dark:text-purple-400/50 text-[10px]">
              &copy; {new Date().getFullYear()} Liga Voli Mahasiswa. Hak Cipta Dilindungi.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
