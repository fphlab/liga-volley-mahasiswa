import { NextRequest, NextResponse } from 'next/server';
import { getActorFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const actor = getActorFromRequest(request);
  if (!actor) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    role: actor.role,
    subject: actor.subject,
    ownerCode: actor.ownerCode,
  });
}
