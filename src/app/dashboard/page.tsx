'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Users,
  UserCheck,
  MapPin,
  FileText,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  Shield,
  Building2,
  BadgeCheck
} from 'lucide-react';
import { Team, RegionalQuota } from '@/lib/types';
import QuotaCard from '@/components/QuotaCard';
import LvmLogo from '@/components/LvmLogo';
import { useAppMode } from '@/components/AppModeContext';
import { useAuth } from '@/components/AuthContext';
import ProductionLanding from '@/components/ProductionLanding';

interface AccountCodeEntry {
  id: string;
  label: string;
  role: string;
  code: string;
  teamId: string | null;
  teamName: string | null;
  revoked: boolean;
}

export default function DashboardPage() {
  const { isProductionHolding } = useAppMode();
  const { role, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [quota, setQuota] = useState<RegionalQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [codes, setCodes] = useState<AccountCodeEntry[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [freshCodes, setFreshCodes] = useState<Record<string, string>>({});
  const [busyAccountId, setBusyAccountId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<Record<string, string>>({});
  const [bindPicker, setBindPicker] = useState<Record<string, string>>({});

  const isPanpel = role === 'panpel';
  const isMojisport = role === 'mojisport';

  const handleAuthError = useCallback(
    async (res: Response, data: { error?: string } | null, fallback: string): Promise<boolean> => {
      if (res.status === 401) {
        await logout();
        return true;
      }
      if (res.status === 403) {
        alert(data?.error ?? fallback);
        return true;
      }
      return false;
    },
    [logout]
  );

  // Gaya promise-chain (bukan async/await) agar pemanggilan dari useEffect
  // tidak dianggap setState sinkron oleh react-hooks/set-state-in-effect.
  const fetchData = useCallback(() => {
    return fetch('/api/teams', { cache: 'no-store' })
      .then((res) =>
        res
          .json()
          .catch(() => null)
          .then(
            (
              data: {
                success: boolean;
                teams?: Team[];
                quota?: RegionalQuota[];
                error?: string;
              } | null
            ) => ({ res, data })
          )
      )
      .then(({ res, data }) => {
        if (!res.ok) {
          void handleAuthError(res, data, 'Akses ditolak.').then((handled) => {
            if (!handled) alert(data?.error ?? 'Gagal memuat data tim.');
          });
          return;
        }
        if (data?.success) {
          setTeams(data.teams ?? []);
          setQuota(data.quota ?? []);
        }
      })
      .catch((err: unknown) => {
        console.error('Error fetching data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [handleAuthError]);

  const fetchCodes = useCallback(() => {
    return fetch('/api/auth/codes', { cache: 'no-store' })
      .then((res) =>
        res
          .json()
          .catch(() => null)
          .then(
            (
              data: {
                success: boolean;
                codes?: AccountCodeEntry[];
                error?: string;
              } | null
            ) => ({ res, data })
          )
      )
      .then(({ res, data }) => {
        if (!res.ok) {
          if (res.status === 401) {
            void logout();
          }
          return;
        }
        if (data?.success) {
          setCodes(data.codes ?? []);
        }
      })
      .catch((err: unknown) => {
        console.error('Error fetching codes:', err);
      })
      .finally(() => {
        setCodesLoading(false);
      });
  }, [logout]);

  useEffect(() => {
    if (!isProductionHolding) {
      void fetchData();
    }
  }, [isProductionHolding, fetchData]);

  useEffect(() => {
    if (!isProductionHolding && isPanpel) {
      void fetchCodes();
    }
  }, [isProductionHolding, isPanpel, fetchCodes]);

  // Panel kode hanya bermakna untuk Panpel; peran lain tidak memuat daftar.
  const accountForTeam = (team: Team): AccountCodeEntry | undefined =>
    codes.find(
      (entry) =>
        entry.role === 'peserta' &&
        (entry.teamId === team.id ||
          ((team.ownerCode ?? '') !== '' && entry.id === team.ownerCode))
    );

  const unboundParticipantAccounts = codes.filter(
    (entry) =>
      entry.role === 'peserta' &&
      !entry.revoked &&
      !entry.teamId &&
      !teams.some((team) => (team.ownerCode ?? '') === entry.id)
  );

  const refreshCodesAndTeams = async () => {
    await fetchData();
    await fetchCodes();
  };

  const handleCopyCode = async (code: string) => {
    if (!code) {
      alert('Kode belum tersedia.');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      alert('Kode berhasil disalin.');
    } catch {
      alert(`Salin manual kode ini: ${code}`);
    }
  };

  const handleRegenerate = async (entry: AccountCodeEntry) => {
    if (
      !confirm(
        `Buat ulang kode untuk "${entry.label}"? Kode lama langsung tidak berlaku, ikatan tim tetap.`
      )
    ) {
      return;
    }
    setBusyAccountId(entry.id);
    try {
      const res = await fetch(`/api/auth/accounts/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      });
      const data = (await res.json().catch(() => null)) as {
        success: boolean;
        code?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.success || !data.code) {
        if (await handleAuthError(res, data, 'Anda tidak memiliki izin untuk aksi ini.')) return;
        alert(data?.error ?? 'Gagal membuat ulang kode.');
        return;
      }
      setFreshCodes((prev) => ({ ...prev, [entry.id]: data.code as string }));
      setRevealed((prev) => ({ ...prev, [entry.id]: false }));
      await refreshCodesAndTeams();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat membuat ulang kode.');
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleToggleRevoke = async (entry: AccountCodeEntry) => {
    const action = entry.revoked ? 'unrevoke' : 'revoke';
    if (
      !confirm(
        entry.revoked
          ? `Pulihkan akses "${entry.label}"?`
          : `Cabut akses "${entry.label}"? Pemilik langsung tidak bisa masuk.`
      )
    ) {
      return;
    }
    setBusyAccountId(entry.id);
    try {
      const res = await fetch(`/api/auth/accounts/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as {
        success: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.success) {
        if (await handleAuthError(res, data, 'Anda tidak memiliki izin untuk aksi ini.')) return;
        alert(data?.error ?? 'Gagal mengubah status akses.');
        return;
      }
      await refreshCodesAndTeams();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengubah status akses.');
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleMoveTeam = async (entry: AccountCodeEntry) => {
    const target = moveTarget[entry.id] ?? '';
    if (!target) {
      alert('Pilih tim tujuan dulu.');
      return;
    }
    const teamId = target === '__none__' ? null : target;
    if (
      !confirm(
        teamId === null
          ? `Lepas "${entry.label}" dari timnya?`
          : `Pindah "${entry.label}" ke tim terpilih? Ikatan tim lama dilepas.`
      )
    ) {
      return;
    }
    setBusyAccountId(entry.id);
    try {
      const res = await fetch(`/api/auth/accounts/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reassign', teamId }),
      });
      const data = (await res.json().catch(() => null)) as {
        success: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.success) {
        if (await handleAuthError(res, data, 'Anda tidak memiliki izin untuk aksi ini.')) return;
        alert(data?.error ?? 'Gagal memindah akun ke tim lain.');
        return;
      }
      setMoveTarget((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      await refreshCodesAndTeams();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat memindah akun.');
    } finally {
      setBusyAccountId(null);
    }
  };

  const handleBindAccount = async (team: Team) => {
    const accountId = bindPicker[team.id] ?? '';
    if (!accountId) {
      alert('Pilih akun dulu.');
      return;
    }
    if (!confirm(`Ikat akun terpilih ke tim "${team.name}"?`)) {
      return;
    }
    setBusyAccountId(accountId);
    try {
      const res = await fetch(`/api/auth/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reassign', teamId: team.id }),
      });
      const data = (await res.json().catch(() => null)) as {
        success: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.success) {
        if (await handleAuthError(res, data, 'Anda tidak memiliki izin untuk aksi ini.')) return;
        alert(data?.error ?? 'Gagal mengikat akun ke tim.');
        return;
      }
      setBindPicker((prev) => {
        const next = { ...prev };
        delete next[team.id];
        return next;
      });
      await refreshCodesAndTeams();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengikat akun.');
    } finally {
      setBusyAccountId(null);
    }
  };

  if (isProductionHolding) {
    return <ProductionLanding />;
  }

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Hapus data tim "${name}" beserta seluruh 20 anggotanya?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as {
        success: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.success) {
        if (await handleAuthError(res, data, 'Anda tidak memiliki izin untuk menghapus tim.')) return;
        alert(data?.error ?? 'Gagal menghapus tim');
        return;
      }
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menghapus tim');
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch =
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.teamNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.province.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === 'ALL' || team.region === selectedRegion;
    const matchesCategory = selectedCategory === 'ALL' || team.category === selectedCategory;
    return matchesSearch && matchesRegion && matchesCategory;
  });

  const totalRegisteredTeams = teams.length;
  const maxTotalTeams = 36;
  const totalCompletedTeams = teams.filter(t => t.status === 'Lengkap' || t.status === 'Terverifikasi').length;

  let totalRegisteredPersonnel = 0;
  teams.forEach(t => {
    totalRegisteredPersonnel += t.members.filter(m => m.fullName && m.fullName.trim() !== '').length;
  });
  const maxPersonnel = 36 * 20;

  const rosterLabel = isMojisport ? 'Lihat' : 'Roster';
  const rosterMobileLabel = isMojisport ? 'Lihat Tim' : 'Kelola 20 Personel';

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Official LVM Hero Banner with Deep Purple Gradient & Neon Glow */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#180838] via-[#2a0b56] to-[#4c127d] text-white p-6 sm:p-8 shadow-xl border border-purple-900/60 transition-all">
        {/* Background Decorative Neon Circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-700/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* LVM Crest Emblem Large */}
            <div className="shrink-0">
              <LvmLogo variant="full" size="lg" />
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-purple-400/20 sm:pl-5 pt-3 sm:pt-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-pink-400 mb-1">
                <Shield className="w-3.5 h-3.5 text-pink-400" />
                SISTEM INFORMASI KEJUARAAN RESMI
              </div>
              <p className="text-xs sm:text-sm text-purple-200/90 max-w-xl leading-relaxed">
                Pendaftaran & verifikasi peserta 3 Regional (Barat, Tengah, Timur). Total kuota{' '}
                <strong className="text-white font-bold underline decoration-pink-500">36 Tim</strong> (18 Putra & 18 Putri) dengan komposisi resmi{' '}
                <strong className="text-white font-bold underline decoration-pink-500">20 personel per tim</strong> (15 Pemain + 5 Official).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isPanpel && (
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Daftar Tim Baru
              </Link>
            )}
            <Link
              href="/reports"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all"
            >
              <FileText className="w-4 h-4 text-pink-400" />
              Modul Laporan
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-purple-300/70">
              Total Tim Terdaftar
            </span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/20 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalRegisteredTeams}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-purple-400/60">/ {maxTotalTeams} Kuota</span>
          </div>
          <div className="w-full bg-purple-100 dark:bg-purple-950/60 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-600 to-fuchsia-600 h-full rounded-full transition-all duration-500 shadow-neon-pink"
              style={{ width: `${(totalRegisteredTeams / maxTotalTeams) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-purple-300/70">
              Total Personel Terdaftar
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalRegisteredPersonnel}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-purple-400/60">/ {maxPersonnel} Orang</span>
          </div>
          <div className="w-full bg-purple-100 dark:bg-purple-950/60 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(totalRegisteredPersonnel / maxPersonnel) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-purple-300/70">
              Roster Lengkap (20/20)
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-700 dark:text-purple-300">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {totalCompletedTeams}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-purple-400/60">/ {totalRegisteredTeams} Tim</span>
          </div>
          <div className="w-full bg-purple-100 dark:bg-purple-950/60 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalRegisteredTeams > 0 ? (totalCompletedTeams / totalRegisteredTeams) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Regional Quota Board */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
              Alokasi Kuota 3 Wilayah Regional
            </h2>
            <p className="text-xs text-slate-500 dark:text-purple-300/70">Maksimal 6 Tim Putra & 6 Tim Putri per regional</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuotaCard region="Barat" quotas={quota} />
          <QuotaCard region="Tengah" quotas={quota} />
          <QuotaCard region="Timur" quotas={quota} />
        </div>
      </div>

      {/* Registered Teams Section */}
      <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 sm:p-6 shadow-sm transition-colors">
        {/* Controls and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-50 dark:border-purple-950">
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Daftar Tim Terdaftar
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30">
                {filteredTeams.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">Kelola formulir dan 20 personel per tim</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-48 min-w-[140px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari tim..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
              />
            </div>

            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
            >
              <option value="ALL">Semua Region</option>
              <option value="Barat">Barat</option>
              <option value="Tengah">Tengah</option>
              <option value="Timur">Timur</option>
            </select>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-14 text-slate-400">
            <div className="w-7 h-7 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Memuat data tim...</p>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-8 h-8 text-purple-300 dark:text-purple-800 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada tim yang terdaftar.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Silakan daftarkan tim baru melalui tombol pendaftaran.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto mt-2">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-purple-100 dark:border-purple-900/60 text-slate-500 dark:text-purple-300/70 font-black uppercase tracking-wider">
                    <th className="py-3 px-3">No. Daftar & Tim</th>
                    <th className="py-3 px-3">Regional & Kategori</th>
                    <th className="py-3 px-3">Asal Provinsi</th>
                    <th className="py-3 px-3">Kelengkapan (20)</th>
                    <th className="py-3 px-3">Status</th>
                    {isPanpel && <th className="py-3 px-3">Kode Pemilik</th>}
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50 dark:divide-purple-950/60">
                  {filteredTeams.map(team => {
                    const filledCount = team.members.filter(m => m.fullName && m.fullName.trim() !== '').length;
                    const isComplete = filledCount === 20;
                    const boundAccount = isPanpel ? accountForTeam(team) : undefined;

                    return (
                      <tr key={team.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {team.name}
                          </div>
                          <div className="text-[11px] font-mono font-black text-pink-600 dark:text-pink-400 mt-0.5">
                            {team.teamNumber}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-700 dark:text-purple-200 font-semibold">{team.region}</div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                              team.category === 'Putra'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/20'
                                : 'bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/20'
                            }`}
                          >
                            {team.category}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-600 dark:text-purple-200/80 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-pink-500" />
                            {team.province}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-purple-100 dark:bg-purple-950/60 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-purple-500'
                                }`}
                                style={{ width: `${(filledCount / 20) * 100}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-700 dark:text-purple-200 text-[11px]">
                              {filledCount}/20
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {team.status === 'Terverifikasi' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/40">
                              <BadgeCheck className="w-3.5 h-3.5 text-pink-500" />
                              Terverifikasi
                            </span>
                          ) : isComplete ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Lengkap
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/20">
                              <Clock className="w-3 h-3" />
                              Draft ({20 - filledCount})
                            </span>
                          )}
                        </td>
                        {isPanpel && (
                          <td className="py-3 px-3">
                            <div className="min-w-[190px] max-w-[250px] space-y-1.5">
                              {codesLoading ? (
                                <p className="text-[11px] text-slate-400">Memuat kode…</p>
                              ) : boundAccount ? (
                                <>
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-purple-100">
                                    {boundAccount.label}
                                    {boundAccount.revoked && (
                                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                        Dicabut
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="flex-1 min-w-0 font-mono text-[12px] font-bold tracking-widest text-slate-800 dark:text-purple-100 truncate">
                                      {revealed[boundAccount.id] ? boundAccount.code || '—' : '•••••••'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRevealed((prev) => ({
                                          ...prev,
                                          [boundAccount.id]: !prev[boundAccount.id],
                                        }))
                                      }
                                      className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-800/60 text-purple-800 dark:text-purple-100 transition-all"
                                    >
                                      {revealed[boundAccount.id] ? 'Sembunyi' : 'Lihat'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleCopyCode(boundAccount.code)}
                                      className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-800/60 text-purple-800 dark:text-purple-100 transition-all"
                                    >
                                      Salin
                                    </button>
                                  </div>
                                  {freshCodes[boundAccount.id] && (
                                    <div className="rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-1.5 space-y-1">
                                      <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                        Kode baru (salin sekarang):
                                      </p>
                                      <div className="flex items-center gap-1.5">
                                        <span className="flex-1 font-mono text-[12px] font-black tracking-widest text-emerald-800 dark:text-emerald-200">
                                          {freshCodes[boundAccount.id]}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleCopyCode(freshCodes[boundAccount.id])
                                          }
                                          className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                                        >
                                          Salin
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFreshCodes((prev) => {
                                              const next = { ...prev };
                                              delete next[boundAccount.id];
                                              return next;
                                            })
                                          }
                                          className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                                        >
                                          Tutup
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => void handleRegenerate(boundAccount)}
                                      disabled={busyAccountId === boundAccount.id}
                                      className="flex-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white transition-all"
                                    >
                                      {busyAccountId === boundAccount.id ? '…' : 'Generate ulang'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleToggleRevoke(boundAccount)}
                                      disabled={busyAccountId === boundAccount.id}
                                      className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40 transition-all ${
                                        boundAccount.revoked
                                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                          : 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300'
                                      }`}
                                    >
                                      {boundAccount.revoked ? 'Pulihkan' : 'Cabut'}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={moveTarget[boundAccount.id] ?? ''}
                                      onChange={(e) =>
                                        setMoveTarget((prev) => ({
                                          ...prev,
                                          [boundAccount.id]: e.target.value,
                                        }))
                                      }
                                      className="flex-1 min-w-0 py-1 px-1.5 rounded-lg bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
                                      aria-label={`Pindah tim untuk ${boundAccount.label}`}
                                    >
                                      <option value="">Pindah ke…</option>
                                      <option value="__none__">Lepas dari tim</option>
                                      {teams
                                        .filter((t) => t.id !== team.id)
                                        .map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.name} · {t.category}
                                          </option>
                                        ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => void handleMoveTeam(boundAccount)}
                                      disabled={
                                        !moveTarget[boundAccount.id] ||
                                        busyAccountId === boundAccount.id
                                      }
                                      className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition-all"
                                    >
                                      Pindah
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <p className="text-[11px] text-slate-500 dark:text-purple-300/70">
                                    Belum terikat akun.
                                  </p>
                                  {unboundParticipantAccounts.length > 0 && (
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={bindPicker[team.id] ?? ''}
                                        onChange={(e) =>
                                          setBindPicker((prev) => ({
                                            ...prev,
                                            [team.id]: e.target.value,
                                          }))
                                        }
                                        className="flex-1 min-w-0 py-1 px-1.5 rounded-lg bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
                                        aria-label={`Ikat akun ke ${team.name}`}
                                      >
                                        <option value="">Pilih akun…</option>
                                        {unboundParticipantAccounts.map((entry) => (
                                          <option key={entry.id} value={entry.id}>
                                            {entry.label}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => void handleBindAccount(team)}
                                        disabled={
                                          !bindPicker[team.id] ||
                                          busyAccountId === bindPicker[team.id]
                                        }
                                        className="shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white transition-all"
                                      >
                                        Ikat
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/teams/${team.id}/roster`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white transition-all shadow-xs"
                            >
                              <Users className="w-3 h-3" />
                              {rosterLabel}
                            </Link>
                            <Link
                              href={`/teams/${team.id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-pink-600 dark:text-purple-300 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-colors"
                              title="Lembar Tim"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            {isPanpel && (
                              <button
                                onClick={() => void handleDeleteTeam(team.id, team.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Hapus Tim"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3 mt-3">
              {filteredTeams.map(team => {
                const filledCount = team.members.filter(m => m.fullName && m.fullName.trim() !== '').length;
                const boundAccount = isPanpel ? accountForTeam(team) : undefined;

                return (
                  <div
                    key={team.id}
                    className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/60 bg-purple-50/30 dark:bg-[#1a0c36]/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                          {team.name}
                        </h3>
                        <div className="text-[11px] font-mono text-pink-600 dark:text-pink-400 font-bold mt-0.5">
                          {team.teamNumber}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          team.category === 'Putra'
                            ? 'bg-blue-50 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300'
                            : 'bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300'
                        }`}
                      >
                        {team.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-purple-300/80 pt-1.5 border-t border-purple-100/60 dark:border-purple-900/40">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-pink-500" />
                        <span>{team.province} (Reg. {team.region})</span>
                      </div>
                      <div className="font-mono font-bold text-slate-800 dark:text-purple-200">
                        {filledCount}/20 Roster
                      </div>
                    </div>

                    {isPanpel ? (
                      <div className="rounded-xl border border-purple-100 dark:border-purple-900/60 bg-white dark:bg-[#15072c] p-3 space-y-2">
                        {codesLoading ? (
                          <p className="text-[11px] text-slate-400">Memuat kode…</p>
                        ) : boundAccount ? (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-purple-100">
                                {boundAccount.label}
                              </span>
                              {boundAccount.revoked && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                  Dicabut
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="flex-1 font-mono text-[13px] font-bold tracking-widest text-slate-800 dark:text-purple-100">
                                {revealed[boundAccount.id] ? boundAccount.code || '—' : '•••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealed((prev) => ({
                                    ...prev,
                                    [boundAccount.id]: !prev[boundAccount.id],
                                  }))
                                }
                                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-100"
                              >
                                {revealed[boundAccount.id] ? 'Sembunyi' : 'Lihat'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCopyCode(boundAccount.code)}
                                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-100"
                              >
                                Salin
                              </button>
                            </div>
                            {freshCodes[boundAccount.id] && (
                              <div className="rounded-lg border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-2 space-y-1">
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                  Kode baru (salin sekarang):
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <span className="flex-1 font-mono text-[13px] font-black tracking-widest text-emerald-800 dark:text-emerald-200">
                                    {freshCodes[boundAccount.id]}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleCopyCode(freshCodes[boundAccount.id])
                                    }
                                    className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white"
                                  >
                                    Salin
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFreshCodes((prev) => {
                                        const next = { ...prev };
                                        delete next[boundAccount.id];
                                        return next;
                                      })
                                    }
                                    className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                                  >
                                    Tutup
                                  </button>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleRegenerate(boundAccount)}
                                disabled={busyAccountId === boundAccount.id}
                                className="flex-1 px-2 py-2 rounded-lg text-[11px] font-bold bg-purple-700 disabled:opacity-40 text-white"
                              >
                                {busyAccountId === boundAccount.id ? '…' : 'Generate ulang'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleToggleRevoke(boundAccount)}
                                disabled={busyAccountId === boundAccount.id}
                                className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-bold disabled:opacity-40 ${
                                  boundAccount.revoked
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                }`}
                              >
                                {boundAccount.revoked ? 'Pulihkan' : 'Cabut'}
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={moveTarget[boundAccount.id] ?? ''}
                                onChange={(e) =>
                                  setMoveTarget((prev) => ({
                                    ...prev,
                                    [boundAccount.id]: e.target.value,
                                  }))
                                }
                                className="flex-1 min-w-0 py-2 px-2 rounded-lg bg-white dark:bg-[#15072c] border border-purple-200 dark:border-purple-800 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
                                aria-label={`Pindah tim untuk ${boundAccount.label}`}
                              >
                                <option value="">Pindah ke…</option>
                                <option value="__none__">Lepas dari tim</option>
                                {teams
                                  .filter((t) => t.id !== team.id)
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} · {t.category}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => void handleMoveTeam(boundAccount)}
                                disabled={
                                  !moveTarget[boundAccount.id] ||
                                  busyAccountId === boundAccount.id
                                }
                                className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold bg-slate-700 disabled:opacity-40 text-white"
                              >
                                Pindah
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-[11px] text-slate-500 dark:text-purple-300/70">
                              Belum terikat akun.
                            </p>
                            {unboundParticipantAccounts.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={bindPicker[team.id] ?? ''}
                                  onChange={(e) =>
                                    setBindPicker((prev) => ({
                                      ...prev,
                                      [team.id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 min-w-0 py-2 px-2 rounded-lg bg-white dark:bg-[#15072c] border border-purple-200 dark:border-purple-800 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
                                  aria-label={`Ikat akun ke ${team.name}`}
                                >
                                  <option value="">Pilih akun…</option>
                                  {unboundParticipantAccounts.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void handleBindAccount(team)}
                                  disabled={
                                    !bindPicker[team.id] ||
                                    busyAccountId === bindPicker[team.id]
                                  }
                                  className="shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold bg-purple-700 disabled:opacity-40 text-white"
                                >
                                  Ikat
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 dark:text-purple-300/60">
                        Status:{' '}
                        <span className="font-bold text-slate-700 dark:text-purple-200">
                          {team.status}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link
                        href={`/teams/${team.id}/roster`}
                        className="flex-1 text-center py-2 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{rosterMobileLabel}</span>
                      </Link>

                      <Link
                        href={`/teams/${team.id}`}
                        className="p-2 rounded-lg bg-white dark:bg-[#15072c] border border-purple-200 dark:border-purple-800 text-slate-700 dark:text-purple-200"
                        title="Lembar Tim"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      {isPanpel && (
                        <button
                          onClick={() => void handleDeleteTeam(team.id, team.name)}
                          className="p-2 rounded-lg bg-white dark:bg-[#15072c] border border-purple-200 dark:border-purple-800 text-slate-400 hover:text-rose-600"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
