'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Menu,
  X,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LvmLogo from './LvmLogo';
import { useAuth } from './AuthContext';
import type { AccessRole } from '@/lib/accessCodes';

function roleBadge(role: AccessRole, subject: string): { text: string; className: string } {
  switch (role) {
    case 'panpel':
      return {
        text: `🛡️ Panpel (${subject})`,
        className:
          'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30',
      };
    case 'mojisport':
      return {
        text: `📺 MojiSport (${subject})`,
        className:
          'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30',
      };
    case 'peserta':
      return {
        text: `🏐 Peserta (${subject})`,
        className:
          'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      };
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { status, role, subject, logout } = useAuth();
  const isAuthed = status === 'authed' && Boolean(role) && Boolean(subject);
  const badge = isAuthed && role && subject ? roleBadge(role, subject) : null;

  const isRegister = pathname === '/' || pathname === '/register';
  const navLinks = [
    { href: '/', label: 'Pendaftaran', icon: Plus, active: isRegister },
    { href: '/dashboard', label: 'Dashboard & Tim', icon: LayoutDashboard, active: pathname === '/dashboard' },
    { href: '/reports', label: 'Laporan Resmi', icon: FileText, active: pathname === '/reports' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#120624]/90 backdrop-blur-md border-b border-purple-100 dark:border-purple-950/80 transition-colors">
      {/* Top Accent Gradient Strip */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-purple-700 via-pink-500 to-purple-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Brand Logo - Badge Only */}
          <Link
            href="/"
            className="flex items-center group transition-all shrink-0"
            aria-label="LVM - Liga Voli Mahasiswa"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 aspect-square rounded-2xl bg-gradient-to-br from-[#1c083e] via-[#240a4e] to-[#120427] border border-purple-700/60 shadow-md transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center p-1 sm:p-1.5">
              <LvmLogo variant="badge" size="md" priority />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          {isAuthed && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => {
              const isActive = link.active;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-bold uppercase tracking-wider py-1.5 transition-all relative ${
                    isActive
                      ? 'text-pink-600 dark:text-pink-400'
                      : 'text-slate-600 dark:text-purple-200/70 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full shadow-neon-pink" />
                  )}
                </Link>
              );
            })}
          </nav>
          )}

          {/* Desktop Right Action Bar */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {isAuthed && badge ? (
              <>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.className}`}
                >
                  {badge.text}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider border border-purple-200 dark:border-purple-800 text-slate-600 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/60 active:scale-95 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Keluar</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-sm active:scale-95 transition-all"
              >
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Masuk</span>
              </Link>
            )}

            {isAuthed && (
            <>
            {/* Primary Action Button */}
            <Link
              href={isRegister ? '/dashboard' : '/'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-sm active:scale-95 transition-all"
            >
              {isRegister ? (
                <>
                  <LayoutDashboard className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Lihat Tim</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Daftar Tim</span>
                </>
              )}
            </Link>
            </>
            )}
          </div>

          {/* Mobile Right Bar (Theme Toggle + Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/60 transition-colors"
              aria-label="Buka Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-purple-100 dark:border-purple-950 bg-white dark:bg-[#15072c] px-4 py-4 space-y-3 animate-fadeIn">
          {isAuthed && badge && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.className}`}
            >
              {badge.text}
            </span>
          )}
          {isAuthed && (
          <div className="space-y-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = link.active;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-pink-50 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30'
                      : 'text-slate-700 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              );
            })}
          </div>
          )}

          <div className="pt-2 border-t border-purple-100 dark:border-purple-950 flex flex-col gap-2">
            {isAuthed ? (
              <>
              <Link
              href={isRegister ? '/dashboard' : '/'}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-sm"
            >
              {isRegister ? (
                <>
                  <LayoutDashboard className="w-4 h-4 stroke-[2.5]" />
                  <span>Lihat Dashboard &amp; Tim</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Daftarkan Tim Baru</span>
                </>
              )}
            </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void logout();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider border border-purple-200 dark:border-purple-800 text-slate-600 dark:text-purple-200"
              >
                <LogOut className="w-4 h-4 stroke-[2.5]" />
                <span>Keluar</span>
              </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-sm"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>Masuk</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
