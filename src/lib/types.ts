export type Region = 'Barat' | 'Tengah' | 'Timur';
export type Category = 'Putra' | 'Putri';

export type TeamRole = 
  | 'Pemain' 
  | 'Team Manager' 
  | 'Head Coach' 
  | 'Assistant Pelatih' 
  | 'Utilities';

export type PlayingPosition = 
  | 'Setter' 
  | 'Outside Hitter' 
  | 'Opposite Hitter' 
  | 'Middle Blocker' 
  | 'Libero'
  | '-';

export interface Member {
  id: string;
  teamId: string;
  slotIndex: number; // 1-20
  regNumber: string; // Nomor Urut Daftar
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  nim: string; // Nomor Induk Mahasiswa
  faculty: string; // Fakultas
  major: string; // Jurusan
  entryYear: string; // Tahun Masuk
  teamRole: TeamRole;
  jerseyNumber?: string; // Khusus pemain
  position?: PlayingPosition; // Khusus pemain
  height?: number; // cm
  weight?: number; // kg
  photoUrl?: string; // path to photo
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  teamNumber: string; // Nomor Daftar Team
  name: string; // Nama Team / Kampus
  address: string; // Alamat
  province: string; // Asal Propinsi
  region: Region;
  category: Category;
  contactPerson?: string;
  contactPhone?: string;
  ownerCode: string; // kode peserta (userN); '' = belum di-assign
  members: Member[];
  status: 'Draft' | 'Lengkap' | 'Terverifikasi';
  createdAt: string;
  updatedAt: string;
}

export interface RegionalQuota {
  region: Region;
  category: Category;
  maxTeams: number;
  registeredTeams: number;
  availableSlots: number;
}

export const REGIONS_CONFIG: Record<Region, { provinces: string[]; name: string }> = {
  Barat: {
    name: 'Regional Barat',
    provinces: ['DKI Jakarta', 'Jawa Barat', 'Banten'],
  },
  Tengah: {
    name: 'Regional Tengah',
    provinces: ['Jawa Tengah', 'DI Yogyakarta'],
  },
  Timur: {
    name: 'Regional Timur',
    provinces: ['Jawa Timur', 'Bali'],
  },
};

export const MAX_TEAMS_PER_REGION_CATEGORY = 6;
export const TOTAL_PLAYERS_PER_TEAM = 15;
export const TOTAL_OFFICIALS_PER_TEAM = 5;
export const TOTAL_MEMBERS_PER_TEAM = 20;

export const TEAM_ROLES_CONFIG: { role: TeamRole; count: number; label: string }[] = [
  { role: 'Pemain', count: 15, label: 'Pemain (15 Orang)' },
  { role: 'Team Manager', count: 1, label: 'Team Manager (1 Orang)' },
  { role: 'Head Coach', count: 1, label: 'Head Coach / Pelatih Utama (1 Orang)' },
  { role: 'Assistant Pelatih', count: 2, label: 'Assistant Pelatih (2 Orang)' },
  { role: 'Utilities', count: 1, label: 'Utilities (1 Orang)' },
];

export const PLAYING_POSITIONS: PlayingPosition[] = [
  'Setter',
  'Outside Hitter',
  'Opposite Hitter',
  'Middle Blocker',
  'Libero',
];
