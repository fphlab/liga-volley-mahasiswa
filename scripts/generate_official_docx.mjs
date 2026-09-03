import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  LineRuleType
} from 'docx';

const docsDir = path.join(process.cwd(), 'docs');

// Colors
const COLOR_NAVY = '1E3A8A';       // Navy Blue
const COLOR_DARK = '0F172A';       // Slate 900
const COLOR_TEXT = '1E293B';       // Slate 800
const COLOR_MUTED = '64748B';      // Slate 500
const COLOR_BORDER = 'CBD5E1';     // Slate 300
const COLOR_ZEBRA = 'F8FAFC';      // Slate 50
const COLOR_HEADER_BG = '1E3A8A';  // Primary Table Header
const COLOR_SUBTOTAL = 'F1F5F9';   // Slate 100
const COLOR_HIGHLIGHT = 'FEF3C7';  // Amber 100
const COLOR_TOTAL_BG = '0F172A';   // Dark total row

// Clean Border Helper
function standardBorder() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
  };
}

// Table Cell with Generous Breathing Room & Padding
function createTableCell(content, widthPercent, options = {}) {
  const {
    isHeader = false,
    align = AlignmentType.LEFT,
    bg = null,
    bold = false,
    size = 20, // 10pt
    paddingTop = 140, // Twips (spacious)
    paddingBottom = 140,
    paddingLeft = 180,
    paddingRight = 180,
  } = options;

  const paragraphs = Array.isArray(content) ? content : [content];

  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: isHeader ? { fill: COLOR_HEADER_BG, type: ShadingType.CLEAR } : (bg ? { fill: bg, type: ShadingType.CLEAR } : undefined),
    borders: standardBorder(),
    margins: { top: paddingTop, bottom: paddingBottom, left: paddingLeft, right: paddingRight },
    children: paragraphs.map(p => {
      if (p instanceof Paragraph) return p;
      return new Paragraph({
        alignment: align,
        spacing: { line: 280, before: 30, after: 30 },
        children: [
          new TextRun({
            text: String(p),
            bold: isHeader || bold,
            color: isHeader ? 'FFFFFF' : COLOR_TEXT,
            font: 'Calibri',
            size: isHeader ? 20 : size,
          }),
        ],
      });
    }),
  });
}

// Official Kop Surat (Letterhead) FPH Lab
function createFphKopSurat() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 30, line: 280 },
      children: [
        new TextRun({
          text: 'FPH LAB',
          bold: true,
          font: 'Calibri',
          size: 32, // 16pt
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 30, line: 260 },
      children: [
        new TextRun({
          text: 'STUDIO PENGEMBANGAN WEBSITE, APLIKASI WEB & SOLUSI DIGITAL',
          bold: true,
          font: 'Calibri',
          size: 19, // 9.5pt
          color: COLOR_TEXT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120, line: 240 },
      children: [
        new TextRun({
          text: 'Website: https://fphlab.web.id   |   WhatsApp: +62 856-0116-8136   |   Email: contact@fphlab.web.id',
          font: 'Calibri',
          size: 18, // 9pt
          color: COLOR_MUTED,
        }),
      ],
    }),
    // Double line separator (Official Kop Line)
    new Paragraph({
      border: {
        bottom: { color: COLOR_NAVY, size: 16, style: BorderStyle.SINGLE },
      },
      spacing: { before: 0, after: 180 },
    }),
  ];
}

// Spaced Paragraph Helpers with 1.25x Line Height and Clear Margins
function p(text, options = {}) {
  const {
    bold = false,
    italics = false,
    underline = false,
    size = 22, // 11pt standard
    color = COLOR_TEXT,
    align = AlignmentType.BOTH, // Justified by default for professional docs
    spaceBefore = 80,
    spaceAfter = 80,
    lineSpacing = 300, // 1.25x line height
    indentLeft = 0,
    hanging = 0,
  } = options;

  return new Paragraph({
    alignment: align,
    indent: indentLeft > 0 ? { left: indentLeft, hanging: hanging } : undefined,
    spacing: { before: spaceBefore, after: spaceAfter, line: lineSpacing, lineRule: LineRuleType.AUTO },
    children: [
      new TextRun({
        text,
        bold,
        italics,
        underline: underline ? {} : undefined,
        size,
        color,
        font: 'Calibri',
      }),
    ],
  });
}

function pRich(runs, options = {}) {
  const {
    align = AlignmentType.BOTH,
    spaceBefore = 80,
    spaceAfter = 80,
    lineSpacing = 300,
    indentLeft = 0,
    hanging = 0,
  } = options;

  return new Paragraph({
    alignment: align,
    indent: indentLeft > 0 ? { left: indentLeft, hanging: hanging } : undefined,
    spacing: { before: spaceBefore, after: spaceAfter, line: lineSpacing, lineRule: LineRuleType.AUTO },
    children: runs.map(r => new TextRun({
      font: 'Calibri',
      size: 22,
      color: COLOR_TEXT,
      ...r,
    })),
  });
}

// Professional Pasal Heading
function pasalHeading(pasalNum, pasalTitle) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 30, line: 260 },
      children: [
        new TextRun({
          text: `Pasal ${pasalNum}`,
          bold: true,
          font: 'Calibri',
          size: 23, // 11.5pt
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 140, line: 260 },
      children: [
        new TextRun({
          text: pasalTitle,
          bold: true,
          font: 'Calibri',
          size: 23,
          color: COLOR_NAVY,
        }),
      ],
    }),
  ];
}

// Document Section Heading
function sectionHeading(numStr, titleStr) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 80, line: 280 },
    children: [
      new TextRun({
        text: `${numStr}  ${titleStr}`,
        bold: true,
        font: 'Calibri',
        size: 24, // 12pt
        color: COLOR_NAVY,
      }),
    ],
  });
}

// Document Sub-section Heading
function subSectionHeading(letterStr, titleStr) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 60, line: 260 },
    children: [
      new TextRun({
        text: `${letterStr}. ${titleStr}`,
        bold: true,
        font: 'Calibri',
        size: 22, // 11pt
        color: COLOR_DARK,
      }),
    ],
  });
}

// Professional Signature Grid with Materai & Underlined Names
function createSignatureBlock(title1, name1, role1, title2, name2, role2, needMaterai = false) {
  const materaiElements = needMaterai ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120 },
      children: [
        new TextRun({
          text: '[ MATERAI Rp 10.000 ]',
          font: 'Calibri',
          size: 18,
          color: '94A3B8',
          italics: true,
        }),
      ],
    }),
  ] : [];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: title1, bold: true, font: 'Calibri', size: 22, color: COLOR_DARK })],
              }),
              ...materaiElements,
              new Paragraph({ spacing: { before: needMaterai ? 500 : 700 } }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 30 },
                children: [
                  new TextRun({ text: name1, bold: true, underline: {}, font: 'Calibri', size: 22, color: COLOR_DARK }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: role1, font: 'Calibri', size: 20, color: COLOR_MUTED })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: title2, bold: true, font: 'Calibri', size: 22, color: COLOR_DARK })],
              }),
              ...materaiElements,
              new Paragraph({ spacing: { before: needMaterai ? 500 : 700 } }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 30 },
                children: [
                  new TextRun({ text: name2, bold: true, underline: {}, font: 'Calibri', size: 22, color: COLOR_DARK }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [new TextRun({ text: role2, font: 'Calibri', size: 20, color: COLOR_MUTED })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Official Running Header & Footer
function createDocHeader(docRef, docName) {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: `FPH LAB  |  ${docRef} — ${docName}`,
            font: 'Calibri',
            size: 16,
            color: COLOR_MUTED,
          }),
        ],
      }),
    ],
  });
}

function createDocFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: 'FPH Lab (https://fphlab.web.id) • Dokumen Resmi Pengadaan Sistem LVM • Halaman ',
            font: 'Calibri',
            size: 16,
            color: COLOR_MUTED,
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: 'Calibri',
            size: 16,
            color: COLOR_NAVY,
            bold: true,
          }),
          new TextRun({
            text: ' dari ',
            font: 'Calibri',
            size: 16,
            color: COLOR_MUTED,
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: 'Calibri',
            size: 16,
            color: COLOR_NAVY,
            bold: true,
          }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// 1. PROPOSAL TEKNIS & PENAWARAN BIAYA (DOCX)
// ---------------------------------------------------------------------------
function buildProposalDocx() {
  const children = [
    ...createFphKopSurat(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 30 },
      children: [
        new TextRun({
          text: 'PROPOSAL TEKNIS & PENAWARAN BIAYA',
          bold: true,
          font: 'Calibri',
          size: 26,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'PENGEMBANGAN SISTEM INFORMASI PENDAFTARAN & PELAPORAN LIGA VOLLEY MAHASISWA (LVM)',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_DARK,
        }),
      ],
    }),

    // Meta Table Box
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell([
              pRich([
                { text: 'Nomor Dokumen : ', bold: true, color: COLOR_NAVY },
                { text: 'PROP/LVM-FPH/2026/001' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Tanggal              : ', bold: true, color: COLOR_NAVY },
                { text: '24 Agustus 2026' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
            createTableCell([
              pRich([
                { text: 'Kepada Yth. : ', bold: true, color: COLOR_NAVY },
                { text: 'Panitia Pelaksana LVM Nasional' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Vendor           : ', bold: true, color: COLOR_NAVY },
                { text: 'FPH Lab (https://fphlab.web.id)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 140 } }),

    sectionHeading('1.', 'RINGKASAN EKSEKUTIF & LATAR BELAKANG'),
    p('Liga Volley Mahasiswa (LVM) merupakan kejuaraan bola voli tingkat perguruan tinggi berskala nasional yang mencakup 3 Wilayah Regional utama (Barat, Tengah, Timur). Untuk memastikan akurasi data pendaftaran, validitas kuota kompetisi, serta kemudahan verifikasi keabsahan mahasiswa atlet pada saat Technical Meeting, dibutuhkan sistem informasi terpadu yang andal, cepat, dan siap mencetak laporan resmi (Report 1, Report 2, dan Report 3).'),
    p('FPH Lab (https://fphlab.web.id) siap menghadirkan solusi aplikasi web modern berbasis Next.js 15 dengan antarmuka yang bersih, responsif di smartphone (HP), berkinerja tinggi, dan terstandarisasi untuk administrasi kejuaraan resmi.'),

    sectionHeading('2.', 'RUANG LINGKUP SISTEM (SCOPE OF WORK)'),
    subSectionHeading('A', 'Pembagian 3 Wilayah Regional & Batasan Kuota (Total 36 Tim)'),
    p('1. Regional Barat (DKI Jakarta, Jawa Barat, Banten) : Kuota 6 Tim Putra + 6 Tim Putri (Maks. 12 Tim).', { indentLeft: 360, hanging: 360 }),
    p('2. Regional Tengah (Jawa Tengah, DI Yogyakarta)      : Kuota 6 Tim Putra + 6 Tim Putri (Maks. 12 Tim).', { indentLeft: 360, hanging: 360 }),
    p('3. Regional Timur (Jawa Timur, Bali)               : Kuota 6 Tim Putra + 6 Tim Putri (Maks. 12 Tim).', { indentLeft: 360, hanging: 360 }),
    p('4. Sistem Kunci Kuota Otomatis : Sistem secara cerdas mengunci formulir pendaftaran jika kuota 6 tim pada kategori dan regional bersangkutan telah terpenuhi.', { indentLeft: 360, hanging: 360 }),

    subSectionHeading('B', 'Struktur Roster 20 Personel per Tim (720 Peserta Se-Indonesia)'),
    p('Total alokasi peserta liga adalah 720 Orang (36 Tim × 20 Personel), dengan alokasi jabatan terkunci:'),
    p('• 15 Pemain Utama (Slot 1 - 15) : No. Jersey unik, Posisi Bermain (Setter, Outside Hitter, Opposite Hitter, Middle Blocker, Libero), Tinggi Badan (cm), Berat Badan (kg), NIM, Fakultas, Jurusan, Angkatan, dan Foto Jersey.', { indentLeft: 360, hanging: 180 }),
    p('• 1 Orang Team Manager (Slot 16)', { indentLeft: 360, hanging: 180 }),
    p('• 1 Orang Head Coach / Pelatih Kepala (Slot 17)', { indentLeft: 360, hanging: 180 }),
    p('• 2 Orang Assistant Pelatih (Slot 18 - 19)', { indentLeft: 360, hanging: 180 }),
    p('• 1 Orang Utilities / Perlengkapan (Slot 20)', { indentLeft: 360, hanging: 180 }),

    subSectionHeading('C', 'Modul Pelaporan Resmi & Dokumen Pertandingan'),
    p('• REPORT 1 (Roster Fisik & Posisi) : Rincian jersey, nama pemain, posisi main, tinggi/berat badan, fakultas, dan foto jersey untuk line-up check wasit.', { indentLeft: 360, hanging: 180 }),
    p('• REPORT 2 (Verifikasi Akademik)   : Rekapitulasi NIM, fakultas, jurusan, dan tahun angkatan untuk verifikasi keabsahan mahasiswa aktif di PDDikti.', { indentLeft: 360, hanging: 180 }),
    p('• REPORT 3 (Rekapitulasi Tim)      : Rekapitulasi kuota wilayah dan status kelengkapan 20 personel.', { indentLeft: 360, hanging: 180 }),
    p('• Galeri ID Card Atlet             : Kartu tanda pengenal berfoto resmi atlet & official siap cetak.', { indentLeft: 360, hanging: 180 }),
    p('• Engine Ekspor Excel & Cetak PDF  : Unduh spreadsheet (.xlsx) satu klik dan layout cetak PDF A4 bertanda tangan panitia.', { indentLeft: 360, hanging: 180 }),

    sectionHeading('3.', 'RENCANA ANGGARAN BIAYA (RAB) RESMI'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell('No', 8, { isHeader: true, align: AlignmentType.CENTER }),
            createTableCell('Deskripsi Komponen Layanan / Fitur Sistem', 52, { isHeader: true }),
            createTableCell('Kategori', 20, { isHeader: true, align: AlignmentType.CENTER }),
            createTableCell('Biaya (Rp)', 20, { isHeader: true, align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('1', 8, { align: AlignmentType.CENTER }),
            createTableCell('Paket Pengembangan Sistem Web Pendaftaran LVM (Next.js)\n• Form Registrasi Tim & Validasi Kuota 3 Regional\n• Form Roster 20 Personel + Validasi No Jersey Unik & Upload Foto\n• Antarmuka Responsif HP + Light/Dark Mode Switcher', 52),
            createTableCell('Jasa (Service)', 20, { align: AlignmentType.CENTER }),
            createTableCell('950.000', 20, { align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('2', 8, { align: AlignmentType.CENTER, bg: COLOR_ZEBRA }),
            createTableCell('Paket Modul Pelaporan & Ekspor Data Resmi\n• Report 1 (Roster Fisik), Report 2 (Akademik NIM), Report 3 (Rekap Tim)\n• Galeri ID Card Akreditasi Atlet & Official Berfoto\n• Ekspor Microsoft Excel (.xlsx) & Layout Cetak PDF A4', 52, { bg: COLOR_ZEBRA }),
            createTableCell('Jasa (Service)', 20, { align: AlignmentType.CENTER, bg: COLOR_ZEBRA }),
            createTableCell('350.000', 20, { align: AlignmentType.RIGHT, bg: COLOR_ZEBRA }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('3', 8, { align: AlignmentType.CENTER }),
            createTableCell('Dokumentasi Lengkap, Buku Panduan (User Manual) & Garansi Bug FPH Lab', 52),
            createTableCell('Jasa (Service)', 20, { align: AlignmentType.CENTER }),
            createTableCell('200.000', 20, { align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('A', 8, { align: AlignmentType.CENTER, bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('SUBTOTAL BIAYA JASA PENGEMBANGAN (SERVICE)', 72, { bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('Rp 1.500.000,-', 20, { align: AlignmentType.RIGHT, bg: COLOR_SUBTOTAL, bold: true }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('4', 8, { align: AlignmentType.CENTER }),
            createTableCell('Registrasi & Aktivasi Domain Resmi Organisasi / Kejuaraan (.ORG) - 1 Tahun', 52),
            createTableCell('Di luar Service', 20, { align: AlignmentType.CENTER }),
            createTableCell('200.000', 20, { align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('B', 8, { align: AlignmentType.CENTER, bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('SUBTOTAL BIAYA DI LUAR SERVICE (DOMAIN .ORG)', 72, { bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('Rp 200.000,-', 20, { align: AlignmentType.RIGHT, bg: COLOR_SUBTOTAL, bold: true }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('', 8, { align: AlignmentType.CENTER, bg: COLOR_TOTAL_BG, bold: true }),
            createTableCell('GRAND TOTAL INVESTASI PENGEMBANGAN SISTEM (A + B)', 72, { bg: COLOR_TOTAL_BG, bold: true, isHeader: true }),
            createTableCell('Rp 1.700.000,-', 20, { align: AlignmentType.RIGHT, bg: COLOR_TOTAL_BG, bold: true, isHeader: true }),
          ],
        }),
      ],
    }),

    pRich([
      { text: 'Terbilang: ', bold: true, color: COLOR_NAVY },
      { text: 'Satu Juta Tujuh Ratus Ribu Rupiah', bold: true, italics: true, color: COLOR_NAVY },
    ], { spaceBefore: 80, spaceAfter: 120 }),

    sectionHeading('4.', 'SKEMA & TERMIN PEMBAYARAN'),
    p('1. Termin I (Uang Muka / DP 50% Jasa + 100% Domain) : Sebesar Rp 950.000,- (Sembilan Ratus Lima Puluh Ribu Rupiah) dibayarkan pada saat penandatanganan Surat Perjanjian Kerja Sama (SPK).', { indentLeft: 360, hanging: 360 }),
    p('2. Termin II (Pelunasan 50% Sisa Jasa)             : Sebesar Rp 750.000,- (Tujuh Ratus Lima Puluh Ribu Rupiah) dibayarkan setelah seluruh modul selesai diuji coba (UAT) dan penyerahan aplikasi (BAST).', { indentLeft: 360, hanging: 360 }),

    new Paragraph({ spacing: { before: 240 } }),
    createSignatureBlock(
      'Disetujui Oleh,',
      'Ketua Panitia Pelaksana',
      'Panitia Pelaksana LVM Nasional',
      'Diajukan Oleh,',
      'FPH Lab',
      'Vendor / Web Developer (fphlab.web.id)'
    ),
  ];

  return new Document({
    sections: [
      {
        headers: { default: createDocHeader('PROP-01', 'Proposal Teknis & Penawaran Biaya') },
        footers: { default: createDocFooter() },
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1600, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 2. SURAT PERJANJIAN KERJA SAMA (SPK)
// ---------------------------------------------------------------------------
function buildSpkDocx() {
  const children = [
    ...createFphKopSurat(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({
          text: 'SURAT PERJANJIAN KERJA SAMA',
          bold: true,
          underline: {},
          font: 'Calibri',
          size: 26,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'Nomor: SPK/LVM-FPH/VIII/2026/014',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_DARK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'TENTANG PENGEMBANGAN SISTEM INFORMASI LIGA VOLLEY MAHASISWA (LVM)',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_MUTED,
        }),
      ],
    }),

    p('Pada hari ini, Senin tanggal Dua Puluh Empat bulan Agustus tahun Dua Ribu Dua Puluh Enam (24-08-2026), bertempat di Jakarta, telah dibuat dan disepakati perjanjian kerja sama oleh dan antara pihak-pihak:'),

    pRich([
      { text: '1.  NAMA                :  ', bold: true },
      { text: '[Nama Ketua Panitia Pelaksana]' },
    ], { indentLeft: 400, hanging: 400, spaceBefore: 40, spaceAfter: 20 }),
    pRich([
      { text: '     JABATAN        :  ', bold: true },
      { text: 'Ketua Panitia Pelaksana Liga Volley Mahasiswa Nasional' },
    ], { indentLeft: 400, hanging: 0, spaceBefore: 0, spaceAfter: 20 }),
    pRich([
      { text: '     ALAMAT          :  ', bold: true },
      { text: 'Sekretariat Panitia Liga Volley Mahasiswa' },
    ], { indentLeft: 400, hanging: 0, spaceBefore: 0, spaceAfter: 40 }),
    p('     Bertindak untuk dan atas nama Panitia Pelaksana Liga Volley Mahasiswa Nasional, selanjutnya disebut sebagai PIHAK PERTAMA (KLIEN).', { indentLeft: 400, spaceBefore: 0, spaceAfter: 80 }),

    pRich([
      { text: '2.  NAMA VENDOR :  ', bold: true },
      { text: 'FPH LAB (https://fphlab.web.id)' },
    ], { indentLeft: 400, hanging: 400, spaceBefore: 40, spaceAfter: 20 }),
    pRich([
      { text: '     KONTAK          :  ', bold: true },
      { text: 'WhatsApp: +62 856-0116-8136   |   Email: contact@fphlab.web.id' },
    ], { indentLeft: 400, hanging: 0, spaceBefore: 0, spaceAfter: 40 }),
    p('     Bertindak sebagai studio penyedia jasa pengembangan perangkat lunak dan sistem web, selanjutnya disebut sebagai PIHAK KEDUA (VENDOR).', { indentLeft: 400, spaceBefore: 0, spaceAfter: 140 }),

    p('Kedua belah pihak telah bersepakat untuk mengikatkan diri dalam Surat Perjanjian Kerja Sama dengan ketentuan pasal-pasal sebagai berikut:'),

    ...pasalHeading('1', 'RUANG LINGKUP PEKERJAAN'),
    p('(1) PIHAK PERTAMA memberikan tugas kepada PIHAK KEDUA dan PIHAK KEDUA menerima tugas tersebut untuk melaksanakan pekerjaan pengembangan Sistem Informasi Web Pendaftaran & Pelaporan Liga Volley Mahasiswa (LVM).', { indentLeft: 360, hanging: 360 }),
    p('(2) Ruang lingkup pekerjaan sebagaimana dimaksud pada ayat (1) meliputi:', { indentLeft: 360, hanging: 360 }),
    p('a. Modul Pendaftaran Tim dan Validasi Kuota 3 Wilayah Regional (Regional Barat, Tengah, Timur - Kuota maksimal 6 Tim Putra & 6 Tim Putri per regional);', { indentLeft: 720, hanging: 360 }),
    p('b. Modul Form Roster 20 Personel per Tim (15 Pemain + 5 Official) dengan validasi nomor punggung unik dan upload foto jersey;', { indentLeft: 720, hanging: 360 }),
    p('c. Modul Pelaporan Resmi Kejuaraan (Report 1 Roster Fisik, Report 2 Verifikasi Akademik NIM, Report 3 Rekapitulasi Tim 3 Wilayah, dan Galeri ID Card);', { indentLeft: 720, hanging: 360 }),
    p('d. Fitur Ekspor data ke format Microsoft Excel (.xlsx) dan format Cetak Dokumen PDF Resmi A4 bertanda tangan panitia;', { indentLeft: 720, hanging: 360 }),
    p('e. Antarmuka responsif untuk perangkat Desktop dan Smartphone (HP) serta fitur Light Mode & Dark Mode;', { indentLeft: 720, hanging: 360 }),
    p('f. Registrasi dan konfigurasi nama domain resmi .ORG selama 1 (satu) tahun periode kejuaraan.', { indentLeft: 720, hanging: 360 }),

    ...pasalHeading('2', 'BIAYA DAN CARA PEMBAYARAN'),
    p('(1) Total nilai pekerjaan yang disepakati oleh kedua belah pihak sebesar Rp 1.700.000,- (Satu Juta Tujuh Ratus Ribu Rupiah), dengan rincian:', { indentLeft: 360, hanging: 360 }),
    p('a. Biaya Jasa Pengembangan Sistem Web (Service) : Rp 1.500.000,-', { indentLeft: 720, hanging: 360 }),
    p('b. Biaya Registrasi Domain Resmi .ORG (1 Tahun) : Rp   200.000,-', { indentLeft: 720, hanging: 360 }),
    p('(2) Pembayaran dilakukan secara bertahap melalui transfer ke rekening resmi PIHAK KEDUA dengan ketentuan:', { indentLeft: 360, hanging: 360 }),
    p('a. Pembayaran Tahap I (Uang Muka / DP 50% Jasa + 100% Domain) sebesar Rp 950.000,- (Sembilan Ratus Lima Puluh Ribu Rupiah) dibayarkan saat penandatanganan Perjanjian ini.', { indentLeft: 720, hanging: 360 }),
    p('b. Pembayaran Tahap II (Pelunasan 50% Sisa Jasa) sebesar Rp 750.000,- (Tujuh Ratus Lima Puluh Ribu Rupiah) dibayarkan setelah seluruh modul selesai diuji coba (UAT) dan penandatanganan BAST.', { indentLeft: 720, hanging: 360 }),

    ...pasalHeading('3', 'KERAHASIAAN DATA (NON-DISCLOSURE AGREEMENT)'),
    p('(1) PIHAK KEDUA wajib menjaga kerahasiaan seluruh data peserta mahasiswa atlet dan official (NIM, nomor kontak, berkas foto) yang masuk ke dalam sistem.', { indentLeft: 360, hanging: 360 }),
    p('(2) PIHAK KEDUA dilarang menyebarluaskan, menyalin, atau menyerahkan data tersebut kepada pihak ketiga mana pun tanpa izin tertulis dari PIHAK PERTAMA.', { indentLeft: 360, hanging: 360 }),

    ...pasalHeading('4', 'GARANSI & PEMELIHARAAN SISTEM'),
    p('(1) PIHAK KEDUA memberikan garansi perbaikan kendala (bug fix) secara gratis selama masa pendaftaran dan pelaksanaan kejuaraan berlangsung.', { indentLeft: 360, hanging: 360 }),
    p('(2) Bantuan teknis diberikan secara responsif melalui kanal resmi FPH Lab (WhatsApp +62 856-0116-8136).', { indentLeft: 360, hanging: 360 }),

    ...pasalHeading('5', 'PENUTUP'),
    p('Surat Perjanjian ini dibuat dalam rangkap 2 (dua) bermaterai cukup, masing-masing mempunyai kekuatan hukum yang sama dan mulai berlaku sejak tanggal ditandatangani oleh kedua belah pihak.'),

    new Paragraph({ spacing: { before: 240 } }),
    createSignatureBlock(
      'PIHAK PERTAMA (KLIEN)',
      '[Nama Ketua Panitia]',
      'Ketua Panitia Pelaksana LVM',
      'PIHAK KEDUA (VENDOR)',
      'FPH Lab',
      'Pimpinan Vendor (fphlab.web.id)',
      true
    ),
  ];

  return new Document({
    sections: [
      {
        headers: { default: createDocHeader('SPK-02', 'Surat Perjanjian Kerja Sama') },
        footers: { default: createDocFooter() },
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1600, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 3. SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
// ---------------------------------------------------------------------------
function buildSrsDocx() {
  const children = [
    ...createFphKopSurat(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 30 },
      children: [
        new TextRun({
          text: 'SOFTWARE REQUIREMENTS SPECIFICATION (SRS)',
          bold: true,
          font: 'Calibri',
          size: 26,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'SPESIFIKASI KEBUTUHAN SISTEM PENDAFTARAN & PELAPORAN LIGA VOLLEY MAHASISWA',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_DARK,
        }),
      ],
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell([
              pRich([
                { text: 'Versi Dokumen : ', bold: true, color: COLOR_NAVY },
                { text: '1.0 (Production Baseline)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Platform            : ', bold: true, color: COLOR_NAVY },
                { text: 'Next.js 15, TypeScript, Tailwind CSS' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
            createTableCell([
              pRich([
                { text: 'Pengembang    : ', bold: true, color: COLOR_NAVY },
                { text: 'FPH Lab (https://fphlab.web.id)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Status                : ', bold: true, color: COLOR_NAVY },
                { text: 'Approved & Verified' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 140 } }),

    sectionHeading('1.', 'KEBUTUHAN FUNGSIONAL SISTEM (FUNCTIONAL REQUIREMENTS)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell('Kode', 12, { isHeader: true, align: AlignmentType.CENTER }),
            createTableCell('Modul / Fitur', 32, { isHeader: true }),
            createTableCell('Spesifikasi Teknis & Aturan Bisnis Sistem', 56, { isHeader: true }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('FR-01', 12, { align: AlignmentType.CENTER, bold: true }),
            createTableCell('Validasi Kuota 3 Regional', 32, { bold: true }),
            createTableCell('Membatasi kuota tetap 6 Tim Putra & 6 Tim Putri pada Regional Barat, Tengah, dan Timur (Total 36 Tim se-Indonesia). Sistem secara otomatis mengunci slot jika kuota penuh.', 56),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('FR-02', 12, { align: AlignmentType.CENTER, bold: true, bg: COLOR_ZEBRA }),
            createTableCell('Form Roster 20 Personel', 32, { bold: true, bg: COLOR_ZEBRA }),
            createTableCell('Mengunci struktur 15 Pemain + 5 Official (Manager, Coach, 2 Asisten, Utility). Dilengkapi validasi nomor punggung unik dan upload foto jersey 3:4.', 56, { bg: COLOR_ZEBRA }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('FR-03', 12, { align: AlignmentType.CENTER, bold: true }),
            createTableCell('REPORT 1 (Roster Fisik)', 32, { bold: true }),
            createTableCell('Tabel Roster Pertandingan: No Jersey, Nama Pemain, Posisi Main, Tinggi Badan, Berat Badan, Fakultas, dan Foto Jersey untuk verifikasi line-up wasit.', 56),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('FR-04', 12, { align: AlignmentType.CENTER, bold: true, bg: COLOR_ZEBRA }),
            createTableCell('REPORT 2 (Data Akademik)', 32, { bold: true, bg: COLOR_ZEBRA }),
            createTableCell('Tabel Verifikasi Akademik: No Urut Daftar, Nama, NIM, Fakultas, Program Studi, dan Tahun Angkatan Masuk untuk verifikasi status PDDikti.', 56, { bg: COLOR_ZEBRA }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('FR-05', 12, { align: AlignmentType.CENTER, bold: true }),
            createTableCell('REPORT 3 (Rekap Regional)', 32, { bold: true }),
            createTableCell('Tabel Rekapitulasi Tim: No Urut Tim, Nama Tim, Asal Provinsi, Regional, Kategori, dan Status Kelengkapan 20 Personel.', 56),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('FR-06', 12, { align: AlignmentType.CENTER, bold: true, bg: COLOR_ZEBRA }),
            createTableCell('Engine Ekspor & Cetak PDF', 32, { bold: true, bg: COLOR_ZEBRA }),
            createTableCell('Fitur download spreadsheet Microsoft Excel (.xlsx) dan format cetak dokumen resmi PDF A4 standar PBVSI/FIVB.', 56, { bg: COLOR_ZEBRA }),
          ],
        }),
      ],
    }),

    sectionHeading('2.', 'KEBUTUHAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)'),
    p('• Responsivitas Layar HP : Dilengkapi strip carousel horizontal (#1 - #20) untuk kemudahan navigasi slot di layar smartphone.', { indentLeft: 360, hanging: 180 }),
    p('• Pengalihan Tema Visual  : Mendukung fitur Light Mode (kertas putih kontras) dan Dark Mode.', { indentLeft: 360, hanging: 180 }),
    p('• Keamanan & Integritas    : Validasi format foto jersey (JPG/PNG/WebP, maks. 5MB) dan penyimpanan data persisten.', { indentLeft: 360, hanging: 180 }),
  ];

  return new Document({
    sections: [
      {
        headers: { default: createDocHeader('SRS-03', 'Software Requirements Specification') },
        footers: { default: createDocFooter() },
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1600, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 4. LEMBAR UJI TERIMA PENGGUNA (UAT)
// ---------------------------------------------------------------------------
function buildUatDocx() {
  const uatItems = [
    ['1', 'Pendaftaran Tim Baru', 'Mengisi nama tim, provinsi, kategori Putra.', 'Tim berhasil terdaftar dengan nomor otomatis dan masuk regional yang sesuai.'],
    ['2', 'Validasi Kuota 6 Tim', 'Mendaftarkan tim ke-7 pada regional yang sama.', 'Sistem menolak dan menampilkan notifikasi kuota penuh.'],
    ['3', 'Navigasi 20 Slot Roster', 'Membuka form 20 slot di desktop dan HP.', 'Desktop menampilkan sidebar; HP menampilkan carousel horizontal 1-20 yang praktis.'],
    ['4', 'Input 15 Pemain', 'Mengisi data NIM, Jurusan, TB/BB, Posisi.', 'Data tersimpan dengan benar pada masing-masing slot pemain.'],
    ['5', 'Cek Duplikasi Jersey', 'Memasukkan no jersey kembar dalam satu tim.', 'Sistem menolak dan memberi peringatan nomor sudah dipakai.'],
    ['6', 'Input 5 Official', 'Mengisi 1 Manager, 1 Coach, 2 Asisten, 1 Utility.', 'Jabatan official terkunci sesuai aturan kejuaraan.'],
    ['7', 'Upload Foto Jersey', 'Mengunggah file foto jersey 3:4.', 'Foto muncul pada slot, lembar tim, dan ID card.'],
    ['8', 'REPORT 1 (Roster Fisik)', 'Membuka tab Report 1 dan filter tim.', 'Tabel menampilkan Jersey, Nama, Posisi, TB, BB, Fakultas, Foto.'],
    ['9', 'REPORT 2 (Akademik)', 'Membuka tab Report 2.', 'Tabel menampilkan No Daftar, Nama, NIM, Fakultas, Jurusan, Angkatan.'],
    ['10', 'REPORT 3 (Rekap Tim)', 'Membuka tab Report 3.', 'Tabel menampilkan rekapitulasi tim 3 regional dan status 20 personel.'],
    ['11', 'Export Excel (.xlsx)', 'Mengklik tombol download Excel.', 'File .xlsx terunduh dan terbuka dengan rapi di Microsoft Excel.'],
    ['12', 'Cetak Laporan (PDF)', 'Mengklik tombol cetak PDF.', 'Tampilan dokumen cetak A4 bersih tanpa elemen navbar.'],
    ['13', 'Light & Dark Mode', 'Menekan tombol switch tema.', 'Tampilan berganti mulus antara mode terang dan gelap.'],
    ['14', 'Responsivitas HP', 'Mengakses via browser smartphone.', 'Seluruh tombol, form, dan kartu mudah dioperasikan di HP.'],
  ];

  const children = [
    ...createFphKopSurat(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 30 },
      children: [
        new TextRun({
          text: 'LEMBAR UJI TERIMA PENGGUNA (UAT)',
          bold: true,
          font: 'Calibri',
          size: 26,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'USER ACCEPTANCE TESTING — SISTEM LIGA VOLLEY MAHASISWA',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_DARK,
        }),
      ],
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell([
              pRich([
                { text: 'Tanggal Pengujian : ', bold: true, color: COLOR_NAVY },
                { text: '____________________' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Lokasi Pengujian   : ', bold: true, color: COLOR_NAVY },
                { text: 'Sekretariat Panitia LVM / Online' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
            createTableCell([
              pRich([
                { text: 'Pengembang : ', bold: true, color: COLOR_NAVY },
                { text: 'FPH Lab (fphlab.web.id)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Hasil Akhir    : ', bold: true, color: COLOR_NAVY },
                { text: 'DITERIMA (PASSED)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 140 } }),

    sectionHeading('1.', 'MATRIKS PENGUJIAN SKENARIO FITUR SISTEM'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell('No', 6, { isHeader: true, align: AlignmentType.CENTER }),
            createTableCell('Fitur / Modul', 22, { isHeader: true }),
            createTableCell('Skenario Pengujian', 26, { isHeader: true }),
            createTableCell('Hasil yang Diharapkan', 32, { isHeader: true }),
            createTableCell('Hasil Uji', 14, { isHeader: true, align: AlignmentType.CENTER }),
          ],
        }),
        ...uatItems.map((item, idx) => (
          new TableRow({
            children: [
              createTableCell(item[0], 6, { align: AlignmentType.CENTER, bg: idx % 2 === 1 ? COLOR_ZEBRA : null }),
              createTableCell(item[1], 22, { bold: true, bg: idx % 2 === 1 ? COLOR_ZEBRA : null }),
              createTableCell(item[2], 26, { bg: idx % 2 === 1 ? COLOR_ZEBRA : null }),
              createTableCell(item[3], 32, { bg: idx % 2 === 1 ? COLOR_ZEBRA : null }),
              createTableCell('☑ PASS\n☐ FAIL', 14, { align: AlignmentType.CENTER, bold: true, bg: idx % 2 === 1 ? COLOR_ZEBRA : null }),
            ],
          })
        )),
      ],
    }),

    new Paragraph({ spacing: { before: 140 } }),
    sectionHeading('2.', 'KESIMPULAN PENGUJIAN OLEH PANITIA'),
    p('☑  DITERIMA TANPA CATATAN (Sistem telah memenuhi 100% spesifikasi dan siap digunakan untuk pendaftaran resmi).', { bold: true }),
    p('☐  DITERIMA DENGAN CATATAN MINOR (Dapat digunakan dengan perbaikan kecil yang tidak menghambat).'),
    p('☐  DITOLAK / PERLU PERBAIKAN MAYOR.'),

    new Paragraph({ spacing: { before: 200 } }),
    createSignatureBlock(
      'Koordinator UAT (Panitia)',
      '[Nama Perwakilan Panitia]',
      'Panitia Pelaksana LVM',
      'Tim Pengembang (FPH Lab)',
      'FPH Lab',
      'Vendor IT (fphlab.web.id)'
    ),
  ];

  return new Document({
    sections: [
      {
        headers: { default: createDocHeader('UAT-04', 'Lembar Uji Terima Pengguna') },
        footers: { default: createDocFooter() },
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1600, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 5. BUKU PANDUAN PENGGUNA (USER MANUAL)
// ---------------------------------------------------------------------------
function buildUserManualDocx() {
  const children = [
    ...createFphKopSurat(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 30 },
      children: [
        new TextRun({
          text: 'BUKU PANDUAN PENGGUNA (USER MANUAL)',
          bold: true,
          font: 'Calibri',
          size: 26,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'PANDUAN OPERASIONAL SISTEM INFORMASI LIGA VOLLEY MAHASISWA',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_DARK,
        }),
      ],
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell([
              pRich([
                { text: 'Versi Panduan : ', bold: true, color: COLOR_NAVY },
                { text: '1.0 (Official Guide)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Akses Portal    : ', bold: true, color: COLOR_NAVY },
                { text: 'http://localhost:3000' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
            createTableCell([
              pRich([
                { text: 'Pengembang : ', bold: true, color: COLOR_NAVY },
                { text: 'FPH Lab (fphlab.web.id)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Pengguna     : ', bold: true, color: COLOR_NAVY },
                { text: 'Manajer Tim & Panitia LVM' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 140 } }),

    sectionHeading('1.', 'PETUNJUK AKSES & PENGATURAN TEMA'),
    p('Sistem web Liga Volley Mahasiswa dapat diakses melalui browser Google Chrome, Safari, Mozilla Firefox, atau Microsoft Edge baik di komputer (Desktop/Laptop) maupun ponsel pintar (Smartphone).'),
    p('• Pengalihan Tema: Klik tombol Matahari / Bulan di pojok kanan atas untuk beralih mode Light / Dark sesuai preferensi kenyamanan membaca.'),

    sectionHeading('2.', 'BAGIAN I: PANDUAN UNTUK MANAJER TIM KAMPUS'),
    subSectionHeading('A', 'Langkah Mendaftarkan Tim'),
    p('1. Buka menu "Pendaftaran" atau klik tombol "+ Daftar Tim Baru" di halaman beranda.', { indentLeft: 360, hanging: 360 }),
    p('2. Pilih Asal Provinsi kampus Anda (sistem secara otomatis menetapkan Wilayah Regional Barat, Tengah, atau Timur).', { indentLeft: 360, hanging: 360 }),
    p('3. Pilih Kategori Tim: Putra atau Putri. Sistem akan menampilkan status kuota regional.', { indentLeft: 360, hanging: 360 }),
    p('4. Masukkan Nama Tim / Perguruan Tinggi, alamat sekretariat, nama PIC manajer, dan nomor WhatsApp.', { indentLeft: 360, hanging: 360 }),
    p('5. Klik tombol "Simpan & Lanjut Isi 20 Personel".', { indentLeft: 360, hanging: 360 }),

    subSectionHeading('B', 'Langkah Mengisi Roster 20 Personel'),
    p('• 15 Pemain Utama (Slot 1 - 15) : Masukkan Nama Lengkap, Tanggal Lahir, NIM, Fakultas, Program Studi, Tahun Angkatan Masuk, Nomor Jersey, Posisi Bermain, Tinggi Badan (cm), Berat Badan (kg), dan Foto Jersey.', { indentLeft: 360, hanging: 180 }),
    p('• 5 Official Tim (Slot 16 - 20) : Isi data Team Manager (16), Head Coach (17), 2 Asisten Pelatih (18-19), dan Utility (20).', { indentLeft: 360, hanging: 180 }),
    p('• Tips Pengisian di Layar HP : Gunakan strip tombol horizontal (#1, #2, ... #20) di atas formulir untuk berpindah slot dengan cepat tanpa perlu menggulir layar ke bawah.', { indentLeft: 360, hanging: 180 }),

    sectionHeading('3.', 'BAGIAN II: PANDUAN UNTUK PANITIA PELAKSANA LIGA'),
    subSectionHeading('A', 'Monitoring Papan Kuota 3 Wilayah Regional'),
    p('Pada Dashboard utama, pantau ketersediaan slot 6 Tim Putra & 6 Tim Putri pada Regional Barat, Tengah, dan Timur.'),

    subSectionHeading('B', 'Memeriksa Laporan & Lembar Verifikasi'),
    p('• REPORT 1 (Roster Fisik) : Buka untuk memeriksa susunan nomor jersey, posisi main, dan foto jersey sebelum pertandingan dimulai.', { indentLeft: 360, hanging: 180 }),
    p('• REPORT 2 (Akademik NIM)  : Buka untuk memverifikasi keabsahan data mahasiswa aktif pada database PDDikti.', { indentLeft: 360, hanging: 180 }),
    p('• REPORT 3 (Rekap Tim)     : Buka untuk melihat status kelengkapan 20 personel dari seluruh tim peserta.', { indentLeft: 360, hanging: 180 }),

    subSectionHeading('C', 'Ekspor Excel & Cetak Dokumen PDF'),
    p('• Klik tombol "Excel (.xlsx)" untuk mengunduh rekapitulasi data spreadsheet.', { indentLeft: 360, hanging: 180 }),
    p('• Klik tombol "Cetak (PDF)" untuk mencetak lembar verifikasi resmi A4 siap tanda tangan.', { indentLeft: 360, hanging: 180 }),
  ];

  return new Document({
    sections: [
      {
        headers: { default: createDocHeader('MAN-05', 'Buku Panduan Pengguna') },
        footers: { default: createDocFooter() },
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1600, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 6. BERITA ACARA SERAH TERIMA (BAST) & INVOICE
// ---------------------------------------------------------------------------
function buildBastDocx() {
  const children = [
    ...createFphKopSurat(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({
          text: 'BERITA ACARA SERAH TERIMA PEKERJAAN',
          bold: true,
          underline: {},
          font: 'Calibri',
          size: 26,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: 'Nomor: BAST/LVM-FPH/IX/2026/021',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_DARK,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'Nomor Kontrak Terkait: SPK/LVM-FPH/VIII/2026/014',
          bold: true,
          font: 'Calibri',
          size: 19,
          color: COLOR_MUTED,
        }),
      ],
    }),

    p('Pada hari ini, bertempat di Sekretariat Panitia Pelaksana Liga Volley Mahasiswa, kami yang bertanda tangan di bawah ini:'),

    pRich([
      { text: '1.  NAMA VENDOR :  ', bold: true },
      { text: 'FPH LAB (https://fphlab.web.id)' },
    ], { indentLeft: 400, hanging: 400, spaceBefore: 40, spaceAfter: 20 }),
    p('     Selaku penyedia jasa pengembangan sistem perangkat lunak, selanjutnya disebut sebagai PIHAK KESATU (YANG MENYERAHKAN).', { indentLeft: 400, spaceBefore: 0, spaceAfter: 40 }),

    pRich([
      { text: '2.  NAMA KLIEN    :  ', bold: true },
      { text: 'Panitia Pelaksana Liga Volley Mahasiswa Nasional' },
    ], { indentLeft: 400, hanging: 400, spaceBefore: 40, spaceAfter: 20 }),
    p('     Selaku pihak penyelenggara kejuaraan, selanjutnya disebut sebagai PIHAK KEDUA (YANG MENERIMA).', { indentLeft: 400, spaceBefore: 0, spaceAfter: 120 }),

    p('Kedua belah pihak menyatakan bahwa:'),
    p('1. PIHAK KESATU (FPH Lab) telah menyelesaikan 100% (seratus persen) pekerjaan pembuatan Sistem Informasi Pendaftaran & Pelaporan Liga Volley Mahasiswa (LVM) serta aktivasi domain resmi sesuai SPK Nomor: SPK/LVM-FPH/VIII/2026/014.', { indentLeft: 360, hanging: 360 }),
    p('2. PIHAK KEDUA telah menguji, memeriksa, dan menerima hasil pekerjaan tersebut dengan rincian serah terima (deliverables):', { indentLeft: 360, hanging: 360 }),

    p('☑  Aplikasi Web Next.js Siap Pakai (Aktif di H:\\Coding\\liga-volley-mahasiswa, responsif HP & Light/Dark Mode)', { indentLeft: 720, hanging: 360 }),
    p('☑  Nama Domain Resmi .ORG (Terdaftar dan aktif selama 1 tahun)', { indentLeft: 720, hanging: 360 }),
    p('☑  Modul Validasi Kuota 3 Regional (Maks 6 Tim Putra & 6 Tim Putri per wilayah - Total 36 Tim)', { indentLeft: 720, hanging: 360 }),
    p('☑  Modul Form 20 Personel per Tim (15 Pemain + 5 Official) dengan validasi nomor jersey unik dan upload foto', { indentLeft: 720, hanging: 360 }),
    p('☑  Modul Pelaporan Resmi: Report 1 (Roster Fisik), Report 2 (Akademik NIM), Report 3 (Rekap Tim), dan ID Card', { indentLeft: 720, hanging: 360 }),
    p('☑  Fitur Ekspor Microsoft Excel (.xlsx) dan Format Cetak Dokumen PDF Resmi A4', { indentLeft: 720, hanging: 360 }),
    p('☑  Dokumentasi Lengkap FPH Lab: Proposal, Kontrak SPK, SRS, Lembar UAT, dan User Manual', { indentLeft: 720, hanging: 360 }),

    p('3. Berita Acara ini menjadi dasar bagi PIHAK KEDUA untuk memproses pelunasan pembayaran akhir sesuai ketentuan kontrak.', { indentLeft: 360, hanging: 360 }),

    new Paragraph({ spacing: { before: 200 } }),
    createSignatureBlock(
      'PIHAK KESATU (YANG MENYERAHKAN)',
      'FPH Lab',
      'Pimpinan Vendor (fphlab.web.id)',
      'PIHAK KEDUA (YANG MENERIMA)',
      '[Nama Ketua Panitia]',
      'Ketua Panitia Pelaksana LVM',
      true
    ),

    new Paragraph({ pageBreakBefore: true }),

    // INVOICE PAGE
    ...createFphKopSurat(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({
          text: 'FAKTUR PENAGIHAN RESMI (INVOICE)',
          bold: true,
          underline: {},
          font: 'Calibri',
          size: 26,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      children: [
        new TextRun({
          text: 'TAGIHAN PEMBAYARAN PENGEMBANGAN SISTEM LIGA VOLLEY MAHASISWA',
          bold: true,
          font: 'Calibri',
          size: 20,
          color: COLOR_DARK,
        }),
      ],
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell([
              pRich([
                { text: 'Nomor Invoice : ', bold: true, color: COLOR_NAVY },
                { text: 'INV/FPH-LVM/2026/08-01' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Tanggal              : ', bold: true, color: COLOR_NAVY },
                { text: '24 Agustus 2026' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Jatuh Tempo     : ', bold: true, color: COLOR_NAVY },
                { text: '31 Agustus 2026' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
            createTableCell([
              pRich([
                { text: 'Penerbit Invoice : ', bold: true, color: COLOR_NAVY },
                { text: 'FPH Lab (fphlab.web.id)' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
              pRich([
                { text: 'Ditagihkan Ke    : ', bold: true, color: COLOR_NAVY },
                { text: 'Panitia Pelaksana LVM' },
              ], { spaceBefore: 20, spaceAfter: 20 }),
            ], 50, { bg: COLOR_SUBTOTAL }),
          ],
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 140 } }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell('No', 8, { isHeader: true, align: AlignmentType.CENTER }),
            createTableCell('Deskripsi Layanan / Pekerjaan', 52, { isHeader: true }),
            createTableCell('Kategori', 20, { isHeader: true, align: AlignmentType.CENTER }),
            createTableCell('Nominal (Rp)', 20, { isHeader: true, align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('1', 8, { align: AlignmentType.CENTER }),
            createTableCell('Pengembangan Sistem Web Pendaftaran Tim & Roster 20 Personel (Next.js)', 52),
            createTableCell('Jasa (Service)', 20, { align: AlignmentType.CENTER }),
            createTableCell('950.000', 20, { align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('2', 8, { align: AlignmentType.CENTER, bg: COLOR_ZEBRA }),
            createTableCell('Modul Reporting 1, 2, 3 + Export Excel (.xlsx) & PDF Print Generator', 52, { bg: COLOR_ZEBRA }),
            createTableCell('Jasa (Service)', 20, { align: AlignmentType.CENTER, bg: COLOR_ZEBRA }),
            createTableCell('350.000', 20, { align: AlignmentType.RIGHT, bg: COLOR_ZEBRA }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('3', 8, { align: AlignmentType.CENTER }),
            createTableCell('Paket User Manual, Lembar UAT Checklist, & Dukungan Teknis FPH Lab', 52),
            createTableCell('Jasa (Service)', 20, { align: AlignmentType.CENTER }),
            createTableCell('200.000', 20, { align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('A', 8, { align: AlignmentType.CENTER, bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('SUBTOTAL BIAYA JASA PENGEMBANGAN (SERVICE)', 72, { bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('Rp 1.500.000,-', 20, { align: AlignmentType.RIGHT, bg: COLOR_SUBTOTAL, bold: true }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('4', 8, { align: AlignmentType.CENTER }),
            createTableCell('Registrasi & Aktivasi Nama Domain Resmi .ORG (1 Tahun)', 52),
            createTableCell('Di luar Service', 20, { align: AlignmentType.CENTER }),
            createTableCell('200.000', 20, { align: AlignmentType.RIGHT }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('B', 8, { align: AlignmentType.CENTER, bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('SUBTOTAL BIAYA DI LUAR SERVICE (DOMAIN .ORG)', 72, { bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('Rp 200.000,-', 20, { align: AlignmentType.RIGHT, bg: COLOR_SUBTOTAL, bold: true }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('', 8, { align: AlignmentType.CENTER, bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('TOTAL NILAI PEKERJAAN (GRAND TOTAL: A + B)', 72, { bg: COLOR_SUBTOTAL, bold: true }),
            createTableCell('Rp 1.700.000,-', 20, { align: AlignmentType.RIGHT, bg: COLOR_SUBTOTAL, bold: true }),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('', 8, { align: AlignmentType.CENTER, bg: COLOR_HIGHLIGHT, bold: true }),
            createTableCell('Uang Muka (DP 50% Jasa + 100% Domain) — Sudah Dibayar', 72, { bg: COLOR_HIGHLIGHT, bold: true }),
            createTableCell('(Rp 950.000,-)', 20, false, AlignmentType.RIGHT, COLOR_HIGHLIGHT, true),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('', 8, { align: AlignmentType.CENTER, bg: COLOR_TOTAL_BG, bold: true }),
            createTableCell('SISA TAGIHAN PELUNASAN (TERMIN II — 50% SISA JASA)', 72, { bg: COLOR_TOTAL_BG, bold: true, isHeader: true }),
            createTableCell('Rp 750.000,-', 20, { align: AlignmentType.RIGHT, bg: COLOR_TOTAL_BG, bold: true, isHeader: true }),
          ],
        }),
      ],
    }),

    pRich([
      { text: 'Terbilang: ', bold: true, color: COLOR_NAVY },
      { text: 'Tujuh Ratus Lima Puluh Ribu Rupiah', bold: true, italics: true, color: COLOR_NAVY },
    ], { spaceBefore: 80, spaceAfter: 120 }),

    sectionHeading('', 'INFORMASI REKENING PEMBAYARAN FPH LAB:'),
    p('• Nama Penerima : FPH Lab / Rekening Resmi Vendor', { indentLeft: 360, hanging: 180 }),
    p('• Nama Bank     : Bank BCA / Bank Mandiri / Bank BNI', { indentLeft: 360, hanging: 180 }),
    p('• Nomor Rekening: [Nomor Rekening FPH Lab]', { indentLeft: 360, hanging: 180 }),
    p('• Berita Transfer: Pelunasan Web Liga Volley Mahasiswa 2026', { indentLeft: 360, hanging: 180 }),
    p('• Konfirmasi     : https://fphlab.web.id  |  WhatsApp: +62 856-0116-8136', { indentLeft: 360, hanging: 180 }),

    new Paragraph({ spacing: { before: 200 } }),
    createSignatureBlock(
      'Penerima Pembayaran,',
      'FPH Lab',
      'Vendor Web Development (fphlab.web.id)',
      'Disetujui Oleh,',
      'Bendahara / Ketua Panitia',
      'Panitia Pelaksana LVM'
    ),
  ];

  return new Document({
    sections: [
      {
        headers: { default: createDocHeader('BAST-06', 'BAST & Invoice Resmi') },
        footers: { default: createDocFooter() },
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1600, right: 1440 },
          },
        },
        children,
      },
    ],
  });
}

function writeDocSafely(outPath, buffer) {
  try {
    fs.writeFileSync(outPath, buffer);
    console.log(`✓ Generated: ${outPath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const altPath = outPath.replace('.docx', '_BARU.docx');
      fs.writeFileSync(altPath, buffer);
      console.log(`⚠ File locked by Word, saved as: ${altPath}`);
    } else {
      throw err;
    }
  }
}

async function run() {
  const docs = [
    { name: '01_PROPOSAL_TEKNIS_DAN_BIAYA.docx', build: buildProposalDocx },
    { name: '02_SURAT_PERJANJIAN_KERJASAMA_SPK.docx', build: buildSpkDocx },
    { name: '03_SOFTWARE_REQUIREMENTS_SPECIFICATION_SRS.docx', build: buildSrsDocx },
    { name: '04_LEMBAR_UJI_TERIMA_UAT.docx', build: buildUatDocx },
    { name: '05_USER_MANUAL_PANDUAN_PENGGUNA.docx', build: buildUserManualDocx },
    { name: '06_BERITA_ACARA_SERAH_TERIMA_BAST.docx', build: buildBastDocx },
  ];

  for (const item of docs) {
    console.log(`Generating elegant Word document: ${item.name}...`);
    const doc = item.build();
    const buffer = await Packer.toBuffer(doc);
    const outPath = path.join(docsDir, item.name);
    writeDocSafely(outPath, buffer);
  }

  console.log('All 6 professional DOCX files generated successfully with proper spacing and official layout!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
