'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import {
  Edit3,
  Printer,
  Users,
  Shirt,
  User,
  BadgeCheck,
  Loader2
} from 'lucide-react';
import { Team } from '@/lib/types';
import LvmLogo from '@/components/LvmLogo';

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.id;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const fetchTeam = useCallback(() => {
    return fetch(`/api/teams/${teamId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTeam(data.team);
        }
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const getAdminKey = async (): Promise<string | null> => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('lvm_admin_key') : null;
    if (saved) {
      try {
        const check = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: saved }),
        });
        const data = await check.json();
        if (data.valid) return saved;
      } catch {}
      sessionStorage.removeItem('lvm_admin_key');
    }

    const input = prompt('Aksi ini memerlukan verifikasi Panitia. Masukkan PIN Panitia:');
    if (!input || !input.trim()) return null;

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: input.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('lvm_admin_key', input.trim());
        return input.trim();
      } else {
        sessionStorage.removeItem('lvm_admin_key');
        alert(data.error || 'PIN Panitia salah! Akses ditolak.');
        return null;
      }
    } catch {
      alert('Gagal memverifikasi PIN Panitia.');
      return null;
    }
  };

  const handleVerifyTeam = async () => {
    const adminKey = await getAdminKey();
    if (!adminKey) {
      return;
    }

    if (!confirm('[PANITIA] Verifikasi data tim ini? Status akan menjadi Terverifikasi dan resmi mengunci 1 slot kuota regional.')) {
      return;
    }
    try {
      setVerifying(true);
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ status: 'Terverifikasi' }),
      });
      const data = await res.json();
      if (data.success && data.team) {
        setTeam(data.team);
      } else {
        if (res.status === 401) {
          sessionStorage.removeItem('lvm_admin_key');
        }
        alert(data.error || 'Gagal memverifikasi tim');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat verifikasi tim');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Memuat lembar tim...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-16 bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-6 max-w-md mx-auto">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Tim Tidak Ditemukan</h2>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-sm"
        >
          Kembali ke Daftar Tim
        </Link>
      </div>
    );
  }

  const players = team.members.filter(m => m.teamRole === 'Pemain');
  const officials = team.members.filter(m => m.teamRole !== 'Pemain');
  const filledCount = team.members.filter(m => m.fullName && m.fullName.trim() !== '').length;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-1 sm:p-1.5 rounded-2xl bg-gradient-to-br from-[#1c083e] via-[#240a4e] to-[#120427] border border-purple-700/60 shadow-md shrink-0">
            <LvmLogo variant="badge" size="sm" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{team.name}</h1>
            <p className="text-xs text-slate-500 dark:text-purple-300/70 mt-0.5">
              Nomor Daftar: <strong className="text-pink-600 dark:text-pink-400 font-mono font-black">{team.teamNumber}</strong> • {team.province} (Regional {team.region})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {team.status !== 'Terverifikasi' && filledCount === 20 && (
            <button
              onClick={handleVerifyTeam}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white transition-all cursor-pointer shadow-sm"
            >
              {verifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BadgeCheck className="w-3.5 h-3.5" />
              )}
              Verifikasi Tim (Kunci Slot)
            </button>
          )}
          {team.status === 'Terverifikasi' && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/40">
              <BadgeCheck className="w-4 h-4 text-pink-500" />
              Terverifikasi
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#15072c] hover:bg-purple-50 dark:hover:bg-purple-900/50 text-slate-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-pink-500" />
            Cetak Lembar Tim (PDF)
          </button>
          <Link
            href={`/teams/${team.id}/roster`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white transition-all shadow-sm active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit 20 Personel
          </Link>
        </div>
      </div>

      {/* Official Printable Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lvm-logo.png"
          alt="Logo Liga Voli Mahasiswa"
          className="h-14 w-auto mx-auto mb-2 object-contain"
        />
        <h2 className="text-lg font-black uppercase text-black">
          LIGA VOLI MAHASISWA (LVM)
        </h2>
        <p className="text-xs font-bold text-gray-700">
          LEMBAR VERIFIKASI RESMI DAFTAR SUSUNAN TIM (20 PERSONEL)
        </p>
        <div className="mt-2 flex justify-between text-[11px] font-mono text-gray-800 px-2">
          <div><strong>TIM:</strong> {team.name} ({team.category})</div>
          <div><strong>NO DAFTAR:</strong> {team.teamNumber}</div>
          <div><strong>REGIONAL:</strong> {team.region} ({team.province})</div>
        </div>
      </div>

      {/* Team Info Card */}
      <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm transition-colors print:bg-white print:border-gray-300 print:text-black print:p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 dark:text-purple-400/70 print:text-gray-600 block text-[10px] uppercase font-black">Kategori</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white print:text-black">{team.category}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-purple-400/70 print:text-gray-600 block text-[10px] uppercase font-black">Wilayah Regional</span>
            <span className="text-sm font-bold text-pink-600 dark:text-pink-400 print:text-black">{team.region}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-purple-400/70 print:text-gray-600 block text-[10px] uppercase font-black">Status Roster</span>
            {team.status === 'Terverifikasi' ? (
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300 print:text-black inline-flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5 text-pink-500" /> Terverifikasi
              </span>
            ) : (
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 print:text-black">
                {filledCount === 20 ? 'Lengkap (20/20)' : `${filledCount}/20 Terisi`}
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-500 dark:text-purple-400/70 print:text-gray-600 block text-[10px] uppercase font-black">Kontak PIC</span>
            <span className="text-sm font-medium text-slate-800 dark:text-purple-200 print:text-black">
              {team.contactPerson || '-'} ({team.contactPhone || '-'})
            </span>
          </div>
        </div>
      </div>

      {/* 15 Pemain Section */}
      <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 sm:p-6 shadow-sm transition-colors print:bg-white print:border-gray-300 print:p-3">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-50 dark:border-purple-950 print:border-gray-300">
          <h2 className="text-sm font-black text-slate-900 dark:text-white print:text-black uppercase tracking-tight flex items-center gap-2">
            <Shirt className="w-4 h-4 text-pink-500 print:text-black" />
            Daftar 15 Pemain
          </h2>
          <span className="text-xs font-mono font-bold text-pink-600 dark:text-pink-400 print:text-black">
            {players.filter(p => p.fullName && p.fullName.trim() !== '').length} / 15 Pemain
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-purple-100 dark:border-purple-900/60 print:border-gray-300 text-slate-500 dark:text-purple-300/70 print:text-gray-700 font-black uppercase">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Foto</th>
                <th className="py-2.5 px-3">Jersey</th>
                <th className="py-2.5 px-3">Nama Pemain</th>
                <th className="py-2.5 px-3">Posisi</th>
                <th className="py-2.5 px-3">TB / BB</th>
                <th className="py-2.5 px-3">NIM</th>
                <th className="py-2.5 px-3">Fakultas / Jurusan</th>
                <th className="py-2.5 px-3">Angkatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 dark:divide-purple-950/60 print:divide-gray-200">
              {players.map((p, idx) => (
                <tr key={p.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30">
                  <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-purple-400/60 print:text-gray-600">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={p.fullName} className="w-8 h-10 object-cover rounded-md border border-purple-200 dark:border-purple-800" />
                    ) : (
                      <div className="w-8 h-10 rounded-md bg-purple-50 dark:bg-[#1f0e3f] flex items-center justify-center text-purple-400">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-black text-pink-600 dark:text-pink-400 print:text-black text-xs">
                    {p.jerseyNumber || '-'}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                    {p.fullName || <span className="text-slate-400 dark:text-purple-400/40 italic">(Belum diisi)</span>}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black font-semibold">
                    {p.position || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-purple-300 print:text-black font-mono">
                    {p.height ? `${p.height}cm` : '-'} / {p.weight ? `${p.weight}kg` : '-'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-400/70 print:text-black">
                    {p.nim || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black">
                    {p.faculty || '-'} {p.major ? `(${p.major})` : ''}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-400/70 print:text-black">
                    {p.entryYear || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5 Official Section */}
      <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 sm:p-6 shadow-sm transition-colors print:bg-white print:border-gray-300 print:p-3">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-50 dark:border-purple-950 print:border-gray-300">
          <h2 className="text-sm font-black text-slate-900 dark:text-white print:text-black uppercase tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-500 print:text-black" />
            Daftar 5 Official Tim
          </h2>
          <span className="text-xs font-mono font-bold text-pink-600 dark:text-pink-400 print:text-black">
            {officials.filter(o => o.fullName && o.fullName.trim() !== '').length} / 5 Official
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-purple-100 dark:border-purple-900/60 print:border-gray-300 text-slate-500 dark:text-purple-300/70 print:text-gray-700 font-black uppercase">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Posisi Official</th>
                <th className="py-2.5 px-3">Nama Lengkap</th>
                <th className="py-2.5 px-3">No. Urut Daftar</th>
                <th className="py-2.5 px-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 dark:divide-purple-950/60 print:divide-gray-200">
              {officials.map((o, idx) => (
                <tr key={o.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30">
                  <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-purple-400/60 print:text-gray-600">{idx + 16}</td>
                  <td className="py-2.5 px-3 font-black text-purple-700 dark:text-pink-400 print:text-black">
                    {o.teamRole}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                    {o.fullName || <span className="text-slate-400 dark:text-purple-400/40 italic">(Belum diisi)</span>}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-400/70 print:text-black">
                    {o.regNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-purple-300/80 print:text-black">
                    Official Staff
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature Section */}
      <div className="hidden print:grid grid-cols-3 text-center text-[11px] mt-10 text-black">
        <div>
          <p>Diserahkan Oleh,</p>
          <p className="mt-12 font-bold underline">Team Manager / Official</p>
        </div>
        <div>
          <p>Diverifikasi Oleh,</p>
          <p className="mt-12 font-bold underline">Komisi Pertandingan</p>
        </div>
        <div>
          <p>Disahkan Oleh,</p>
          <p className="mt-12 font-bold underline">Ketua Panitia Pelaksana</p>
        </div>
      </div>
    </div>
  );
}
