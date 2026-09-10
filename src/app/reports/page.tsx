'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Search,
  IdCard,
  CheckCircle2,
  BadgeCheck,
  Shirt,
  GraduationCap, 
  Building, 
  User, 
  RefreshCw 
} from 'lucide-react';
import { Team, Member } from '@/lib/types';
import { exportReport1ToExcel, exportReport2ToExcel, exportReport3ToExcel } from '@/lib/exportExcel';
import LvmLogo from '@/components/LvmLogo';

type ReportTab = 'report1' | 'report2' | 'report3' | 'idcards';

export default function ReportsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('report1');

  // Filters
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTeams = () => {
    return fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTeams(data.teams);
        }
      })
      .catch(err => {
        console.error('Error fetching teams for reports:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const filteredTeams = teams.filter(t => {
    const matchesRegion = selectedRegion === 'ALL' || t.region === selectedRegion;
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesTeam = selectedTeamId === 'ALL' || t.id === selectedTeamId;
    return matchesRegion && matchesCategory && matchesTeam;
  });

  // Report 1: Search within teams and members (players & officials)
  const report1Teams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return filteredTeams.map(team => ({
        ...team,
        displayPlayers: team.members.filter(m => m.teamRole === 'Pemain'),
        officials: team.members.filter(m => m.teamRole !== 'Pemain'),
      }));
    }

    return filteredTeams
      .map(team => {
        const teamMatches =
          team.name.toLowerCase().includes(query) ||
          team.teamNumber.toLowerCase().includes(query) ||
          team.province.toLowerCase().includes(query);

        const teamPlayers = team.members.filter(m => m.teamRole === 'Pemain');
        const teamOfficials = team.members.filter(m => m.teamRole !== 'Pemain');

        const matchingPlayers = teamPlayers.filter(player => {
          return (
            (player.fullName && player.fullName.toLowerCase().includes(query)) ||
            (player.jerseyNumber && player.jerseyNumber.toLowerCase().includes(query)) ||
            (player.nim && player.nim.toLowerCase().includes(query)) ||
            (player.position && player.position.toLowerCase().includes(query)) ||
            (player.faculty && player.faculty.toLowerCase().includes(query)) ||
            (player.major && player.major.toLowerCase().includes(query)) ||
            (player.regNumber && player.regNumber.toLowerCase().includes(query))
          );
        });

        const officialMatches = teamOfficials.some(
          o =>
            (o.fullName && o.fullName.toLowerCase().includes(query)) ||
            (o.teamRole && o.teamRole.toLowerCase().includes(query)) ||
            (o.nim && o.nim.toLowerCase().includes(query))
        );

        // If team metadata or coach/manager matches, display all players; otherwise display matching players
        const displayPlayers = (teamMatches || officialMatches) ? teamPlayers : matchingPlayers;
        const hasMatch = teamMatches || matchingPlayers.length > 0 || officialMatches;

        if (!hasMatch) return null;

        return {
          ...team,
          displayPlayers,
          officials: teamOfficials,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);
  }, [filteredTeams, searchTerm]);

  // Report 3: Filtered and searched teams
  const report3Teams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return filteredTeams;
    return filteredTeams.filter(team => {
      const teamMatches =
        team.name.toLowerCase().includes(query) ||
        team.teamNumber.toLowerCase().includes(query) ||
        team.province.toLowerCase().includes(query) ||
        team.region.toLowerCase().includes(query) ||
        team.category.toLowerCase().includes(query);
      const memberMatches = team.members.some(
        m =>
          (m.fullName && m.fullName.toLowerCase().includes(query)) ||
          (m.nim && m.nim.toLowerCase().includes(query)) ||
          (m.jerseyNumber && m.jerseyNumber.toLowerCase().includes(query)) ||
          (m.position && m.position.toLowerCase().includes(query))
      );
      return teamMatches || memberMatches;
    });
  }, [filteredTeams, searchTerm]);

  const allFilteredPlayers: Array<{ team: Team; member: Member }> = [];
  const allFilteredMembers: Array<{ team: Team; member: Member }> = [];

  filteredTeams.forEach(team => {
    team.members.forEach(member => {
      allFilteredMembers.push({ team, member });
      if (member.teamRole === 'Pemain') {
        allFilteredPlayers.push({ team, member });
      }
    });
  });

  const searchedPlayers = allFilteredPlayers.filter(({ team, member }) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (member.fullName && member.fullName.toLowerCase().includes(term)) ||
      (member.jerseyNumber && member.jerseyNumber.toLowerCase().includes(term)) ||
      (member.nim && member.nim.toLowerCase().includes(term)) ||
      (member.position && member.position.toLowerCase().includes(term)) ||
      (member.faculty && member.faculty.toLowerCase().includes(term)) ||
      (member.major && member.major.toLowerCase().includes(term)) ||
      (member.regNumber && member.regNumber.toLowerCase().includes(term)) ||
      team.name.toLowerCase().includes(term) ||
      team.teamNumber.toLowerCase().includes(term) ||
      team.province.toLowerCase().includes(term)
    );
  });

  const searchedMembers = allFilteredMembers.filter(({ team, member }) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (member.fullName && member.fullName.toLowerCase().includes(term)) ||
      (member.nim && member.nim.toLowerCase().includes(term)) ||
      (member.faculty && member.faculty.toLowerCase().includes(term)) ||
      (member.major && member.major.toLowerCase().includes(term)) ||
      (member.jerseyNumber && member.jerseyNumber.toLowerCase().includes(term)) ||
      (member.position && member.position.toLowerCase().includes(term)) ||
      (member.regNumber && member.regNumber.toLowerCase().includes(term)) ||
      team.name.toLowerCase().includes(term) ||
      team.teamNumber.toLowerCase().includes(term) ||
      team.province.toLowerCase().includes(term)
    );
  });

  const handleExportExcel = async () => {
    try {
      if (activeTab === 'report1') {
        const exportTeams = report1Teams.map(t => ({
          ...t,
          members: [...t.displayPlayers, ...t.officials],
        }));
        await exportReport1ToExcel(exportTeams);
      } else if (activeTab === 'report2') {
        const teamMap = new Map<string, Team>();
        searchedMembers.forEach(({ team, member }) => {
          if (!teamMap.has(team.id)) {
            teamMap.set(team.id, { ...team, members: [] });
          }
          teamMap.get(team.id)!.members.push(member);
        });
        await exportReport2ToExcel(Array.from(teamMap.values()));
      } else if (activeTab === 'report3' || activeTab === 'idcards') {
        await exportReport3ToExcel(report3Teams);
      }
    } catch (err) {
      console.error('Error exporting Excel report:', err);
      alert('Gagal mengekspor laporan Excel. Silakan coba lagi.');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-20 print:pb-0 print:space-y-3 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-1 sm:p-1.5 rounded-2xl bg-gradient-to-br from-[#1c083e] via-[#240a4e] to-[#120427] border border-purple-700/60 shadow-md shrink-0">
            <LvmLogo variant="badge" size="sm" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
              Modul Pelaporan Resmi
            </h1>
            <p className="text-xs text-slate-500 dark:text-purple-300/70">
              Rekapitulasi Report 1, Report 2, dan Report 3 Liga Voli Mahasiswa Nasional
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <button
            onClick={fetchTeams}
            className="p-2.5 rounded-xl bg-white dark:bg-[#15072c] border border-purple-200 dark:border-purple-800 text-slate-600 hover:text-pink-600 dark:text-purple-300 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-colors shadow-xs cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#15072c] hover:bg-purple-50 dark:hover:bg-purple-900/50 text-slate-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-pink-500" />
            <span>Cetak (PDF)</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar border-b border-purple-100 dark:border-purple-950 print:hidden">
        <button
          onClick={() => setActiveTab('report1')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'report1'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#15072c] text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white border border-purple-100 dark:border-purple-900/60'
          }`}
        >
          <Shirt className="w-3.5 h-3.5" />
          <span>REPORT 1: Roster Fisik</span>
        </button>

        <button
          onClick={() => setActiveTab('report2')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'report2'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#15072c] text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white border border-purple-100 dark:border-purple-900/60'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>REPORT 2: Akademik (NIM)</span>
        </button>

        <button
          onClick={() => setActiveTab('report3')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'report3'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#15072c] text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white border border-purple-100 dark:border-purple-900/60'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>REPORT 3: Rekap Tim</span>
        </button>

        <button
          onClick={() => setActiveTab('idcards')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'idcards'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-white dark:bg-[#15072c] text-slate-600 dark:text-purple-300/70 hover:text-slate-900 dark:hover:text-white border border-purple-100 dark:border-purple-900/60'
          }`}
        >
          <IdCard className="w-3.5 h-3.5" />
          <span>Galeri ID Card</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden transition-colors">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pemain, jersey, NIM, posisi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer text-xs"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="py-1.5 px-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
          >
            <option value="ALL">Semua Region</option>
            <option value="Barat">Barat</option>
            <option value="Tengah">Tengah</option>
            <option value="Timur">Timur</option>
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="py-1.5 px-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-pink-500"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="Putra">Putra</option>
            <option value="Putri">Putri</option>
          </select>

          <select
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
            className="py-1.5 px-2.5 rounded-xl bg-purple-50/50 dark:bg-[#1f0e3f] border border-purple-200/70 dark:border-purple-800/60 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-pink-500 max-w-[180px]"
          >
            <option value="ALL">Semua Tim ({filteredTeams.length})</option>
            {filteredTeams.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.category})
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-purple-400/70 font-mono font-medium self-end sm:self-auto">
          {activeTab === 'report1' && (
            <>Total: <strong className="text-pink-600 dark:text-pink-400 font-bold">{report1Teams.length}</strong> Tim</>
          )}
          {activeTab === 'report2' && (
            <>Total: <strong className="text-pink-600 dark:text-pink-400 font-bold">{searchedMembers.length}</strong> Personel</>
          )}
          {activeTab === 'report3' && (
            <>Total: <strong className="text-pink-600 dark:text-pink-400 font-bold">{report3Teams.length}</strong> Tim</>
          )}
          {activeTab === 'idcards' && (
            <>Total: <strong className="text-pink-600 dark:text-pink-400 font-bold">{searchedPlayers.length}</strong> Pemain</>
          )}
        </div>
      </div>

      {/* Official Print Header */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-2 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lvm-logo.png"
          alt="Logo Liga Voli Mahasiswa"
          className="h-12 w-auto mx-auto mb-1 object-contain"
        />
        <h2 className="text-base font-black uppercase text-black">
          LIGA VOLI MAHASISWA (LVM)
        </h2>
        <p className="text-xs font-bold text-gray-700 uppercase">
          {activeTab === 'report1' && 'REPORT 1: DAFTAR ROSTER PEMAIN, POSISI & FISIK'}
          {activeTab === 'report2' && 'REPORT 2: LEMBAR VERIFIKASI AKADEMIK & KEMAHASISWAAN'}
          {activeTab === 'report3' && 'REPORT 3: REKAPITULASI TIM TIGA WILAYAH REGIONAL'}
          {activeTab === 'idcards' && 'LEMBAR AKREDITASI & GALERI FOTO RESMI PESERTA'}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
          Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} • Status: Terverifikasi
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Memuat data laporan...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: REPORT 1 */}
          {activeTab === 'report1' && (
            <div className="space-y-5">
              {report1Teams.length === 0 ? (
                <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-12 text-center shadow-sm">
                  <Search className="w-10 h-10 text-slate-300 dark:text-purple-500/40 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-purple-200">
                    Tidak ada data pemain atau tim yang sesuai dengan pencarian &ldquo;{searchTerm}&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 dark:text-purple-400/60 mt-1">
                    Coba kata kunci nama pemain, nomor punggung/jersey, posisi, atau bersihkan filter pencarian.
                  </p>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Reset Pencarian
                    </button>
                  )}
                </div>
              ) : (
                report1Teams.map(team => {
                  const teamPlayers = team.displayPlayers;
                  const teamOfficials = team.officials;

                  return (
                    <div
                      key={team.id}
                      className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm transition-colors print:bg-white print:border-gray-400 print:p-3 print:mb-6 print:break-inside-avoid"
                    >
                      {/* Team Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-purple-50 dark:border-purple-950 print:border-gray-300 gap-1.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white print:text-black">
                              {team.name}
                            </h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                team.category === 'Putra'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300 print:text-black'
                                  : 'bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 print:text-black'
                              }`}
                            >
                              {team.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-purple-400/70 print:text-gray-600 mt-0.5">
                            No. Daftar: <strong className="font-mono font-black text-pink-600 dark:text-pink-400 print:text-black">{team.teamNumber}</strong> • {team.province} (Reg. {team.region})
                          </p>
                        </div>

                        <div className="text-[11px] text-slate-600 dark:text-purple-300 print:text-gray-700">
                          Manager: <strong className="text-slate-900 dark:text-white print:text-black">{teamOfficials.find(o => o.teamRole === 'Team Manager')?.fullName || '-'}</strong> | Pelatih: <strong className="text-slate-900 dark:text-white print:text-black">{teamOfficials.find(o => o.teamRole === 'Head Coach')?.fullName || '-'}</strong>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-purple-100 dark:border-purple-900/60 print:border-gray-400 text-slate-700 dark:text-pink-400 print:text-black font-black uppercase tracking-wider">
                              <th className="py-2.5 px-3">NO. JERSEY</th>
                              <th className="py-2.5 px-3">NAMA PEMAIN</th>
                              <th className="py-2.5 px-3">POSISI</th>
                              <th className="py-2.5 px-3">TINGGI</th>
                              <th className="py-2.5 px-3">BERAT</th>
                              <th className="py-2.5 px-3">FAKULTAS</th>
                              <th className="py-2.5 px-3 print:hidden">FOTO</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-50 dark:divide-purple-950/60 print:divide-gray-200">
                            {teamPlayers.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-4 text-center text-slate-400 dark:text-purple-400/60 italic">
                                  Tidak ada pemain yang sesuai pada tim ini
                                </td>
                              </tr>
                            ) : (
                              teamPlayers.map((player, idx) => (
                                <tr key={player.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30">
                                  <td className="py-2.5 px-3 font-mono font-black text-pink-600 dark:text-pink-400 print:text-black text-xs">
                                    {player.jerseyNumber || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                                    {player.fullName || <span className="text-slate-400 dark:text-purple-400/40 italic">(Slot #{idx + 1} Kosong)</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black font-semibold">
                                    {player.position || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-300 print:text-black">
                                    {player.height ? `${player.height} cm` : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-300 print:text-black">
                                    {player.weight ? `${player.weight} kg` : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black">
                                    {player.faculty || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 print:hidden">
                                    {player.photoUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={player.photoUrl} alt="Jersey" className="w-7 h-9 object-cover rounded border border-purple-200 dark:border-purple-800" />
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: REPORT 2 */}
          {activeTab === 'report2' && (
            <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm transition-colors print:bg-white print:border-gray-400 print:p-3">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-50 dark:border-purple-950 print:border-gray-300">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white print:text-black uppercase">
                    REPORT 2: Verifikasi Data Akademik Mahasiswa
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-purple-400/70 print:text-gray-600">
                    Memastikan keabsahan status mahasiswa aktif dari masing-masing perguruan tinggi
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-pink-600 dark:text-pink-400 print:text-black">
                  Total {searchedMembers.length} Personel
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-purple-100 dark:border-purple-900/60 print:border-gray-400 text-slate-700 dark:text-pink-400 print:text-black font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3">NO. URUT DAFTAR</th>
                      <th className="py-2.5 px-3">NAMA PEMAIN / PERSONEL</th>
                      <th className="py-2.5 px-3">TIM / KAMPUS</th>
                      <th className="py-2.5 px-3">NIM</th>
                      <th className="py-2.5 px-3">FAKULTAS</th>
                      <th className="py-2.5 px-3">JURUSAN</th>
                      <th className="py-2.5 px-3">TAHUN MASUK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 dark:divide-purple-950/60 print:divide-gray-200">
                    {searchedMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-purple-400/60 text-xs italic">
                          Tidak ada personel atau mahasiswa yang sesuai dengan pencarian &ldquo;{searchTerm}&rdquo;
                        </td>
                      </tr>
                    ) : (
                      searchedMembers.map(({ team, member }) => (
                        <tr key={member.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30">
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-300 print:text-black font-bold">
                            {member.regNumber || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                            {member.fullName || <span className="text-slate-400 dark:text-purple-400/40 italic">(Belum diisi)</span>}
                            {member.teamRole !== 'Pemain' && (
                              <span className="ml-1.5 text-[10px] text-pink-600 dark:text-pink-400 print:text-gray-600 font-bold">
                                [{member.teamRole}]
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black font-medium">
                            {team.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-300 print:text-black">
                            {member.nim || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black">
                            {member.faculty || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black">
                            {member.major || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-purple-300 print:text-black">
                            {member.entryYear || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: REPORT 3 */}
          {activeTab === 'report3' && (
            <div className="bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-5 shadow-sm transition-colors print:bg-white print:border-gray-400 print:p-3">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-50 dark:border-purple-950 print:border-gray-300">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white print:text-black uppercase">
                    REPORT 3: Rekapitulasi Tim Tiga Wilayah Regional
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-purple-400/70 print:text-gray-600">
                    Alokasi 6 Tim Putra & 6 Tim Putri untuk Regional Barat, Tengah, dan Timur
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-pink-600 dark:text-pink-400 print:text-black">
                  Total {report3Teams.length} Tim Terdaftar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-purple-100 dark:border-purple-900/60 print:border-gray-400 text-slate-700 dark:text-pink-400 print:text-black font-black uppercase tracking-wider">
                      <th className="py-2.5 px-3">NO. URUT TEAM</th>
                      <th className="py-2.5 px-3">NAMA TEAM</th>
                      <th className="py-2.5 px-3">ASAL PROPINSI</th>
                      <th className="py-2.5 px-3">REGIONAL</th>
                      <th className="py-2.5 px-3">KATEGORI</th>
                      <th className="py-2.5 px-3">KELENGKAPAN (20)</th>
                      <th className="py-2.5 px-3">STATUS ROSTER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 dark:divide-purple-950/60 print:divide-gray-200">
                    {report3Teams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-purple-400/60 text-xs italic">
                          Tidak ada tim yang sesuai dengan pencarian &ldquo;{searchTerm}&rdquo;
                        </td>
                      </tr>
                    ) : (
                      report3Teams.map(team => {
                        const filledMembers = team.members.filter(m => m.fullName && m.fullName.trim() !== '').length;
                        const isComplete = filledMembers === 20;

                        return (
                          <tr key={team.id} className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30">
                            <td className="py-2.5 px-3 font-mono font-black text-pink-600 dark:text-pink-400 print:text-black">
                              {team.teamNumber}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                              {team.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-purple-300 print:text-black">
                              {team.province}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-purple-200 print:text-black font-semibold">
                              Regional {team.region}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  team.category === 'Putra'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-sky-500/20 dark:text-sky-300 print:text-black'
                                    : 'bg-pink-50 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 print:text-black'
                                }`}
                              >
                                {team.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-purple-200 print:text-black">
                              {filledMembers} / 20
                            </td>
                            <td className="py-2.5 px-3">
                              {team.status === 'Terverifikasi' ? (
                                <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 print:text-black font-bold">
                                  <BadgeCheck className="w-3.5 h-3.5 text-pink-500" />
                                  Terverifikasi
                                </span>
                              ) : isComplete ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 print:text-black font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Lengkap
                                </span>
                              ) : (
                                <span className="text-pink-600 dark:text-pink-400 print:text-black font-medium">
                                  Draft ({20 - filledMembers} slot lagi)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ID CARDS GALLERY */}
          {activeTab === 'idcards' && (
            <div className="space-y-4 print:space-y-0">
              <div className="id-cards-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 print:grid print:grid-cols-3 print:gap-2.5">
                {searchedPlayers.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 dark:text-purple-400/60 text-xs italic">
                    Tidak ada ID card pemain yang sesuai dengan pencarian &ldquo;{searchTerm}&rdquo;
                  </div>
                ) : (
                  searchedPlayers.map(({ team, member }) => (
                    <div
                      key={member.id}
                      className="id-card-item relative overflow-hidden bg-white dark:bg-[#15072c] border border-purple-100 dark:border-purple-900/60 rounded-2xl p-3 shadow-sm flex flex-col items-center text-center group hover:border-pink-500/60 hover:shadow-neon-pink transition-all print:bg-white print:border-gray-400 print:text-black print:rounded-xl print:p-2 print:shadow-none print:break-inside-avoid print:page-break-inside-avoid"
                    >
                      {/* Top Lanyard Header */}
                      <div className="w-full bg-gradient-to-r from-purple-700 via-pink-600 to-purple-700 print:from-slate-800 print:to-slate-800 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-1 rounded-md mb-2 print:mb-1 flex items-center justify-between">
                        <span>LVM</span>
                        <span>AKREDITASI</span>
                      </div>

                      <div className="w-full flex items-center justify-between text-[10px] mb-1.5 print:mb-1 font-mono">
                        <span className="text-slate-500 dark:text-purple-400/60 print:text-gray-600 truncate max-w-[65px]">{member.regNumber}</span>
                        <span className="w-5 h-5 rounded-md bg-pink-600 print:bg-slate-900 text-white font-black flex items-center justify-center text-[10px] shadow-xs">
                          #{member.jerseyNumber || '-'}
                        </span>
                      </div>

                      <div className="w-20 h-26 sm:w-22 sm:h-28 print:w-16 print:h-22 rounded-xl bg-purple-50 dark:bg-[#1f0e3f] border border-purple-200 dark:border-purple-800/80 overflow-hidden flex items-center justify-center mb-2 print:mb-1 shadow-xs group-hover:scale-105 transition-transform print:border-gray-300">
                        {member.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.photoUrl}
                            alt={member.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-purple-400 print:text-gray-500" />
                        )}
                      </div>

                      <h4 className="font-bold text-xs print:text-[11px] text-slate-900 dark:text-white print:text-black truncate w-full">
                        {member.fullName || '(Belum Diisi)'}
                      </h4>
                      <p className="text-[10px] print:text-[9px] text-pink-600 dark:text-pink-400 print:text-black font-black uppercase tracking-wide truncate w-full">
                        {member.position || 'Pemain'}
                      </p>
                      <p className="text-[10px] print:text-[9px] text-slate-500 dark:text-purple-400/70 print:text-gray-600 truncate w-full mt-0.5 print:mt-0">
                        {team.name}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Signature Block */}
          <div className="hidden print:grid grid-cols-3 text-center text-[11px] mt-8 print:break-inside-avoid text-black">
            <div>
              <p>Dibuat Oleh,</p>
              <p className="mt-12 font-bold underline">Sekretariat Pertandingan</p>
            </div>
            <div>
              <p>Diverifikasi Oleh,</p>
              <p className="mt-12 font-bold underline">Koordinator Regional</p>
            </div>
            <div>
              <p>Disahkan Oleh,</p>
              <p className="mt-12 font-bold underline">Ketua Panitia Pelaksana</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
