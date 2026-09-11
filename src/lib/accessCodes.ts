import crypto from 'node:crypto';

export type AccessRole = 'panpel' | 'mojisport' | 'peserta';

export interface Actor {
  role: AccessRole;
  subject: string;
  ownerCode: string;
}

interface AccessCodeEntry {
  code: string;
  role: AccessRole;
  ownerCode: string;
}

function buildAccessCodes(): AccessCodeEntry[] {
  const entries: AccessCodeEntry[] = [];

  for (let i = 1; i <= 5; i += 1) {
    const code = `asp${i}`;
    entries.push({ code, role: 'panpel', ownerCode: '' });
  }

  for (let i = 1; i <= 5; i += 1) {
    const code = `mojisport${i}`;
    entries.push({ code, role: 'mojisport', ownerCode: '' });
  }

  for (let i = 1; i <= 36; i += 1) {
    const code = `user${i}`;
    entries.push({ code, role: 'peserta', ownerCode: code });
  }

  return entries;
}

const ACCESS_CODES = buildAccessCodes();

const CODE_DIGESTS = ACCESS_CODES.map((entry) => ({
  entry,
  digest: crypto.createHash('sha256').update(entry.code).digest(),
}));

export function resolveAccessCode(input: string): Actor | null {
  if (typeof input !== 'string') return null;

  const normalized = input.trim().toLowerCase();
  if (normalized.length === 0) return null;

  // Digest SHA-256 menyamakan panjang sehingga perbandingan tetap waktu-konstan.
  const inputDigest = crypto.createHash('sha256').update(normalized).digest();

  let matched: AccessCodeEntry | null = null;
  for (const { entry, digest } of CODE_DIGESTS) {
    if (inputDigest.length === digest.length && crypto.timingSafeEqual(inputDigest, digest)) {
      matched = entry;
    }
  }

  if (!matched) return null;

  return {
    role: matched.role,
    subject: matched.code,
    ownerCode: matched.ownerCode,
  };
}

export function listAccessCodes(): Array<{ code: string; role: AccessRole }> {
  return ACCESS_CODES.map((entry) => ({ code: entry.code, role: entry.role }));
}

export function getSessionSecret(): string {
  const secret = process.env.ACCESS_SESSION_SECRET;
  if (secret && secret.length > 0) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ACCESS_SESSION_SECRET wajib diisi di lingkungan production.');
  }

  return 'lvm-dev-access-session-secret';
}
