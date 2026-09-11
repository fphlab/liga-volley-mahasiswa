'use client';

import React from 'react';
import { Region, Category, RegionalQuota, REGIONS_CONFIG, MAX_TEAMS_PER_REGION_CATEGORY } from '@/lib/types';
import { MapPin, Shield } from 'lucide-react';

interface QuotaCardProps {
  region: Region;
  quotas: RegionalQuota[];
}

export default function QuotaCard({ region, quotas }: QuotaCardProps) {
  const config = REGIONS_CONFIG[region];
  const putraQuota = quotas.find(q => q.region === region && q.category === 'Putra') || {
    region,
    category: 'Putra' as Category,
    maxTeams: MAX_TEAMS_PER_REGION_CATEGORY,
    registeredTeams: 0,
    availableSlots: MAX_TEAMS_PER_REGION_CATEGORY,
  };

  const putriQuota = quotas.find(q => q.region === region && q.category === 'Putri') || {
    region,
    category: 'Putri' as Category,
    maxTeams: MAX_TEAMS_PER_REGION_CATEGORY,
    registeredTeams: 0,
    availableSlots: MAX_TEAMS_PER_REGION_CATEGORY,
  };

  const totalRegistered = putraQuota.registeredTeams + putriQuota.registeredTeams;
  const totalMax = 12; // 6 Putra + 6 Putri

  return (
    <div className="relative overflow-hidden bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm hover:shadow-md dark:hover:border-pink-500/30 transition-all group">
      {/* Top Accent Gradient Border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 opacity-80" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-purple-50 dark:border-purple-950">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-black italic text-base text-slate-900 dark:text-white uppercase tracking-tight">
              {config.name}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-purple-300/70 mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400 shrink-0" />
            <span className="truncate">{config.provinces.join(', ')}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black font-mono text-pink-600 dark:text-pink-400">
            {totalRegistered} <span className="text-xs font-normal text-slate-400 dark:text-purple-400/60">/{totalMax}</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-purple-400/60">Terverifikasi</span>
        </div>
      </div>

      {/* Quota Progress Putra & Putri */}
      <div className="space-y-3">
        {/* Putra */}
        <div className="bg-purple-50/50 dark:bg-[#1a0c36]/70 p-3 rounded-xl border border-purple-100/80 dark:border-purple-900/40">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-blue-700 dark:text-sky-300 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-sky-400"></span>
              Tim Putra
            </span>
            <span className={putraQuota.availableSlots === 0 ? 'text-pink-600 dark:text-pink-400 font-black' : 'text-slate-700 dark:text-purple-200 font-mono font-semibold'}>
              {putraQuota.registeredTeams} / {MAX_TEAMS_PER_REGION_CATEGORY} Terverifikasi
              {putraQuota.availableSlots === 0 && ' (PENUH)'}
            </span>
          </div>

          {/* 6 slot indicators */}
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: MAX_TEAMS_PER_REGION_CATEGORY }).map((_, idx) => {
              const isFilled = idx < putraQuota.registeredTeams;
              return (
                <div
                  key={idx}
                  title={`Slot Tim Putra ${idx + 1}: ${isFilled ? 'Terverifikasi' : 'Tersedia'}`}
                  className={`h-2.5 rounded-sm transition-all ${
                    isFilled
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-500 dark:to-blue-600 shadow-xs'
                      : 'bg-purple-100 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/50'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Putri */}
        <div className="bg-purple-50/50 dark:bg-[#1a0c36]/70 p-3 rounded-xl border border-purple-100/80 dark:border-purple-900/40">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-pink-700 dark:text-pink-300 flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-pink-600 dark:bg-pink-400"></span>
              Tim Putri
            </span>
            <span className={putriQuota.availableSlots === 0 ? 'text-pink-600 dark:text-pink-400 font-black' : 'text-slate-700 dark:text-purple-200 font-mono font-semibold'}>
              {putriQuota.registeredTeams} / {MAX_TEAMS_PER_REGION_CATEGORY} Terverifikasi
              {putriQuota.availableSlots === 0 && ' (PENUH)'}
            </span>
          </div>

          {/* 6 slot indicators */}
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: MAX_TEAMS_PER_REGION_CATEGORY }).map((_, idx) => {
              const isFilled = idx < putriQuota.registeredTeams;
              return (
                <div
                  key={idx}
                  title={`Slot Tim Putri ${idx + 1}: ${isFilled ? 'Terverifikasi' : 'Tersedia'}`}
                  className={`h-2.5 rounded-sm transition-all ${
                    isFilled
                      ? 'bg-gradient-to-r from-pink-600 to-fuchsia-600 dark:from-pink-500 dark:to-fuchsia-500 shadow-neon-pink'
                      : 'bg-purple-100 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/50'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
