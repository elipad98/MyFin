import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createSession } from '@/lib/auth';
import { generateVerificationToken } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { name, email, password, currency = 'MXN' } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 });
    }

    // First registered user becomes ADMIN and is automatically verified
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;
    const role = isFirstUser ? 'ADMIN' : 'MEMBER';

    const hashedPassword = await hashPassword(password);
    const verificationToken = generateVerificationToken();

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        currency,
        emailVerified: isFirstUser, // First user is auto-verified admin
        emailVerificationToken: isFirstUser ? null : verificationToken,
      },
    });

    // Create default accounts for new user
    await prisma.account.createMany({
      data: [
        { userId: newUser.id, name: 'Efectivo', type: 'CASH', balance: 0, currency, color: '#10b981', icon: 'wallet' },
        { userId: newUser.id, name: 'Cuenta Bancaria', type: 'BANK', balance: 0, currency, color: '#3b82f6', icon: 'landmark' },
      ],
    });

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const verificationUrl = `${origin}/verify-email?token=${verificationToken}`;

    // If first user, create session directly
    if (isFirstUser) {
      await createSession({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        currency: newUser.currency,
      });
    }

    return NextResponse.json({
      success: true,
      requiresVerification: !isFirstUser,
      verificationUrl: !isFirstUser ? verificationUrl : undefined,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        currency: newUser.currency,
        emailVerified: newUser.emailVerified,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 });
  }
}
