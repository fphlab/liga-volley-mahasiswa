import { NextRequest } from 'next/server';
import type { AccessRole, Actor } from './accessCodes';
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

export function getActorFromRequest(request: NextRequest): Actor | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function verifyActor(request: NextRequest, allowedRoles?: AccessRole[]): Actor | null {
  const actor = getActorFromRequest(request);
  if (!actor) return null;
  if (allowedRoles && !allowedRoles.includes(actor.role)) return null;
  return actor;
}

export function requireActor(request: NextRequest, allowedRoles?: AccessRole[]): Actor {
  const actor = getActorFromRequest(request);
  if (!actor) {
    throw new AuthError('Autentikasi diperlukan.', 401);
  }
  if (allowedRoles && !allowedRoles.includes(actor.role)) {
    throw new AuthError('Anda tidak memiliki izin untuk aksi ini.', 403);
  }
  return actor;
}
