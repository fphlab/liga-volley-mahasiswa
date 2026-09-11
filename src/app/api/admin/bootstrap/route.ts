import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  encryptCode,
  generateRandomCode,
  hashCode,
  type AccessRole,
} from '@/lib/accessCodes';
import { getDataBackend, type AccountInsert, type DataBackend } from '@/lib/backend';
import { buildDemoTeams } from '@/lib/demoData';
import { insertTeamWithMembers, withDatabaseLock } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// PERINGATAN KERAHASIAAN: response endpoint ini memuat 30 kode akses plaintext
// yang hanya ditampilkan SATU KALI. Jangan menulis body/response endpoint ini
// ke file, log persisten, snapshot, maupun git. Operator wajib menyimpan
// lembar kode di media offline lalu menghapus BOOTSTRAP_SECRET.

interface AccountSpec {
  id: string;
  role: AccessRole;
  label: string;
}

interface PlainAccount {
  id: string;
  label: string;
  role: AccessRole;
  code: string;
}

interface Assignment {
  accountId: string;
  label: string;
  teamId: string;
  teamName: string;
  teamNumber: string;
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return slug.length > 0 ? slug : 'tim';
}

function rateLimitHeaders(limit: number, remaining: number, reset: number) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  };
}

async function mintUniqueCode(backend: DataBackend, usedHashes: Set<string>) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRandomCode();
    const hash = hashCode(code);
    if (usedHashes.has(hash)) continue;
    const collision = await backend.findAccountByHash(hash);
    if (collision) continue;
    usedHashes.add(hash);
    return { code, hash, enc: encryptCode(code) };
  }
  throw new Error('Gagal membuat kode akses unik setelah beberapa percobaan.');
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(`bootstrap:${getClientIp(request)}`, {
    limit: 5,
    windowMs: 3600000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Terlalu banyak percobaan bootstrap. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          ...rateLimitHeaders(rateLimit.limit, rateLimit.remaining, rateLimit.resetTime),
        },
      }
    );
  }

  const configured = process.env.BOOTSTRAP_SECRET;
  if (!configured) {
    return NextResponse.json(
      { success: false, error: 'Konfigurasi bootstrap belum lengkap di server.' },
      { status: 500 }
    );
  }

  const raw: unknown = await request.json().catch(() => ({}));
  const body: { secret?: unknown; force?: unknown } =
    typeof raw === 'object' && raw !== null
      ? (raw as { secret?: unknown; force?: unknown })
      : {};
  const provided = typeof body.secret === 'string' ? body.secret : '';
  const force = body.force === true;

  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(configured, 'utf8');
  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return NextResponse.json(
      { success: false, error: 'Kredensial bootstrap tidak valid.' },
      { status: 403 }
    );
  }

  try {
    const backend = await getDataBackend();

    const existingAccounts = await backend.listAccounts();
    const existingTeams = await backend.fetchTeamsWithMembers(undefined);
    if (!force && (existingAccounts.length > 0 || existingTeams.length > 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Data sudah terisi. Ulangi dengan opsi force bila memang ingin mengisi ulang dari awal.',
        },
        { status: 409 }
      );
    }

    if (force) {
      await backend.deleteAllTeams();
      await backend.clearAllAccounts();
    }

    const demoTeams = buildDemoTeams();

    const specs: AccountSpec[] = [];
    const usedIds = new Set<string>();
    for (let i = 1; i <= 5; i += 1) {
      specs.push({ id: `panpel-${i}`, role: 'panpel', label: `Panpel ${i}` });
      usedIds.add(`panpel-${i}`);
    }
    for (let i = 1; i <= 5; i += 1) {
      specs.push({ id: `mojisport-${i}`, role: 'mojisport', label: `MojiSport ${i}` });
      usedIds.add(`mojisport-${i}`);
    }
    for (const team of demoTeams) {
      const base = slugify(team.name);
      let id = base;
      if (usedIds.has(id)) {
        id = `${base}-${team.category.toLowerCase()}`;
      }
      let counter = 2;
      while (usedIds.has(id)) {
        id = `${base}-${team.category.toLowerCase()}-${counter}`;
        counter += 1;
      }
      usedIds.add(id);
      specs.push({ id, role: 'peserta', label: team.name });
    }

    const usedHashes = new Set<string>();
    const inserts: AccountInsert[] = [];
    const plaintext: PlainAccount[] = [];
    for (const spec of specs) {
      const minted = await mintUniqueCode(backend, usedHashes);
      inserts.push({
        id: spec.id,
        code_hash: minted.hash,
        code_enc: minted.enc,
        role: spec.role,
        label: spec.label,
        team_id: null,
        revoked: false,
      });
      plaintext.push({ id: spec.id, label: spec.label, role: spec.role, code: minted.code });
    }
    await backend.createAccounts(inserts);

    const pesertaSpecs = specs.filter((spec) => spec.role === 'peserta');

    const assignments: Assignment[] = await withDatabaseLock(async () => {
      const bound: Assignment[] = [];
      for (let index = 0; index < demoTeams.length; index += 1) {
        const created = await insertTeamWithMembers(demoTeams[index]);
        const spec = pesertaSpecs[index];
        await backend.updateTeamColumns(created.id, { owner_code: spec.id });
        await backend.setAccountTeam(spec.id, created.id);
        bound.push({
          accountId: spec.id,
          label: spec.label,
          teamId: created.id,
          teamName: created.name,
          teamNumber: created.teamNumber,
        });
      }
      return bound;
    });

    return NextResponse.json({ success: true, accounts: plaintext, assignments });
  } catch (error) {
    console.error('Error bootstrap:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? `Bootstrap gagal: ${error.message}`
            : 'Bootstrap gagal karena kesalahan sistem.',
      },
      { status: 500 }
    );
  }
}
