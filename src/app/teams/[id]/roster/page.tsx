'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
  Shirt
} from 'lucide-react';
import { Team, Member, TeamRole, PlayingPosition, PLAYING_POSITIONS } from '@/lib/types';
import PhotoUpload from '@/components/PhotoUpload';
import LvmLogo from '@/components/LvmLogo';

export default function TeamRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const teamId = resolvedParams.id;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Member>>({});
  const [lastSyncKey, setLastSyncKey] = useState('');

  const fetchTeam = useCallback(() => {
    return fetch(`/api/teams/${teamId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.team) {
          setTeam(data.team);
        } else {
          setErrorMessage(data.error || 'Tim tidak ditemukan');
        }
      })
      .catch(err => {
        console.error(err);
        setErrorMessage('Gagal memuat data tim');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const currentMember = team?.members.find(m => m.slotIndex === selectedSlot);
  const syncKey = team ? `${team.id}|${selectedSlot}|${team.updatedAt}` : '';
  if (currentMember && syncKey !== lastSyncKey) {
    setLastSyncKey(syncKey);
    setFormData(currentMember);
    setErrorMessage(null);
  }

  const handleSelectSlot = (slotIdx: number) => {
    setSelectedSlot(slotIdx);
  };

  const handleFormChange = (field: keyof Member, value: Member[keyof Member]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveMember = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!team) return false;
    const currentMember = team.members.find(m => m.slotIndex === selectedSlot);
    if (!currentMember) return false;

    // Check duplicate jersey in same team
    if (formData.teamRole === 'Pemain' && formData.jerseyNumber && formData.jerseyNumber.trim() !== '') {
      const duplicate = team.members.some(
        m => m.slotIndex !== selectedSlot &&
             m.teamRole === 'Pemain' &&
             m.jerseyNumber &&
             m.jerseyNumber.trim() === formData.jerseyNumber?.trim()
      );
      if (duplicate) {
        setErrorMessage(`Nomor Jersey ${formData.jerseyNumber} sudah dipakai oleh pemain lain di tim ini.`);
        return false;
      }
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: currentMember.id,
          updates: {
            ...formData,
            slotIndex: selectedSlot,
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || 'Gagal menyimpan data personel');
        return false;
      }

      setSaveSuccess(true);
      if (data.team) {
        setTeam(data.team);
        const filled = data.team.members.filter((m: Member) => m.fullName && m.fullName.trim() !== '').length;
        if (filled === 20) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#FF007F', '#A855F7', '#3B82F6', '#10B981'],
          });
        }
      }

      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);

      return true;

    } catch (err) {
      console.error(err);
      setErrorMessage('Terjadi kesalahan saat menyimpan data.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleSaveMember();
    if (success && selectedSlot < 20) {
      setSelectedSlot(selectedSlot + 1);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Memuat formulir 20 personel...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-6">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Tim Tidak Ditemukan</h2>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const filledCount = team.members.filter(m => m.fullName && m.fullName.trim() !== '').length;
  const playersFilledCount = team.members.filter(m => m.teamRole === 'Pemain' && m.fullName && m.fullName.trim() !== '').length;
  const officialsFilledCount = team.members.filter(m => m.teamRole !== 'Pemain' && m.fullName && m.fullName.trim() !== '').length;
  const isAllComplete = filledCount === 20;
  const isPlayerSlot = selectedSlot <= 15;

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-purple-300/70 hover:text-pink-600 dark:hover:text-white transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard Liga
          </Link>
          <div className="flex items-center gap-3">
            <LvmLogo variant="icon-only" size="sm" />
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {team.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-purple-300/70 mt-0.5">
                <span className="font-mono font-black text-pink-600 dark:text-pink-400">{team.teamNumber}</span>
                <span>•</span>
                <span>Reg. {team.region}</span>
                <span>•</span>
                <span className="font-bold">{team.category}</span>
                <span>•</span>
                <span>{team.province}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <Link
            href={`/teams/${team.id}`}
            className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#15072c] hover:bg-purple-50 dark:hover:bg-purple-900/50 text-slate-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 transition-all shadow-xs"
          >
            Lembar Tim
          </Link>
          <Link
            href="/reports"
            className="flex-1 sm:flex-none text-center px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#15072c] hover:bg-purple-50 dark:hover:bg-purple-900/50 text-slate-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 transition-all shadow-xs"
          >
            Laporan
          </Link>
        </div>
      </div>

      {/* Progress Strip */}
      <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-4 sm:p-5 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-purple-200">
                Kelengkapan Roster 20 Personel:
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isAllComplete
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-500/30 shadow-neon-pink'
                }`}
              >
                {isAllComplete ? 'LENGKAP (20/20)' : `${filledCount}/20 Terisi`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-purple-300/70 mt-1">
              15 Pemain ({playersFilledCount}/15) • 5 Official ({officialsFilledCount}/5: 1 Manager, 1 Pelatih, 2 Asisten, 1 Utility)
            </p>
          </div>

          <div className="w-full sm:w-60">
            <div className="w-full bg-purple-100 dark:bg-purple-950/60 h-2.5 rounded-full overflow-hidden border border-purple-200/50 dark:border-purple-900/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isAllComplete
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-pink-600 via-pink-500 to-fuchsia-600 shadow-neon-pink'
                }`}
                style={{ width: `${(filledCount / 20) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE-ONLY: Horizontal Scrollable Slot Picker Strip */}
      <div className="lg:hidden bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-purple-200">
          <span>Pilih Slot Personel (1 - 20):</span>
          <span className="font-mono font-bold text-pink-600 dark:text-pink-400">
            Slot #{selectedSlot} ({formData.teamRole || 'Pemain'})
          </span>
        </div>

        {/* Scrollable Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {team.members.map(m => {
            const isSelected = m.slotIndex === selectedSlot;
            const isFilled = m.fullName && m.fullName.trim() !== '';

            return (
              <button
                key={m.slotIndex}
                type="button"
                onClick={() => handleSelectSlot(m.slotIndex)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-pink-600 text-white shadow-sm'
                    : isFilled
                    ? 'bg-purple-50 dark:bg-[#1f0e3f] text-slate-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800'
                    : 'bg-white dark:bg-[#15072c] text-slate-400 border border-purple-100 dark:border-purple-900/50'
                }`}
              >
                <span>#{m.slotIndex}</span>
                {isFilled && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Slot List (Desktop) + Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* DESKTOP-ONLY: Left Column 20 Slots Sidebar */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          {/* 15 Pemain */}
          <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-purple-50 dark:border-purple-950">
              <h3 className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5" />
                15 Pemain Utama
              </h3>
              <span className="text-xs text-slate-600 dark:text-purple-300/70 font-mono font-bold">
                {playersFilledCount}/15
              </span>
            </div>

            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
              {team.members.slice(0, 15).map(m => {
                const isSelected = m.slotIndex === selectedSlot;
                const isFilled = m.fullName && m.fullName.trim() !== '';

                return (
                  <button
                    key={m.slotIndex}
                    type="button"
                    onClick={() => handleSelectSlot(m.slotIndex)}
                    className={`w-full text-left p-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-pink-600 text-white border-transparent shadow-sm font-bold'
                        : isFilled
                        ? 'bg-purple-50/50 dark:bg-[#1f0e3f]/60 border-purple-100 dark:border-purple-900/50 text-slate-800 dark:text-purple-200 hover:border-pink-300'
                        : 'bg-white dark:bg-[#15072c]/40 border-purple-50 dark:border-purple-950/60 text-slate-400 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-lg text-[10px] font-black font-mono flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white text-pink-600'
                            : isFilled
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                            : 'bg-purple-50 dark:bg-purple-950 text-slate-400'
                        }`}
                      >
                        {m.slotIndex}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold truncate">
                          {m.fullName || `Slot Pemain #${m.slotIndex}`}
                        </div>
                        {isFilled && (
                          <div className={`text-[10px] ${isSelected ? 'text-pink-100' : 'text-slate-500 dark:text-purple-400/60'} flex items-center gap-1`}>
                            <span>No. {m.jerseyNumber || '-'}</span>
                            <span>•</span>
                            <span>{m.position || '-'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 ml-1.5">
                      {isFilled ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-200 dark:bg-purple-800" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Official */}
          <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-purple-50 dark:border-purple-950">
              <h3 className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                5 Official Tim
              </h3>
              <span className="text-xs text-slate-600 dark:text-purple-300/70 font-mono font-bold">
                {officialsFilledCount}/5
              </span>
            </div>

            <div className="space-y-1">
              {team.members.slice(15, 20).map(m => {
                const isSelected = m.slotIndex === selectedSlot;
                const isFilled = m.fullName && m.fullName.trim() !== '';

                return (
                  <button
                    key={m.slotIndex}
                    type="button"
                    onClick={() => handleSelectSlot(m.slotIndex)}
                    className={`w-full text-left p-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-pink-600 text-white border-transparent shadow-sm font-bold'
                        : isFilled
                        ? 'bg-purple-50/50 dark:bg-[#1f0e3f]/60 border-purple-100 dark:border-purple-900/50 text-slate-800 dark:text-purple-200 hover:border-pink-300'
                        : 'bg-white dark:bg-[#15072c]/40 border-purple-50 dark:border-purple-950/60 text-slate-400 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-lg text-[10px] font-black font-mono flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white text-pink-600'
                            : isFilled
                            ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                            : 'bg-purple-50 dark:bg-purple-950 text-slate-400'
                        }`}
                      >
                        {m.slotIndex}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold truncate">
                          {m.fullName || `(Belum Diisi)`}
                        </div>
                        <div className={`text-[10px] ${isSelected ? 'text-pink-100' : 'text-purple-600 dark:text-pink-400 font-bold'}`}>
                          {m.teamRole}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-1.5">
                      {isFilled ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`} />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-200 dark:bg-purple-800" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Member Entry Form */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 sm:p-7 shadow-sm transition-colors">
            {/* Form Title Banner */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-purple-50 dark:border-purple-950 flex-wrap gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 text-[10px] font-black uppercase tracking-wider mb-1.5 border border-pink-200 dark:border-pink-500/30">
                  HALAMAN PENDAFTARAN PESERTA (SLOT #{selectedSlot} / 20)
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{formData.teamRole || 'Pemain'}</span>
                  {formData.fullName && (
                    <span className="text-slate-500 dark:text-purple-300/70 font-normal text-xs sm:text-sm">
                      — {formData.fullName}
                    </span>
                  )}
                </h2>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-purple-400/60 block font-mono">No. Urut Daftar:</span>
                <span className="text-xs font-mono font-black text-pink-600 dark:text-pink-400">
                  {formData.regNumber || `${team.teamNumber.replace('LVM-', '')}-${String(selectedSlot).padStart(2, '0')}`}
                </span>
              </div>
            </div>

            {/* Notifications */}
            {saveSuccess && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Data slot #{selectedSlot} berhasil disimpan!</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSaveAndNext} className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-purple-400/70 block text-[10px] uppercase font-black">NOMOR DAFTAR TEAM:</span>
                  <span className="font-mono font-black text-pink-600 dark:text-pink-400">{team.teamNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-purple-400/70 block text-[10px] uppercase font-black">NAMA TEAM:</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate block">{team.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-purple-400/70 block text-[10px] uppercase font-black">ALAMAT / PROPINSI:</span>
                  <span className="font-medium text-slate-700 dark:text-purple-200 truncate block">
                    {team.province} (Reg. {team.region})
                  </span>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                    NAMA LENGKAP <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap personel..."
                    value={formData.fullName || ''}
                    onChange={e => handleFormChange('fullName', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                    TANGGAL LAHIR
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate || ''}
                    onChange={e => handleFormChange('birthDate', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>

                {/* Nomor Induk Mahasiswa (NIM) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                    NOMOR INDUK MAHASISWA (NIM) {isPlayerSlot && <span className="text-pink-500">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 2108561012"
                    value={formData.nim || ''}
                    onChange={e => handleFormChange('nim', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>

                {/* Fakultas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                    FAKULTAS
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Fakultas Teknik"
                    value={formData.faculty || ''}
                    onChange={e => handleFormChange('faculty', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>

                {/* Jurusan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                    JURUSAN / PROGRAM STUDI
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Manajemen / Olahraga"
                    value={formData.major || ''}
                    onChange={e => handleFormChange('major', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>

                {/* Tahun Masuk (Angkatan) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                    TAHUN MASUK (ANGKATAN)
                  </label>
                  <input
                    type="number"
                    min={2018}
                    max={2026}
                    placeholder="Contoh: 2023"
                    value={formData.entryYear || ''}
                    onChange={e => handleFormChange('entryYear', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>

                {/* Posisi Dalam Team (Role) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                    POSISI DALAM TEAM
                  </label>
                  <select
                    value={formData.teamRole || (isPlayerSlot ? 'Pemain' : 'Team Manager')}
                    onChange={e => handleFormChange('teamRole', e.target.value as TeamRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="Pemain">Pemain (15 Kuota)</option>
                    <option value="Team Manager">Team Manager (1 Kuota)</option>
                    <option value="Head Coach">Head Coach (1 Kuota)</option>
                    <option value="Assistant Pelatih">Assistant Pelatih (2 Kuota)</option>
                    <option value="Utilities">Utilities (1 Kuota)</option>
                  </select>
                </div>

                {/* Fields Khusus Pemain */}
                {isPlayerSlot && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                        NOMOR JERSEY <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 7, 10, 14"
                        value={formData.jerseyNumber || ''}
                        onChange={e => handleFormChange('jerseyNumber', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-mono font-black text-pink-600 dark:text-pink-400 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                        POSISI BERMAIN
                      </label>
                      <select
                        value={formData.position || '-'}
                        onChange={e => handleFormChange('position', e.target.value as PlayingPosition)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="-">- Pilih Posisi Bermain -</option>
                        {PLAYING_POSITIONS.map(pos => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                        TINGGI BADAN (CM)
                      </label>
                      <input
                        type="number"
                        min={140}
                        max={220}
                        placeholder="Contoh: 185"
                        value={formData.height || ''}
                        onChange={e => handleFormChange('height', Number(e.target.value) || undefined)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1">
                        BERAT BADAN (KG)
                      </label>
                      <input
                        type="number"
                        min={40}
                        max={140}
                        placeholder="Contoh: 78"
                        value={formData.weight || ''}
                        onChange={e => handleFormChange('weight', Number(e.target.value) || undefined)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                      />
                    </div>
                  </>
                )}

                {/* Upload Foto Jersey */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1.5">
                    UPLOAD PHOTO DENGAN JERSEY VOLLEY
                  </label>
                  <PhotoUpload
                    currentPhotoUrl={formData.photoUrl}
                    onPhotoUploaded={url => handleFormChange('photoUrl', url)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-purple-50 dark:border-purple-950 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveMember()}
                  disabled={saving}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-pink-500" />
                  {saving ? 'Menyimpan...' : 'Simpan Slot Ini'}
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {selectedSlot > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(selectedSlot - 1)}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#1f0e3f] text-slate-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800 hover:bg-purple-50"
                    >
                      ← Slot #{selectedSlot - 1}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-pink-600 hover:bg-pink-500 text-white shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>
                      {selectedSlot < 20
                        ? `Simpan & Lanjut ke Slot #${selectedSlot + 1} →`
                        : 'Simpan Slot Terakhir (20/20)'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
