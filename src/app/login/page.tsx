'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, LogIn, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useAppMode } from '@/components/AppModeContext';
import ProductionLanding from '@/components/ProductionLanding';

function safeRedirectTarget(from: string | null): string {
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    return from;
  }
  return '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, login } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const target = safeRedirectTarget(searchParams.get('from'));

  useEffect(() => {
    if (status === 'authed') {
      router.replace(target);
    }
  }, [status, target, router]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-16">
        <p className="text-sm text-slate-500 dark:text-purple-300/70 animate-pulse">
          Memuat sesi…
        </p>
      </div>
    );
  }

  if (status === 'authed') {
    return (
      <div className="flex justify-center py-16">
        <p className="text-sm text-slate-500 dark:text-purple-300/70">
          Anda sudah masuk. Mengalihkan…
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError('Silakan masukkan Kode Akses Anda.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await login(trimmed);
    setSubmitting(false);
    if (result.ok) {
      router.replace(target);
    } else {
      setError(result.error ?? 'Kode Akses tidak terdaftar.');
    }
  };

  return (
    <div className="flex justify-center py-10 sm:py-14">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-purple-100 dark:border-purple-950/80 bg-white dark:bg-[#120624] shadow-sm">
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-700 via-pink-500 to-purple-600" />
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-700 to-pink-600 text-white shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Masuk Portal LVM
              </h1>
              <p className="text-xs text-slate-500 dark:text-purple-300/70">
                Liga Voli Mahasiswa Nasional
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600 dark:text-purple-200/80">
            Masukkan Kode Akses yang diberikan panitia untuk membuka portal.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="access-code"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-purple-200/80"
              >
                Kode Akses
              </label>
              <input
                id="access-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="cth: A3FO7VU"
                autoComplete="off"
                autoFocus
                disabled={submitting}
                className="w-full rounded-lg border border-purple-200 dark:border-purple-900 bg-white dark:bg-[#1c083e] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-purple-300/40 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/30 disabled:opacity-60"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-all hover:bg-pink-500 active:scale-[0.99] disabled:opacity-60"
            >
              <LogIn className="h-4 w-4 stroke-[2.5]" />
              <span>{submitting ? 'Memeriksa…' : 'Masuk'}</span>
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-purple-300/50">
            Belum punya Kode Akses? Hubungi panitia penyelenggara.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { isProductionHolding } = useAppMode();

  if (isProductionHolding) {
    return <ProductionLanding />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <p className="text-sm text-slate-500 dark:text-purple-300/70 animate-pulse">
            Memuat…
          </p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
