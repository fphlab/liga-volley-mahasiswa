'use client';

import React, { useEffect } from 'react';
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
      <footer className="relative border-t border-purple-100 dark:border-purple-950/80 bg-white/80 dark:bg-[#120624]/90 backdrop-blur-md py-8 text-center text-xs text-slate-500 dark:text-purple-300/70 print:hidden mt-14 transition-colors">
        {/* Top Accent Neon Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-80" />
        
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <LvmLogo variant="icon-only" size="sm" />
            <span className="font-black italic uppercase tracking-wider text-slate-900 dark:text-white text-sm">
              LIGA VOLI MAHASISWA
            </span>
          </div>

          <div className="space-y-1 max-w-2xl">
            <p className="font-bold text-slate-700 dark:text-purple-200 tracking-wide text-xs">
              REGISTRASI RESMI 36 TIM (18 PUTRA & 18 PUTRI) • 20 PERSONEL PER TIM
            </p>
            <p className="text-slate-500 dark:text-purple-400/60 text-[11px]">
              Regional Barat (DKI Jakarta, Jawa Barat, Banten) • Regional Tengah (Jawa Tengah, DI Yogyakarta) • Regional Timur (Jawa Timur, Bali)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
