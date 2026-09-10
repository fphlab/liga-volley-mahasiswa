'use client';

import React from 'react';
import Image from 'next/image';

export interface LvmLogoProps {
  variant?: 'full' | 'compact' | 'icon-only' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  darkText?: boolean;
  priority?: boolean;
}

export default function LvmLogo({
  variant = 'full',
  size = 'md',
  className = '',
  priority = false,
}: LvmLogoProps) {
  // If variant is 'badge' or 'icon-only', render the official lvm-badge.webp directly
  if (variant === 'badge' || variant === 'icon-only') {
    const badgeSizes = {
      sm: 'h-9 w-9 sm:h-10 sm:w-10',       // ~36-40px
      md: 'h-12 w-12 sm:h-14 sm:w-14',     // ~48-56px (prominent on mobile & desktop)
      lg: 'h-16 w-16 sm:h-20 sm:w-20',     // ~64-80px
      xl: 'h-24 w-24 sm:h-28 sm:w-28',     // ~96-112px
    };
    const bClass = badgeSizes[size] || badgeSizes.md;

    return (
      <div className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}>
        <Image
          src="/lvm-badge.webp"
          alt="LVM - Liga Voli Mahasiswa"
          width={1080}
          height={1080}
          priority={priority}
          className={`${bClass} object-contain drop-shadow-[0_2px_12px_rgba(232,2,166,0.4)] transition-transform group-hover:scale-105`}
        />
      </div>
    );
  }

  // Full variant (used for Hero banner): public/lvm-logo.png
  const heightClasses = {
    sm: 'h-8 sm:h-9',           // ~32-36px
    md: 'h-11 sm:h-13 md:h-14', // ~44-56px
    lg: 'h-20 sm:h-24 md:h-28', // ~80-112px (Hero banner)
    xl: 'h-28 sm:h-36',         // ~112-144px
  };

  const hClass = heightClasses[size] || heightClasses.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 aspect-[949/545] ${hClass} ${className}`}
    >
      <Image
        src="/lvm-logo.png"
        alt="LIGA VOLI MAHASISWA (LVM)"
        width={949}
        height={545}
        priority={priority}
        className="w-full h-full object-contain filter drop-shadow-[0_0_25px_rgba(255,0,127,0.5)] transition-transform duration-300 group-hover:scale-[1.02]"
      />
    </div>
  );
}
