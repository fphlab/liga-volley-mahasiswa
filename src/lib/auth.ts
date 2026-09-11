import { NextRequest } from 'next/server';
import type { AccessRole, Actor } from './accessCodes';
import { getDataBackend } from './backend';
import { SESSION_COOKIE, verifySessionToken } from './session';

export type { AccessRole, Actor };

export class AuthError extends Error {
  status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export async function getActorFromRequest(request: NextRequest): Promise<Actor | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claimed = verifySessionToken(token);
  if (!claimed) return null;

  let row;
  try {
    const backend = await getDataBackend();
    row = await backend.findAccountById(claimed.accountId);
  } catch {
    return null;
  }

  if (!row || row.revoked || row.role !== claimed.role) return null;

  return {
    role: row.role,
    subject: row.label,
    ownerCode: row.role === 'peserta' ? row.id : '',
    accountId: row.id,
  };
}

export async function verifyActor(
  request: NextRequest,
  allowedRoles?: AccessRole[]
): Promise<Actor | null> {
  const actor = await getActorFromRequest(request);
  if (!actor) return null;
  if (allowedRoles && !allowedRoles.includes(actor.role)) return null;
  return actor;
}

export async function requireActor(
  request: NextRequest,
  allowedRoles?: AccessRole[]
): Promise<Actor> {
  const actor = await getActorFromRequest(request);
  if (!actor) {
    throw new AuthError('Autentikasi diperlukan.', 401);
  }
  if (allowedRoles && !allowedRoles.includes(actor.role)) {
    throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
  }
  return actor;
}
