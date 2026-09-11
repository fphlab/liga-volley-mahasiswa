import crypto from 'node:crypto';
import type { AccessRole, Actor } from './accessCodes';
import { getSessionSecret } from './accessCodes';

export const SESSION_COOKIE = 'lvm_access_session';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_VERSION = 2;

const VALID_ROLES: readonly AccessRole[] = ['panpel', 'mojisport', 'peserta'];

interface SessionPayload {
  v: number;
  sub: string;
  role: AccessRole;
  owner: string;
  aid: string;
  iat: number;
  exp: number;
}

function base64urlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function createSessionToken(actor: Actor): string {
  const now = Date.now();
  const payload: SessionPayload = {
    v: SESSION_VERSION,
    sub: actor.subject,
    role: actor.role,
    owner: actor.ownerCode,
    aid: actor.accountId,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };

  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, getSessionSecret())}`;
}

export function verifySessionToken(token: string | undefined | null): Actor | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  let expected: string;
  try {
    expected = sign(payloadB64, getSessionSecret());
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }

  if (
    !payload ||
    payload.v !== SESSION_VERSION ||
    typeof payload.sub !== 'string' ||
    typeof payload.owner !== 'string' ||
    typeof payload.aid !== 'string' ||
    typeof payload.exp !== 'number' ||
    !VALID_ROLES.includes(payload.role)
  ) {
    return null;
  }

  if (payload.exp <= Date.now()) return null;

  return {
    role: payload.role,
    subject: payload.sub,
    ownerCode: payload.owner,
    accountId: payload.aid,
  };
}

export function sessionCookieOptions(): {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  };
}
