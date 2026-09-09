'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAppMode } from './AppModeContext';
import { useRouter } from 'next/navigation';

export default function ProductionLanding() {
  const { enterPortal } = useAppMode();
  const router = useRouter();

  const handleOpenPortal = () => {
    enterPortal();
    router.push('/');
  };

  return (
    <div
      className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden bg-lvm-production select-none"
      style={{
        backgroundColor: '#260c71',
      }}
    >
      {/* Decorative ambient subtle light reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-pink-600/10 blur-3xl"
      />

      {/* Main Logo Display matching the official brand graphics */}
      <main className="w-full max-w-4xl xl:max-w-5xl px-4 sm:px-8 py-6 flex items-center justify-center z-10 animate-fadeIn">
        <div className="relative w-full aspect-[16/9] flex items-center justify-center">
          <Image
            src="/lvm.png"
            alt="LIGA VOLI MAHASISWA (LVM)"
            width={1600}
            height={900}
            priority
            className="w-full h-auto max-h-[85vh] object-contain drop-shadow-[0_15px_35px_rgba(0,0,0,0.35)] transition-transform duration-700 hover:scale-[1.01]"
          />
        </div>
      </main>

      {/* Subtle Portal Access Button for Panitia / User Testing */}
      <div className="absolute bottom-5 sm:bottom-7 z-20 flex items-center gap-3 animate-fadeIn">
        <button
          onClick={handleOpenPortal}
          className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-purple-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md transition-all shadow-lg hover:shadow-neon-pink flex items-center gap-2 cursor-pointer group active:scale-95"
        >
          <ShieldCheck className="w-4 h-4 text-pink-400" />
          <span>Buka Portal Sistem LVM</span>
          <ArrowRight className="w-3.5 h-3.5 text-pink-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
