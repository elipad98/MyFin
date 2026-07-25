import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    if (!user.emailVerified) {
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const verifyUrl = `${origin}/verify-email?token=${user.emailVerificationToken}`;

      return NextResponse.json(
        {
          error: 'Por favor verifica tu correo electrónico antes de iniciar sesión.',
          requiresVerification: true,
          verifyUrl,
        },
        { status: 403 }
      );
    }

    await createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      currency: user.currency,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currency: user.currency,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 });
  }
}
