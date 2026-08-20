import { NextResponse } from 'next/server';
import { refreshSession } from '@/lib/auth';

export async function POST() {
  const refreshed = await refreshSession();
  if (!refreshed) {
    return NextResponse.json({ error: 'No autorizado / Sesión expirada' }, { status: 401 });
  }

  return NextResponse.json({ success: true, message: 'Sesión renovada por 1 hora más' });
}
