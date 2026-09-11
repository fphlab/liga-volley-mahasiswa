'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Building,
  Phone,
  RotateCcw
} from 'lucide-react';
import { Region, Category, RegionalQuota, REGIONS_CONFIG, MAX_TEAMS_PER_REGION_CATEGORY } from '@/lib/types';
import { useAppMode } from '@/components/AppModeContext';
import ProductionLanding from '@/components/ProductionLanding';

export default function RootRegisterPage() {
  const { isProductionHolding } = useAppMode();
  const router = useRouter();

  const [province, setProvince] = useState<string>('DKI Jakarta');
  const [region, setRegion] = useState<Region>('Barat');
  const [category, setCategory] = useState<Category>('Putra');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [hasDraft, setHasDraft] = useState(false);
  const [quotas, setQuotas] = useState<RegionalQuota[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pulihkan draf tersimpan dari localStorage saat pertama kali dibuka
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('lvm_team_register_draft');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.name || parsed.address || parsed.contactPerson || parsed.contactPhone)) {
            if (parsed.province) setProvince(parsed.province);
            if (parsed.region) setRegion(parsed.region);
            if (parsed.category) setCategory(parsed.category);
            if (parsed.name) setName(parsed.name);
            if (parsed.address) setAddress(parsed.address);
            if (parsed.contactPerson) setContactPerson(parsed.contactPerson);
            if (parsed.contactPhone) setContactPhone(parsed.contactPhone);
            setHasDraft(true);
          }
        }
      } catch (e) {
        console.warn('Gagal memulihkan draf pendaftaran dari localStorage:', e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Simpan otomatis ke localStorage setiap ada perubahan input formulir
  useEffect(() => {
    if (name || address || contactPerson || contactPhone) {
      try {
        const draft = {
          name,
          address,
          province,
          region,
          category,
          contactPerson,
          contactPhone,
          savedAt: Date.now(),
        };
        localStorage.setItem('lvm_team_register_draft', JSON.stringify(draft));
      } catch (e) {
        console.warn('Gagal menyimpan draf pendaftaran ke localStorage:', e);
      }
    }
  }, [name, address, province, region, category, contactPerson, contactPhone]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem('lvm_team_register_draft');
    } catch {}
    setName('');
    setAddress('');
    setContactPerson('');
    setContactPhone('');
    setProvince('DKI Jakarta');
    setRegion('Barat');
    setCategory('Putra');
    setHasDraft(false);
  };

  const fetchQuota = () => {
    return fetch('/api/quota')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setQuotas(data.quota);
        }
      })
      .catch(err => {
        console.error(err);
      });
  };

  useEffect(() => {
    if (!isProductionHolding) {
      fetchQuota();
    }
  }, [isProductionHolding]);

  if (isProductionHolding) {
    return <ProductionLanding />;
  }

  const handleProvinceChange = (prov: string) => {
    setProvince(prov);
    for (const [r, config] of Object.entries(REGIONS_CONFIG)) {
      if (config.provinces.includes(prov)) {
        setRegion(r as Region);
        break;
      }
    }
  };

  const currentQuota = quotas.find(q => q.region === region && q.category === category);
  const isFull = currentQuota ? currentQuota.availableSlots <= 0 : false;
  const availableSlots = currentQuota ? currentQuota.availableSlots : 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Nama Tim / Perguruan Tinggi wajib diisi');
      return;
    }

    if (isFull) {
      setErrorMsg(`Pendaftaran ditutup: Kuota 6 tim resmi untuk ${region} (${category}) sudah terpenuhi oleh tim yang terverifikasi.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          province,
          region,
          category,
          contactPerson: contactPerson.trim(),
          contactPhone: contactPhone.trim(),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error || 'Gagal mendaftarkan tim');
        return;
      }

      try {
        localStorage.removeItem('lvm_team_register_draft');
      } catch {}

      router.push(`/teams/${data.team.id}/roster?new=true`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan koneksi saat mengirim formulir.');
    } finally {
      setSubmitting(false);
    }
  };

  const allProvinces = [
    { name: 'DKI Jakarta', region: 'Barat' },
    { name: 'Jawa Barat', region: 'Barat' },
    { name: 'Banten', region: 'Barat' },
    { name: 'Jawa Tengah', region: 'Tengah' },
    { name: 'DI Yogyakarta', region: 'Tengah' },
    { name: 'Jawa Timur', region: 'Timur' },
    { name: 'Bali', region: 'Timur' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="text-center space-y-1 sm:space-y-1.5">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
          Formulir Pendaftaran Tim
        </h1>
        <p className="text-xs text-slate-500 dark:text-purple-300/70">
          Liga Voli Mahasiswa (LVM) • Langkah 1 dari 2: Registrasi Identitas Tim & Wilayah Regional
        </p>
      </div>

      {/* Quota Alert Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isFull
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            : 'bg-white dark:bg-[#15072c] border-purple-100 dark:border-purple-900/60 text-slate-700 dark:text-purple-200 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {isFull ? (
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Status Kuota: Regional {region} ({category})
              </div>
              <div className="text-xs text-slate-600 dark:text-purple-300/80 mt-0.5">
                {isFull ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    Kuota 6 Tim resmi sudah terpenuhi oleh tim terverifikasi.
                  </span>
                ) : (
                  <span>
                    Tersedia <strong className="text-pink-600 dark:text-pink-400 font-mono font-bold">{availableSlots}</strong> dari{' '}
                    {MAX_TEAMS_PER_REGION_CATEGORY} slot resmi (slot terkunci saat tim diverifikasi panitia).
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            {Array.from({ length: MAX_TEAMS_PER_REGION_CATEGORY }).map((_, idx) => {
              const isFilled = currentQuota ? idx < currentQuota.registeredTeams : false;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-sm transition-all ${
                    isFilled
                      ? 'bg-gradient-to-r from-pink-600 to-fuchsia-600 shadow-neon-pink'
                      : 'bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60'
                  }`}
                  title={`Slot ${idx + 1}: ${isFilled ? 'Terverifikasi' : 'Tersedia'}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-shake">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Draft Recovery Notification Banner */}
      {hasDraft && (
        <div className="p-3.5 rounded-2xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 text-purple-900 dark:text-purple-200">
            <div className="w-7 h-7 rounded-lg bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <span>
              <strong>Draf Pendaftaran Dipulihkan:</strong> Data formulir terakhir Anda dipulihkan otomatis dari browser.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 font-bold underline shrink-0 cursor-pointer ml-3"
            title="Hapus draf dan mulai dari formulir kosong"
          >
            Reset Formulir
          </button>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1 */}
          <div>
            <h3 className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> 1. Asal Wilayah & Kategori
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1.5">
                  Asal Provinsi <span className="text-pink-500">*</span>
                </label>
                <select
                  value={province}
                  onChange={e => handleProvinceChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                >
                  {allProvinces.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name} (Regional {p.region})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-purple-400/70 mt-1">
                  Otomatis terhubung ke <strong className="text-slate-800 dark:text-purple-200">Regional {region}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1.5">
                  Kategori Tim <span className="text-pink-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCategory('Putra')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      category === 'Putra'
                        ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-sky-500/20 dark:border-sky-500 dark:text-sky-300 shadow-sm'
                        : 'bg-purple-50/50 dark:bg-[#1f0e3f] border-purple-200/70 dark:border-purple-800/60 text-slate-600 dark:text-purple-300/70'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400"></span>
                    Putra
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('Putri')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      category === 'Putri'
                        ? 'bg-pink-50 border-pink-600 text-pink-700 dark:bg-pink-500/20 dark:border-pink-500 dark:text-pink-300 shadow-sm shadow-neon-pink'
                        : 'bg-purple-50/50 dark:bg-[#1f0e3f] border-purple-200/70 dark:border-purple-800/60 text-slate-600 dark:text-purple-300/70'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-pink-600 dark:bg-pink-400"></span>
                    Putri
                  </button>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-purple-50 dark:border-purple-950" />

          {/* Section 2 */}
          <div>
            <h3 className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building className="w-4 h-4" /> 2. Identitas Tim & Perguruan Tinggi
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1.5">
                  Nama Team / Universitas <span className="text-pink-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Universitas Indonesia / ITB / UNY"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1.5">
                  Alamat Kampus / Sekretariat Tim
                </label>
                <textarea
                  rows={2}
                  placeholder="Alamat lengkap perguruan tinggi atau sekretariat tim..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                />
              </div>
            </div>
          </div>

          <hr className="border-purple-50 dark:border-purple-950" />

          {/* Section 3 */}
          <div>
            <h3 className="text-xs font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4" /> 3. Penanggung Jawab / Official Kontak
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1.5">
                  Nama Kontak PIC / Manajer
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-purple-200 mb-1.5">
                  Nomor WhatsApp / HP
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-between flex-wrap gap-4 border-t border-purple-50 dark:border-purple-950">
            <p className="text-[11px] text-slate-500 dark:text-purple-300/70">
              * Setelah data tim tersimpan, Anda akan diarahkan ke form pengisian{' '}
              <strong className="text-pink-600 dark:text-pink-400 font-bold">20 Personel Roster</strong>.
            </p>

            <button
              type="submit"
              disabled={submitting || isFull}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isFull
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-500 text-white shadow-md active:scale-95'
              }`}
            >
              {submitting ? (
                <span>Menyimpan Tim...</span>
              ) : (
                <>
                  <span>Simpan & Lanjut Isi 20 Personel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
