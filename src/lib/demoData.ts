import { Team, Member, Region, Category, TeamRole } from './types';

/**
 * Generator data demo/simulasi Liga Volley Mahasiswa.
 * Dipisahkan dari seeder agar bisa dipakai oleh backend database mana pun
 * (sebelumnya: JSON file; kini: Supabase).
 */

const sampleTeamsData = [
  {
    name: 'Universitas Indonesia (UI)',
    province: 'DKI Jakarta',
    region: 'Barat' as Region,
    category: 'Putra' as Category,
    address: 'Kampus UI Depok, Jawa Barat / DKI Jakarta',
    contactPerson: 'Budi Santoso',
    contactPhone: '081234567890',
  },
  {
    name: 'Institut Teknologi Bandung (ITB)',
    province: 'Jawa Barat',
    region: 'Barat' as Region,
    category: 'Putri' as Category,
    address: 'Jl. Ganesa No. 10, Bandung, Jawa Barat',
    contactPerson: 'Siti Rahmawati',
    contactPhone: '081298765432',
  },
  {
    name: 'Universitas Negeri Yogyakarta (UNY)',
    province: 'DI Yogyakarta',
    region: 'Tengah' as Region,
    category: 'Putra' as Category,
    address: 'Jl. Colombo No. 1, Karang Malang, Yogyakarta',
    contactPerson: 'Agus Pratama',
    contactPhone: '081345678901',
  },
  {
    name: 'Universitas Gadjah Mada (UGM)',
    province: 'DI Yogyakarta',
    region: 'Tengah' as Region,
    category: 'Putri' as Category,
    address: 'Bulaksumur, Caturtunggal, Sleman, DI Yogyakarta',
    contactPerson: 'Dewi Lestari',
    contactPhone: '081398765432',
  },
  {
    name: 'Universitas Airlangga (UNAIR)',
    province: 'Jawa Timur',
    region: 'Timur' as Region,
    category: 'Putra' as Category,
    address: 'Jl. Airlangga No. 4 - 6, Gubeng, Surabaya',
    contactPerson: 'Dimas Wicaksono',
    contactPhone: '081512345678',
  },
  {
    name: 'Universitas Udayana (UNUD)',
    province: 'Bali',
    region: 'Timur' as Region,
    category: 'Putri' as Category,
    address: 'Jl. Raya Kampus UNUD, Jimbaran, Badung, Bali',
    contactPerson: 'Ni Wayan Sukerti',
    contactPhone: '081798765432',
  },
];

const faculties = ['Teknik', 'Ekonomi & Bisnis', 'Ilmu Olahraga', 'Hukum', 'Kedokteran', 'MIPA', 'ISIPOL'];
const majors = [
  'Teknik Industri', 'Manajemen', 'Pendidikan Jasmani', 'Ilmu Hukum',
  'Pendidikan Kepelatihan Olahraga', 'Akuntansi', 'Ilmu Komunikasi', 'Informatika'
];

