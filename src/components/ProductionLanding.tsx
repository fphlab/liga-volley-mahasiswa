'use client';

import React from 'react';
import Image from 'next/image';

export default function ProductionLanding() {
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
    </div>
  );
}
