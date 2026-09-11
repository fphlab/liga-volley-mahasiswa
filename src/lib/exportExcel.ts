import ExcelJS from 'exceljs';
import { Team } from './types';

// Pengganti paket "xlsx" (SheetJS versi npm berhenti di 0.18.5 dan menyimpan
// beberapa CVE yang belum diperbaiki di registry npm). exceljs aktif
// dipelihara dan mendukung penulisan .xlsx penuh dari browser.

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type ReportRow = Record<string, string | number>;

/**
 * Mencegah Formula / CSV / DDE Injection di Excel (CWE-1236).
 * Jika sel diawali karakter formula (=, +, -, @, tab, newline), beri awalan petik tunggal (')
 * agar Microsoft Excel memperlakukannya sebagai teks statis murni, bukan formula eksekusi.
 */
function sanitizeCellValue(value: unknown): string | number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return '-';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str || '-';
}

function buildWorksheet(worksheet: ExcelJS.Worksheet, rows: ReportRow[]): void {
  if (rows.length === 0) return;

  worksheet.columns = Object.keys(rows[0]).map(key => ({ header: key, key }));

  // Header kolom tebal agar konsisten dengan lembar laporan resmi
  worksheet.getRow(1).font = { bold: true };

  rows.forEach(row => {
    const sanitizedRow: ReportRow = {};
    for (const [k, v] of Object.entries(row)) {
      sanitizedRow[k] = sanitizeCellValue(v);
    }
    worksheet.addRow(sanitizedRow);
  });
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportReport1ToExcel(teams: Team[], filename = 'Report_1_Roster_Pemain_Liga_Voli.xlsx'): Promise<void> {
  const rows: ReportRow[] = [];

  teams.forEach(team => {
    const players = team.members.filter(m => m.teamRole === 'Pemain');
    players.forEach(p => {
      rows.push({
        'Nama Tim': team.name,
        'Regional': team.region,
        'Kategori': team.category,
        'No Urut Daftar': p.regNumber || '-',
        'No Jersey': p.jerseyNumber || '-',
        'Nama Pemain': p.fullName || '(Belum diisi)',
        'Posisi Bermain': p.position || '-',
        'Tinggi Badan (cm)': p.height || '-',
        'Berat Badan (kg)': p.weight || '-',
        'Fakultas': p.faculty || '-',
        'Jurusan': p.major || '-',
        'Angkatan': p.entryYear || '-',
      });
    });
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report 1 - Roster');
  buildWorksheet(worksheet, rows);
  await downloadWorkbook(workbook, filename);
}

export async function exportReport2ToExcel(teams: Team[], filename = 'Report_2_Verifikasi_Akademik_Liga_Voli.xlsx'): Promise<void> {
  const rows: ReportRow[] = [];

  teams.forEach(team => {
    team.members
      .filter(m => m.teamRole === 'Pemain')
      .forEach(m => {
        rows.push({
          'No Urut Daftar': m.regNumber || '-',
          'Nama Pemain (Mahasiswa)': m.fullName || '(Belum diisi)',
          'Posisi Bermain': m.position || 'Pemain',
          'Nomor Induk Mahasiswa (NIM)': m.nim || '-',
          'Fakultas': m.faculty || '-',
          'Jurusan': m.major || '-',
          'Tahun Masuk': m.entryYear || '-',
          'Nama Tim': team.name,
          'Regional': team.region,
          'Kategori': team.category,
        });
      });
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report 2 - Akademik');
  buildWorksheet(worksheet, rows);
  await downloadWorkbook(workbook, filename);
}

export async function exportReport3ToExcel(teams: Team[], filename = 'Report_3_Daftar_Tim_dan_Regional.xlsx'): Promise<void> {
  const rows: ReportRow[] = teams.map((t, idx) => {
    const playerCount = t.members.filter(m => m.teamRole === 'Pemain' && (m.fullName || '').trim() !== '').length;
    const officialCount = t.members.filter(m => m.teamRole !== 'Pemain' && (m.fullName || '').trim() !== '').length;
    return {
      'No': idx + 1,
      'No Urut Team': t.teamNumber,
      'Nama Team / Kampus': t.name,
      'Asal Provinsi': t.province,
      'Regional': t.region,
      'Kategori': t.category,
      'Pemain Terdaftar': `${playerCount}/15`,
      'Official Terdaftar': `${officialCount}/5`,
      'Total Personel': `${playerCount + officialCount}/20`,
      'Status Pendaftaran': t.status,
      'Kontak PIC': `${t.contactPerson || '-'} (${t.contactPhone || '-'})`,
    };
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report 3 - Rekap Tim');
  buildWorksheet(worksheet, rows);
  await downloadWorkbook(workbook, filename);
}