const maleFirstNames = ['Rizky', 'Fajar', 'Rendi', 'Doni', 'Dimas', 'Farhan', 'Nanda', 'Yudha', 'Bayu', 'Alfin', 'Dio', 'Sigit', 'Rivan', 'Agil', 'Hernanda', 'Irpan', 'Fahry', 'Sandy', 'Boy', 'Hendrik'];
const femaleFirstNames = ['Megawati', 'Wilda', 'Shella', 'Yolla', 'Ratri', 'Hany', 'Arsela', 'Tisya', 'Arneta', 'Dita', 'Nurlaili', 'Shintia', 'Ajeng', 'Maya', 'Sania', 'Tiara', 'Bella', 'Aulia', 'Putri', 'Zahra'];
const lastNames = ['Pratama', 'Saputra', 'Nurmulki', 'Zulfikri', 'Febrianto', 'Kurniawan', 'Haryono', 'Firmansyah', 'Tamamilang', 'Anggara', 'Setiawan', 'Kusuma', 'Kurnia', 'Pertiwi', 'Wulandari', 'Hangestri', 'Nurfadilah', 'Sugandi', 'Berdian', 'Yuliana'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDemoMembers(teamId: string, teamNumber: string, isPutra: boolean): Member[] {
  const members: Member[] = [];
  const usedJersey = new Set<string>();
  const nowIso = new Date().toISOString();

  // 15 Pemain
  for (let i = 1; i <= 15; i++) {
    const firstNames = isPutra ? maleFirstNames : femaleFirstNames;
    const name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
    let jersey = String(i <= 12 ? i : i + 3);
    if (usedJersey.has(jersey)) {
      jersey = String(Math.floor(Math.random() * 80) + 20);
    }
    usedJersey.add(jersey);

    const pos = i === 1 || i === 8 ? 'Setter' :
                i === 2 || i === 9 ? 'Libero' :
                i === 3 || i === 7 || i === 12 ? 'Middle Blocker' :
                i === 4 || i === 10 ? 'Opposite Hitter' : 'Outside Hitter';

    const height = isPutra ? Math.floor(Math.random() * 18) + 180 : Math.floor(Math.random() * 15) + 168; // 180-198cm or 168-183cm
    const weight = isPutra ? Math.floor(Math.random() * 20) + 70 : Math.floor(Math.random() * 15) + 55; // 70-90kg or 55-70kg
    const entryYear = String(2021 + Math.floor(Math.random() * 4)); // 2021 - 2024
    const nimSuffix = String(Math.floor(Math.random() * 9000) + 1000);
    const nim = `${entryYear.slice(-2)}${Math.floor(Math.random() * 80) + 10}${nimSuffix}`;

    members.push({
      id: `mem_${teamId}_${i}`,
      teamId,
      slotIndex: i,
      regNumber: `${teamNumber.replace('LVM-', '')}-${String(i).padStart(2, '0')}`,
      fullName: name,
      birthDate: `${2001 + Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      nim,
      faculty: getRandomElement(faculties),
      major: getRandomElement(majors),
      entryYear,
      teamRole: 'Pemain',
      jerseyNumber: jersey,
      position: pos as Member['position'],
      height,
      weight,
      photoUrl: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 5 Official (Manager, Head Coach, 2 Ass Pelatih, Utilities)
  const officialRoles: TeamRole[] = ['Team Manager', 'Head Coach', 'Assistant Pelatih', 'Assistant Pelatih', 'Utilities'];

  officialRoles.forEach((role, idx) => {
    const slotIndex = 16 + idx;
    const name = `Drs. ${getRandomElement(maleFirstNames)} ${getRandomElement(lastNames)}, M.Pd`;
    members.push({
      id: `mem_${teamId}_${slotIndex}`,
      teamId,
      slotIndex,
      regNumber: `${teamNumber.replace('LVM-', '')}-${slotIndex}`,
      fullName: role === 'Utilities' ? `Pak ${getRandomElement(maleFirstNames)}` : name,
      birthDate: `${1975 + Math.floor(Math.random() * 20)}-05-15`,
      nim: '-',
      faculty: 'Official Staff',
      major: '-',
      entryYear: '-',
      teamRole: role,
      photoUrl: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  });

  return members;
}

/** Bangun 6 tim demo lengkap (20 personel per tim) untuk tiga regional. */
export function buildDemoTeams(): Team[] {
  return sampleTeamsData.map((sample, idx) => {
    const teamId = `team_seed_${idx + 1}`;
    const regCode = sample.region === 'Barat' ? 'BRT' : sample.region === 'Tengah' ? 'TGH' : 'TMR';
    const catCode = sample.category === 'Putra' ? 'PA' : 'PI';
    const teamNumber = `LVM-${regCode}-${catCode}-01`;

    const members = generateDemoMembers(teamId, teamNumber, sample.category === 'Putra');

    return {
      id: teamId,
      teamNumber,
      name: sample.name,
      address: sample.address,
      province: sample.province,
      region: sample.region,
      category: sample.category,
      contactPerson: sample.contactPerson,
      contactPhone: sample.contactPhone,
      members,
      status: 'Lengkap' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}
