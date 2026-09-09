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
      sm: 'h-8 w-8',
      md: 'h-10 w-10 sm:h-11 sm:w-11',
      lg: 'h-14 w-14 sm:h-16 sm:w-16',
      xl: 'h-20 w-20 sm:h-24 sm:w-24',
    };
    const bClass = badgeSizes[size] || badgeSizes.md;

    return (
      <div className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}>
        <Image
          src="/lvm-badge.webp"
          alt="LVM Badge"
          width={1080}
          height={1080}
          priority={priority}
          className={`${bClass} object-contain drop-shadow-[0_2px_10px_rgba(232,2,166,0.35)] transition-transform group-hover:scale-105`}
        />
      </div>
    );
  }

  // Full variant (used for Hero banner): public/lvm-logo.png
  const heightClasses = {
    sm: 'h-7 sm:h-8',           // ~28-32px
    md: 'h-8 sm:h-9 md:h-10',   // ~32-40px
    lg: 'h-16 sm:h-20 md:h-22', // ~64-88px (Hero banner)
    xl: 'h-24 sm:h-28',         // ~96-112px
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
        className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,0,127,0.45)] transition-transform duration-300 group-hover:scale-[1.02]"
      />
    </div>
  );
}
