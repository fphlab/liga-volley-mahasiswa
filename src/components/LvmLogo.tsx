'use client';

import React from 'react';

interface LvmLogoProps {
  variant?: 'full' | 'compact' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  darkText?: boolean;
}

export default function LvmLogo({
  variant = 'compact',
  size = 'md',
  className = '',
  darkText = false,
}: LvmLogoProps) {
  // Dimension mappings
  const shieldDimensions = {
    sm: { width: 30, height: 36 },
    md: { width: 40, height: 48 },
    lg: { width: 68, height: 82 },
    xl: { width: 100, height: 120 },
  };

  const { width: sW, height: sH } = shieldDimensions[size];

  // Shield Emblem SVG
  const ShieldEmblem = (
    <svg
      width={sW}
      height={sH}
      viewBox="0 0 120 144"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform group-hover:scale-105"
    >
      <defs>
        <linearGradient id="shieldBgGrad" x1="60" y1="0" x2="60" y2="144" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2D0B5A" />
          <stop offset="100%" stopColor="#140428" />
        </linearGradient>
      </defs>

      {/* Shield Background Fill */}
      <path
        d="M16 10 H104 V82 C104 112 60 134 60 134 C60 134 16 112 16 82 Z"
        fill="url(#shieldBgGrad)"
      />

      {/* Shield Neon Pink / Magenta Border */}
      <path
        d="M16 10 H104 V82 C104 112 60 134 60 134 C60 134 16 112 16 82 Z"
        stroke="#FF007F"
        strokeWidth="9"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* "LVM" Text inside Top Shield */}
      <text
        x="60"
        y="42"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="25"
        letterSpacing="2"
      >
        LVM
      </text>

      {/* Volleyball in Center/Bottom Shield */}
      <g transform="translate(60, 84)">
        {/* Outer Pink Ball Rim */}
        <circle cx="0" cy="0" r="28" fill="#FF007F" />
        <circle cx="0" cy="0" r="25.5" fill="#FFFFFF" />

        {/* Volleyball Seam Curves and Panels */}
        <path
          d="M-25.5 0 C-10 -15 10 -15 25.5 0"
          stroke="#FF007F"
          strokeWidth="3.5"
          fill="none"
        />
        <path
          d="M0 -25.5 C-10 -10 -10 10 0 25.5"
          stroke="#FF007F"
          strokeWidth="3.5"
          fill="none"
        />
        <path
          d="M-18 -18 C-4 0 4 0 18 18"
          stroke="#FF007F"
          strokeWidth="3.5"
          fill="none"
        />
        <path
          d="M-18 18 C0 4 0 -4 18 -18"
          stroke="#FF007F"
          strokeWidth="3.5"
          fill="none"
        />
        
        {/* Ball Center point */}
        <circle cx="0" cy="0" r="4.5" fill="#FF007F" />
      </g>
    </svg>
  );

  if (variant === 'icon-only') {
    return <div className={`inline-flex items-center ${className}`}>{ShieldEmblem}</div>;
  }

  const textColor = darkText
    ? 'text-slate-900 dark:text-white'
    : 'text-white';

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center gap-4 ${className}`}>
        {ShieldEmblem}
        <div className="flex flex-col select-none text-left">
          <div className="leading-none">
            <span
              className={`font-black italic tracking-tighter uppercase ${textColor}`}
              style={{
                fontSize: size === 'xl' ? '2.8rem' : size === 'lg' ? '2rem' : '1.35rem',
                lineHeight: 0.88,
                display: 'block',
              }}
            >
              LIGA
            </span>
          </div>
          <div className="leading-none mt-1">
            <span
              className={`font-black italic tracking-tighter uppercase ${textColor}`}
              style={{
                fontSize: size === 'xl' ? '2.8rem' : size === 'lg' ? '2rem' : '1.35rem',
                lineHeight: 0.88,
                display: 'block',
              }}
            >
              VOLI
            </span>
          </div>
          <div className="leading-none mt-1.5">
            <span
              className={`font-extrabold uppercase tracking-widest ${textColor} opacity-95`}
              style={{
                fontSize: size === 'xl' ? '1rem' : size === 'lg' ? '0.72rem' : '0.52rem',
                letterSpacing: '0.16em',
                display: 'block',
              }}
            >
              MAHASISWA
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant (used for Navbar)
  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {ShieldEmblem}
      <div className="flex flex-col select-none">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span
            className={`font-black italic tracking-tight uppercase ${
              darkText ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'
            } text-sm sm:text-base`}
          >
            LIGA VOLI MAHASISWA
          </span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-pink-600 dark:text-pink-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
          <span>Portal Nasional • 3 Regional</span>
        </div>
      </div>
    </div>
  );
}
