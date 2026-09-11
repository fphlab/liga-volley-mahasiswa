import crypto from 'node:crypto';
import { getDataBackend } from './backend';

export type AccessRole = 'panpel' | 'mojisport' | 'peserta';

export interface Actor {
  role: AccessRole;
  subject: string;
  ownerCode: string;
  accountId: string;
}

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 7;

const VALID_ROLES: readonly AccessRole[] = ['panpel', 'mojisport', 'peserta'];

function isAccessRole(value: unknown): value is AccessRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

export function normalizeCode(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Kode akses wajib berupa teks.');
  }
  const normalized = input.trim().toUpperCase();
  if (normalized.length === 0) {
    throw new Error('Kode akses wajib diisi.');
  }
  return normalized;
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(normalizeCode(code)).digest('hex');
}

export function generateRandomCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

export function getCodeKey(): Buffer {
  const raw = process.env.ACCESS_CODE_KEY;
  if (raw && raw.length > 0) {
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new Error('ACCESS_CODE_KEY harus 64 karakter heksadesimal (32 byte).');
    }
    return Buffer.from(raw, 'hex');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ACCESS_CODE_KEY wajib diisi di lingkungan production.');
  }

  return crypto.createHash('sha256').update('lvm-dev-access-code-key').digest();
}

export function encryptCode(plain: string): string {
  const key = getCodeKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(normalizeCode(plain), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${ciphertext.toString('base64')}.${tag.toString('base64')}`;
}

export function decryptCode(enc: string): string {
  if (typeof enc !== 'string') {
    throw new Error('Data kode terenkripsi tidak valid.');
  }
  const parts = enc.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Data kode terenkripsi tidak valid.');
  }
  const [ivB64, cipherB64, tagB64] = parts;
  const key = getCodeKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return plain;
}

function toActor(row: { id: string; role: string; label: string }): Actor | null {
  if (!isAccessRole(row.role)) return null;
  return {
    role: row.role,
    subject: row.label,
    ownerCode: row.role === 'peserta' ? row.id : '',
    accountId: row.id,
  };
}

export async function resolveAccessCode(input: string): Promise<Actor | null> {
  let normalized: string;
  try {
    normalized = normalizeCode(input);
  } catch {
    return null;
  }

  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const backend = await getDataBackend();
  const row = await backend.findAccountByHash(hash);
  if (!row || row.revoked) return null;
  return toActor(row);
}

export async function listAccessCodes(): Promise<Array<{ id: string; label: string; role: AccessRole }>> {
  const backend = await getDataBackend();
  const rows = await backend.listAccounts();
  const result: Array<{ id: string; label: string; role: AccessRole }> = [];
  for (const row of rows) {
    if (!isAccessRole(row.role)) continue;
    result.push({ id: row.id, label: row.label, role: row.role });
  }
  return result;
}

export function getSessionSecret(): string {
  const secret = process.env.ACCESS_SESSION_SECRET;
  if (secret && secret.length > 0) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ACCESS_SESSION_SECRET wajib diisi di lingkungan production.');
  }

  return 'lvm-dev-access-session-secret';
}
