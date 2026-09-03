'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Database,
  CheckCircle2,
  Menu,
  X,
  ChevronRight,
  FileText,
  LayoutDashboard
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LvmLogo from './LvmLogo';

export default function Navbar() {
  const pathname = usePathname();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSeed = async () => {
    if (!confirm('Muat data simulasi 6 tim lengkap beserta 20 personel per tim?')) {
      return;
    }
    try {
      setSeeding(true);
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSeedMessage('Data simulasi 6 tim berhasil dimuat!');
        setTimeout(() => {
          setSeedMessage(null);
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memuat data demo');
    } finally {
      setSeeding(false);
    }
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/register', label: 'Pendaftaran', icon: Plus },
    { href: '/reports', label: 'Laporan Resmi', icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#120624]/90 backdrop-blur-md border-b border-purple-100 dark:border-purple-950/80 transition-colors">
      {/* Top Accent Gradient Strip */}
      <div className="h-[2.5px] w-full bg-gradient-to-r from-purple-700 via-pink-500 to-purple-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Logo with Shield Emblem */}
          <Link href="/" className="flex items-center group">
            <LvmLogo variant="compact" size="md" darkText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => {
              const isActive = pathname === link.href;
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

          {/* Desktop Right Action Bar */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {/* Subtle Demo Seed Button */}
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-purple-300 hover:text-pink-600 dark:hover:text-white bg-purple-50/70 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200/60 dark:border-purple-800/50 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Isi data demo untuk pengujian"
            >
              <Database className={`w-3.5 h-3.5 text-pink-500 ${seeding ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">{seeding ? 'Memuat...' : 'Data Demo'}</span>
            </button>

            {/* Primary Action Button */}
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Daftar Tim</span>
            </Link>
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

      {/* Seed notification toast */}
      {seedMessage && (
        <div className="bg-pink-600 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 animate-fadeIn shadow-neon-pink">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {seedMessage}
        </div>
      )}

      {/* Mobile Slide-Down Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-purple-100 dark:border-purple-950 bg-white dark:bg-[#15072c] px-4 py-4 space-y-3 animate-fadeIn">
          <div className="space-y-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
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

          <div className="pt-2 border-t border-purple-100 dark:border-purple-950 flex flex-col gap-2">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Daftarkan Tim Baru</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSeed();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60"
            >
              <Database className="w-3.5 h-3.5 text-pink-500" />
              <span>Isi Data Demo Simulasi</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
