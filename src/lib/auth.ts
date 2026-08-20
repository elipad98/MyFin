import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'myfin-secret-key-super-secure-2026'
);

export const SESSION_MAX_AGE_SECONDS = 60 * 60; // 1 Hora

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  currency: string;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: { id: string; name: string; email: string; role: string; currency: string }) {
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    currency: user.currency,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(JWT_SECRET);

  const isSecure = process.env.COOKIE_SECURE === 'true';

  const cookieStore = await cookies();
  cookieStore.set('myfin_session', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });

  return token;
}

export async function refreshSession(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  await createSession({
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    currency: session.currency,
  });

  return true;
}

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('myfin_session')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('myfin_session');
}
